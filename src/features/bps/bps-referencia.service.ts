import { prisma } from '@/lib/db'

export interface BpsReferenciaFiltros {
  uf?: string
  municipio?: string
  codigoCatmat?: string
  modalidade?: string
  fabricante?: string
  fornecedor?: string
  comprador?: string
  dataInicio?: string
  dataFim?: string
  valorMin?: number
  valorMax?: number
}

export interface BuscarBpsReferenciasParams {
  termo: string
  pagina?: number
  limite?: number
  filtros?: BpsReferenciaFiltros
}

interface BpsReferenciaRow {
  id: bigint | number
  codigo_compra: string
  codigo_catmat: string | null
  descricao_catmat: string
  unidade_fornecimento: string | null
  data_homologacao: Date | null
  modalidade_compra: string | null
  cnpj_fabricante: string | null
  fabricante: string | null
  cnpj_fornecedor: string | null
  fornecedor: string | null
  cnpj_comprador: string | null
  nome_instituicao: string | null
  uf: string | null
  nome_municipio: string | null
  valor_item_compra: unknown
  quantidade_item_compra: unknown
  valor_total_compra: unknown
  observacoes: string | null
  seq_compra_item: string
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

function buildWhere(termo: string, filtros: BpsReferenciaFiltros = {}, params: unknown[]) {
  const clauses: string[] = []
  const q = pushParam(params, termo)
  clauses.push(`(
    busca_tsv @@ websearch_to_tsquery('portuguese', ${q})
    OR similarity(descricao_catmat, ${q}) > 0.08
  )`)

  if (filtros.uf) clauses.push(`uf = ${pushParam(params, filtros.uf.toUpperCase())}`)
  if (filtros.municipio) clauses.push(`nome_municipio ILIKE ${pushParam(params, `%${escapeLike(filtros.municipio)}%`)} ESCAPE '\\'`)
  if (filtros.codigoCatmat) clauses.push(`codigo_catmat = ${pushParam(params, filtros.codigoCatmat)}`)
  if (filtros.modalidade) clauses.push(`modalidade_compra ILIKE ${pushParam(params, `%${escapeLike(filtros.modalidade)}%`)} ESCAPE '\\'`)
  if (filtros.fabricante) clauses.push(`fabricante ILIKE ${pushParam(params, `%${escapeLike(filtros.fabricante)}%`)} ESCAPE '\\'`)
  if (filtros.fornecedor) clauses.push(`fornecedor ILIKE ${pushParam(params, `%${escapeLike(filtros.fornecedor)}%`)} ESCAPE '\\'`)
  if (filtros.comprador) clauses.push(`nome_instituicao ILIKE ${pushParam(params, `%${escapeLike(filtros.comprador)}%`)} ESCAPE '\\'`)
  if (filtros.dataInicio) clauses.push(`data_homologacao >= ${pushParam(params, filtros.dataInicio)}::date`)
  if (filtros.dataFim) clauses.push(`data_homologacao <= ${pushParam(params, filtros.dataFim)}::date`)
  if (typeof filtros.valorMin === 'number') clauses.push(`valor_item_compra >= ${pushParam(params, filtros.valorMin)}`)
  if (typeof filtros.valorMax === 'number') clauses.push(`valor_item_compra <= ${pushParam(params, filtros.valorMax)}`)

  return clauses.join(' AND ')
}

function toItem(row: BpsReferenciaRow) {
  return {
    id: asCount(row.id),
    codigoCompra: row.codigo_compra,
    codigoCatmat: row.codigo_catmat,
    descricaoCatmat: row.descricao_catmat,
    unidadeFornecimento: row.unidade_fornecimento,
    dataHomologacao: row.data_homologacao?.toISOString() ?? null,
    modalidadeCompra: row.modalidade_compra,
    cnpjFabricante: row.cnpj_fabricante,
    fabricante: row.fabricante,
    cnpjFornecedor: row.cnpj_fornecedor,
    fornecedor: row.fornecedor,
    cnpjComprador: row.cnpj_comprador,
    nomeInstituicao: row.nome_instituicao,
    uf: row.uf,
    nomeMunicipio: row.nome_municipio,
    valorItemCompra: asNumber(row.valor_item_compra),
    quantidadeItemCompra: asNumber(row.quantidade_item_compra),
    valorTotalCompra: asNumber(row.valor_total_compra),
    observacoes: row.observacoes,
    seqCompraItem: row.seq_compra_item,
    compatibilidade: Math.max(0, Math.min(100, Math.round(Number(row.score || 0) * 100))),
  }
}

async function facet(whereSql: string, params: unknown[], column: string) {
  const rows = await prisma.$queryRawUnsafe<FacetRow[]>(
    `
      SELECT ${column} AS valor, count(*) AS quantidade
      FROM bps_itens_referencia
      WHERE ${whereSql} AND ${column} IS NOT NULL AND ${column} <> ''
      GROUP BY ${column}
      ORDER BY quantidade DESC, valor ASC
      LIMIT 20
    `,
    ...params,
  )

  return rows.map((row) => ({ valor: row.valor || '', quantidade: asCount(row.quantidade) }))
}

async function safeFacet(whereSql: string, params: unknown[], column: string) {
  try {
    return await facet(whereSql, params, column)
  } catch (error) {
    console.warn(`Falha ao carregar filtro BPS ${column}:`, error)
    return []
  }
}

export class BpsReferenciaService {
  async buscar(params: BuscarBpsReferenciasParams) {
    const termo = params.termo.trim()
    if (termo.length < 2) {
      return {
        items: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0,
        metricas: null,
        filtrosSugeridos: { ufs: [], municipios: [], catmats: [], modalidades: [], fabricantes: [], fornecedores: [] },
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

    const rows = await prisma.$queryRawUnsafe<BpsReferenciaRow[]>(
      `
        SELECT
          id,
          codigo_compra,
          codigo_catmat,
          descricao_catmat,
          unidade_fornecimento,
          data_homologacao,
          modalidade_compra,
          cnpj_fabricante,
          fabricante,
          cnpj_fornecedor,
          fornecedor,
          cnpj_comprador,
          nome_instituicao,
          uf,
          nome_municipio,
          valor_item_compra,
          quantidade_item_compra,
          valor_total_compra,
          observacoes,
          seq_compra_item,
          (
            ts_rank_cd(busca_tsv, websearch_to_tsquery('portuguese', ${termoParam}))
            + similarity(descricao_catmat, ${termoParam})
          ) AS score
        FROM bps_itens_referencia
        WHERE ${whereSql}
        ORDER BY score DESC, data_homologacao DESC NULLS LAST, valor_item_compra ASC NULLS LAST
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      ...whereParams,
    )

    const baseParams = whereParams.slice(0, -3)
    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT count(*) AS total FROM bps_itens_referencia WHERE ${whereSql}`,
      ...baseParams,
    )
    const total = asCount(countRows[0]?.total ?? 0)

    const metricRows = await prisma.$queryRawUnsafe<MetricsRow[]>(
      `
        SELECT
          count(*) AS quantidade,
          min(valor_item_compra) AS menor,
          avg(valor_item_compra) AS media,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY valor_item_compra) AS mediana,
          max(valor_item_compra) AS maior,
          sum(valor_total_compra) AS valor_total
        FROM bps_itens_referencia
        WHERE ${whereSql} AND valor_item_compra IS NOT NULL
      `,
      ...baseParams,
    )
    const metricas = metricRows[0]

    const ufs = await safeFacet(whereSql, baseParams, 'uf')
    const municipios = await safeFacet(whereSql, baseParams, 'nome_municipio')
    const catmats = await safeFacet(whereSql, baseParams, 'codigo_catmat')
    const modalidades = await safeFacet(whereSql, baseParams, 'modalidade_compra')
    const fabricantes = await safeFacet(whereSql, baseParams, 'fabricante')
    const fornecedores = await safeFacet(whereSql, baseParams, 'fornecedor')

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
      filtrosSugeridos: { ufs, municipios, catmats, modalidades, fabricantes, fornecedores },
    }
  }
}
