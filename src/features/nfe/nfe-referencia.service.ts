import { prisma } from '@/lib/db'

export interface NfeReferenciaFiltros {
  ufEmitente?: string
  municipioEmitente?: string
  ufDestinatario?: string
  ncm?: string
  cfop?: string
  fornecedor?: string
  destinatario?: string
  dataInicio?: string
  dataFim?: string
  valorMin?: number
  valorMax?: number
}

export interface BuscarNfeReferenciasParams {
  termo: string
  pagina?: number
  limite?: number
  filtros?: NfeReferenciaFiltros
}

interface NfeReferenciaRow {
  id: bigint | number
  chave_acesso: string
  modelo: string | null
  serie: string | null
  numero: string | null
  natureza_operacao: string | null
  data_emissao: Date | null
  cpf_cnpj_emitente: string | null
  razao_social_emitente: string | null
  uf_emitente: string | null
  municipio_emitente: string | null
  orgao_superior_destinatario: string | null
  orgao_destinatario: string | null
  cnpj_destinatario: string | null
  nome_destinatario: string | null
  uf_destinatario: string | null
  numero_produto: string | null
  descricao_produto_servico: string
  codigo_ncm_sh: string | null
  ncm_sh: string | null
  cfop: string | null
  quantidade: unknown
  unidade: string | null
  valor_unitario: unknown
  valor_total: unknown
  score: number
}

interface CountRow {
  total: bigint | number
}

interface MetricsRow {
  quantidade: bigint | number
  menor: unknown
  media: unknown
  mediana: unknown
  maior: unknown
  valor_total: unknown
}

interface FacetRow {
  valor: string | null
  quantidade: bigint | number
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function asCount(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function pushParam(params: unknown[], value: unknown) {
  params.push(value)
  return `$${params.length}`
}

function buildWhere(termo: string, filtros: NfeReferenciaFiltros = {}, params: unknown[]) {
  const clauses: string[] = []
  const q = pushParam(params, termo)
  clauses.push(`(
    busca_tsv @@ websearch_to_tsquery('portuguese', ${q})
    OR similarity(descricao_produto_servico, ${q}) > 0.08
  )`)

  if (filtros.ufEmitente) clauses.push(`uf_emitente = ${pushParam(params, filtros.ufEmitente.toUpperCase())}`)
  if (filtros.municipioEmitente) clauses.push(`municipio_emitente ILIKE ${pushParam(params, `%${escapeLike(filtros.municipioEmitente)}%`)} ESCAPE '\\'`)
  if (filtros.ufDestinatario) clauses.push(`uf_destinatario = ${pushParam(params, filtros.ufDestinatario.toUpperCase())}`)
  if (filtros.ncm) clauses.push(`codigo_ncm_sh = ${pushParam(params, filtros.ncm)}`)
  if (filtros.cfop) clauses.push(`cfop = ${pushParam(params, filtros.cfop)}`)
  if (filtros.fornecedor) clauses.push(`razao_social_emitente ILIKE ${pushParam(params, `%${escapeLike(filtros.fornecedor)}%`)} ESCAPE '\\'`)
  if (filtros.destinatario) clauses.push(`(nome_destinatario ILIKE ${pushParam(params, `%${escapeLike(filtros.destinatario)}%`)} ESCAPE '\\' OR orgao_destinatario ILIKE ${pushParam(params, `%${escapeLike(filtros.destinatario)}%`)} ESCAPE '\\')`)
  if (filtros.dataInicio) clauses.push(`data_emissao >= ${pushParam(params, filtros.dataInicio)}::date`)
  if (filtros.dataFim) clauses.push(`data_emissao < (${pushParam(params, filtros.dataFim)}::date + interval '1 day')`)
  if (typeof filtros.valorMin === 'number') clauses.push(`valor_unitario >= ${pushParam(params, filtros.valorMin)}`)
  if (typeof filtros.valorMax === 'number') clauses.push(`valor_unitario <= ${pushParam(params, filtros.valorMax)}`)

  return clauses.join(' AND ')
}

function toItem(row: NfeReferenciaRow) {
  return {
    id: asCount(row.id),
    chaveAcesso: row.chave_acesso,
    modelo: row.modelo,
    serie: row.serie,
    numero: row.numero,
    naturezaOperacao: row.natureza_operacao,
    dataEmissao: row.data_emissao?.toISOString() ?? null,
    cpfCnpjEmitente: row.cpf_cnpj_emitente,
    razaoSocialEmitente: row.razao_social_emitente,
    ufEmitente: row.uf_emitente,
    municipioEmitente: row.municipio_emitente,
    orgaoSuperiorDestinatario: row.orgao_superior_destinatario,
    orgaoDestinatario: row.orgao_destinatario,
    cnpjDestinatario: row.cnpj_destinatario,
    nomeDestinatario: row.nome_destinatario,
    ufDestinatario: row.uf_destinatario,
    numeroProduto: row.numero_produto,
    descricaoProdutoServico: row.descricao_produto_servico,
    codigoNcmSh: row.codigo_ncm_sh,
    ncmSh: row.ncm_sh,
    cfop: row.cfop,
    quantidade: asNumber(row.quantidade),
    unidade: row.unidade,
    valorUnitario: asNumber(row.valor_unitario),
    valorTotal: asNumber(row.valor_total),
    compatibilidade: Math.max(0, Math.min(100, Math.round(Number(row.score || 0) * 100))),
  }
}

async function facet(whereSql: string, params: unknown[], column: string) {
  const rows = await prisma.$queryRawUnsafe<FacetRow[]>(
    `
      SELECT ${column} AS valor, count(*) AS quantidade
      FROM nfe_itens_referencia
      WHERE ${whereSql} AND ${column} IS NOT NULL AND ${column} <> ''
      GROUP BY ${column}
      ORDER BY quantidade DESC, valor ASC
      LIMIT 20
    `,
    ...params,
  )

  return rows.map((row) => ({ valor: row.valor || '', quantidade: asCount(row.quantidade) }))
}

export class NfeReferenciaService {
  async buscar(params: BuscarNfeReferenciasParams) {
    const termo = params.termo.trim()
    if (termo.length < 2) {
      return {
        items: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0,
        metricas: null,
        filtrosSugeridos: { ufsEmitente: [], municipiosEmitente: [], ufsDestinatario: [], ncms: [], cfops: [] },
      }
    }

    const pagina = Math.max(1, params.pagina || 1)
    const limite = Math.min(50, Math.max(1, params.limite || 20))
    const offset = (pagina - 1) * limite
    const whereParams: unknown[] = []
    const whereSql = buildWhere(termo, params.filtros, whereParams)
    const termoParam = pushParam(whereParams, termo)
    const limitParam = pushParam(whereParams, limite)
    const offsetParam = pushParam(whereParams, offset)

    const rows = await prisma.$queryRawUnsafe<NfeReferenciaRow[]>(
      `
        SELECT
          id,
          chave_acesso,
          modelo,
          serie,
          numero,
          natureza_operacao,
          data_emissao,
          cpf_cnpj_emitente,
          razao_social_emitente,
          uf_emitente,
          municipio_emitente,
          orgao_superior_destinatario,
          orgao_destinatario,
          cnpj_destinatario,
          nome_destinatario,
          uf_destinatario,
          numero_produto,
          descricao_produto_servico,
          codigo_ncm_sh,
          ncm_sh,
          cfop,
          quantidade,
          unidade,
          valor_unitario,
          valor_total,
          (
            ts_rank_cd(busca_tsv, websearch_to_tsquery('portuguese', ${termoParam}))
            + similarity(descricao_produto_servico, ${termoParam})
          ) AS score
        FROM nfe_itens_referencia
        WHERE ${whereSql}
        ORDER BY score DESC, data_emissao DESC NULLS LAST, valor_unitario ASC NULLS LAST
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      ...whereParams,
    )

    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT count(*) AS total FROM nfe_itens_referencia WHERE ${whereSql}`,
      ...whereParams.slice(0, -3),
    )
    const total = asCount(countRows[0]?.total ?? 0)

    const metricRows = await prisma.$queryRawUnsafe<MetricsRow[]>(
      `
        SELECT
          count(*) AS quantidade,
          min(valor_unitario) AS menor,
          avg(valor_unitario) AS media,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY valor_unitario) AS mediana,
          max(valor_unitario) AS maior,
          sum(valor_total) AS valor_total
        FROM nfe_itens_referencia
        WHERE ${whereSql} AND valor_unitario IS NOT NULL
      `,
      ...whereParams.slice(0, -3),
    )
    const metricas = metricRows[0]

    const facetParams = whereParams.slice(0, -3)
    const [ufsEmitente, municipiosEmitente, ufsDestinatario, ncms, cfops] = await Promise.all([
      facet(whereSql, facetParams, 'uf_emitente'),
      facet(whereSql, facetParams, 'municipio_emitente'),
      facet(whereSql, facetParams, 'uf_destinatario'),
      facet(whereSql, facetParams, 'codigo_ncm_sh'),
      facet(whereSql, facetParams, 'cfop'),
    ])

    return {
      items: rows.map(toItem),
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      metricas: metricas
        ? {
            quantidade: asCount(metricas.quantidade),
            menor: asNumber(metricas.menor),
            media: asNumber(metricas.media),
            mediana: asNumber(metricas.mediana),
            maior: asNumber(metricas.maior),
            valorTotal: asNumber(metricas.valor_total),
          }
        : null,
      filtrosSugeridos: { ufsEmitente, municipiosEmitente, ufsDestinatario, ncms, cfops },
    }
  }
}
