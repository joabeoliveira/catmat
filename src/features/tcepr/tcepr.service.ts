// src/features/tcepr/tcepr.service.ts
// Busca de itens de licitações municipais homologadas no TCE-PR.
// Padrão do projeto: $queryRawUnsafe (tabela "LicitacaoVencedorTcePr").
import { prisma } from '@/lib/db'
import {
  ORDENACOES_TCEPR,
  type OrdenacaoTcePr,
  type TcePrBuscaParams,
  type TcePrBuscaResponse,
  type TcePrFacet,
  type TcePrFiltros,
  type TcePrItem,
  type TcePrMetricas,
} from './tcepr.types'

interface TcePrRow {
  id: number
  cdIbge: string | null
  nmMunicipio: string
  idPessoa: number | null
  nmEntidade: string
  idLicitacao: number
  nrAnoLicitacao: number | null
  nrLicitacao: number | null
  dsModalidadeLicitacao: string
  dtHomologacao: Date | null
  nrDocumento: string
  nmPessoa: string
  nrLote: number
  nrItem: number
  dsItem: string
  idUnidadeMedida: number | null
  dsUnidadeMedida: string | null
  nrQuantidade: number | null
  vlMinimoUnitarioItem: number | null
  vlMinimoTotal: number | null
  vlMaximoUnitarioItem: number | null
  vlMaximoTotal: number | null
  nrQuantidadeProposta: number | null
  vlPropostaItem: number | null
  nrQuantidadeVencedor: number | null
  vlLicitacaoVencedor: number | null
  nrClassificacao: number
  dsFormaPagamento: string | null
  nrPrazoLimiteEntrega: number | null
  idTipoEntregaProduto: number | null
  dsTipoEntregaProduto: string | null
  dtValidadeProposta: Date | null
  dtPrazoEntregaProposta: Date | null
  ultimoEnvioSimam: string | null
  dataReferencia: string | null
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

function pushParam(params: unknown[], value: unknown) {
  params.push(value)
  return `$${params.length}`
}

function buildWhere(termo: string, filtros: TcePrFiltros = {}, params: unknown[]) {
  const clauses: string[] = []

  if (termo) {
    const partes: string[] = []
    const q = pushParam(params, termo)
    partes.push(`("busca_tsv" @@ websearch_to_tsquery('portuguese', ${q}))`)
    partes.push(`similarity(immutable_unaccent(lower("dsItem")), immutable_unaccent(lower(${q}))) > 0.08`)
    partes.push(`immutable_unaccent(lower("dsItem")) LIKE '%' || immutable_unaccent(lower(${q})) || '%'`)
    clauses.push(`(${partes.join(' OR ')})`)
  }

  if (filtros.cdIbge) clauses.push(`"cdIbge" = ${pushParam(params, filtros.cdIbge)}`)
  if (filtros.municipio) {
    clauses.push(`immutable_unaccent(lower("nmMunicipio")) LIKE '%' || immutable_unaccent(lower(${pushParam(params, filtros.municipio)})) || '%'`)
  }
  if (filtros.modalidade) clauses.push(`"dsModalidadeLicitacao" = ${pushParam(params, filtros.modalidade)}`)
  if (filtros.anoLicitacao) clauses.push(`"nrAnoLicitacao" = ${pushParam(params, filtros.anoLicitacao)}`)
  if (filtros.dtHomologacaoInicio) clauses.push(`"dtHomologacao" >= ${pushParam(params, filtros.dtHomologacaoInicio)}::date`)
  if (filtros.dtHomologacaoFim) clauses.push(`"dtHomologacao" < (${pushParam(params, filtros.dtHomologacaoFim)}::date + interval '1 day')`)
  if (filtros.fornecedor) {
    clauses.push(`immutable_unaccent(lower("nmPessoa")) LIKE '%' || immutable_unaccent(lower(${pushParam(params, filtros.fornecedor)})) || '%'`)
  }
  if (filtros.nrDocumento) clauses.push(`"nrDocumento" = ${pushParam(params, filtros.nrDocumento)}`)
  if (filtros.apenasVencedores !== false) clauses.push(`"nrClassificacao" = 1`)
  if (typeof filtros.valorMin === 'number') clauses.push(`"vlLicitacaoVencedor" >= ${pushParam(params, filtros.valorMin)}`)
  if (typeof filtros.valorMax === 'number') clauses.push(`"vlLicitacaoVencedor" <= ${pushParam(params, filtros.valorMax)}`)

  return clauses.length ? clauses.join(' AND ') : 'TRUE'
}

function buildOrder(ordenarPor: OrdenacaoTcePr, termo: string) {
  switch (ordenarPor) {
    case 'preco_asc':
      return '"vlLicitacaoVencedor" ASC NULLS LAST'
    case 'preco_desc':
      return '"vlLicitacaoVencedor" DESC NULLS LAST'
    case 'data_asc':
      return '"dtHomologacao" ASC NULLS LAST'
    case 'data_desc':
      return '"dtHomologacao" DESC NULLS LAST'
    case 'municipio':
      return '"nmMunicipio" ASC, "dtHomologacao" DESC NULLS LAST'
    case 'relevancia':
    default:
      return termo
        ? 'score DESC, "dtHomologacao" DESC NULLS LAST, "vlLicitacaoVencedor" ASC NULLS LAST'
        : '"dtHomologacao" DESC NULLS LAST, "vlLicitacaoVencedor" ASC NULLS LAST'
  }
}

function toItem(row: TcePrRow): TcePrItem {
  return {
    id: asCount(row.id),
    cdIbge: row.cdIbge,
    nmMunicipio: row.nmMunicipio,
    idPessoa: asNumber(row.idPessoa),
    nmEntidade: row.nmEntidade,
    idLicitacao: asCount(row.idLicitacao),
    nrAnoLicitacao: asNumber(row.nrAnoLicitacao),
    nrLicitacao: asNumber(row.nrLicitacao),
    dsModalidadeLicitacao: row.dsModalidadeLicitacao,
    dtHomologacao: row.dtHomologacao?.toISOString() ?? null,
    nrDocumento: row.nrDocumento,
    nmPessoa: row.nmPessoa,
    nrLote: asCount(row.nrLote),
    nrItem: asCount(row.nrItem),
    dsItem: row.dsItem,
    idUnidadeMedida: asNumber(row.idUnidadeMedida),
    dsUnidadeMedida: row.dsUnidadeMedida,
    nrQuantidade: asNumber(row.nrQuantidade),
    vlMinimoUnitarioItem: asNumber(row.vlMinimoUnitarioItem),
    vlMinimoTotal: asNumber(row.vlMinimoTotal),
    vlMaximoUnitarioItem: asNumber(row.vlMaximoUnitarioItem),
    vlMaximoTotal: asNumber(row.vlMaximoTotal),
    nrQuantidadeProposta: asNumber(row.nrQuantidadeProposta),
    vlPropostaItem: asNumber(row.vlPropostaItem),
    nrQuantidadeVencedor: asNumber(row.nrQuantidadeVencedor),
    vlLicitacaoVencedor: asNumber(row.vlLicitacaoVencedor),
    nrClassificacao: asCount(row.nrClassificacao),
    dsFormaPagamento: row.dsFormaPagamento,
    nrPrazoLimiteEntrega: asNumber(row.nrPrazoLimiteEntrega),
    idTipoEntregaProduto: asNumber(row.idTipoEntregaProduto),
    dsTipoEntregaProduto: row.dsTipoEntregaProduto,
    dtValidadeProposta: row.dtValidadeProposta?.toISOString() ?? null,
    dtPrazoEntregaProposta: row.dtPrazoEntregaProposta?.toISOString() ?? null,
    ultimoEnvioSimam: row.ultimoEnvioSimam,
    dataReferencia: row.dataReferencia,
    score: asNumber(row.score) ?? 0,
    compatibilidade: Math.max(0, Math.min(100, Math.round(Number(row.score || 0) * 100))),
  }
}

async function facet(whereSql: string, params: unknown[], columnExpr: string) {
  const rows = await prisma.$queryRawUnsafe<FacetRow[]>(
    `
      SELECT ${columnExpr} AS valor, count(*) AS quantidade
      FROM "LicitacaoVencedorTcePr"
      WHERE ${whereSql} AND ${columnExpr} IS NOT NULL AND ${columnExpr} <> ''
      GROUP BY ${columnExpr}
      ORDER BY quantidade DESC, valor ASC
      LIMIT 20
    `,
    ...params,
  )
  return rows.map((row): TcePrFacet => ({ valor: String(row.valor ?? ''), quantidade: asCount(row.quantidade) }))
}

export class TceprService {
  async buscar(params: TcePrBuscaParams): Promise<TcePrBuscaResponse> {
    const termo = params.termo.trim()
    const ordenarPor: OrdenacaoTcePr = ORDENACOES_TCEPR.includes(params.filtros?.ordenarPor as OrdenacaoTcePr)
      ? (params.filtros?.ordenarPor as OrdenacaoTcePr)
      : 'relevancia'
    const apenasVencedores = params.filtros?.apenasVencedores !== false

    const pagina = Math.max(1, params.pagina || 1)
    const limite = Math.min(50, Math.max(1, params.limite || 20))
    const offset = (pagina - 1) * limite

    const whereParams: unknown[] = []
    const whereSql = buildWhere(termo, params.filtros, whereParams)
    const termoParam = pushParam(whereParams, termo)
    const limitParam = pushParam(whereParams, limite)
    const offsetParam = pushParam(whereParams, offset)

    const scoreExpr = termo
      ? `(ts_rank_cd("busca_tsv", websearch_to_tsquery('portuguese', ${termoParam})) + similarity("dsItem", ${termoParam}))`
      : `0`
    const orderSql = buildOrder(ordenarPor, termo)

    const rows = await prisma.$queryRawUnsafe<TcePrRow[]>(
      `
        SELECT
          "id", "cdIbge", "nmMunicipio", "idPessoa", "nmEntidade", "idLicitacao",
          "nrAnoLicitacao", "nrLicitacao", "dsModalidadeLicitacao", "dtHomologacao",
          "nrDocumento", "nmPessoa", "nrLote", "nrItem", "dsItem", "idUnidadeMedida",
          "dsUnidadeMedida", "nrQuantidade", "vlMinimoUnitarioItem", "vlMinimoTotal",
          "vlMaximoUnitarioItem", "vlMaximoTotal", "nrQuantidadeProposta", "vlPropostaItem",
          "nrQuantidadeVencedor", "vlLicitacaoVencedor", "nrClassificacao",
          "dsFormaPagamento", "nrPrazoLimiteEntrega", "idTipoEntregaProduto",
          "dsTipoEntregaProduto", "dtValidadeProposta", "dtPrazoEntregaProposta",
          "ultimoEnvioSimam", "dataReferencia",
          ${scoreExpr} AS score
        FROM "LicitacaoVencedorTcePr"
        WHERE ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      ...whereParams,
    )

    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT count(*) AS total FROM "LicitacaoVencedorTcePr" WHERE ${whereSql}`,
      ...whereParams.slice(0, -3),
    )
    const total = asCount(countRows[0]?.total ?? 0)

    const metricRows = await prisma.$queryRawUnsafe<MetricsRow[]>(
      `
        SELECT
          count(*) AS quantidade,
          min("vlLicitacaoVencedor") AS menor,
          avg("vlLicitacaoVencedor") AS media,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "vlLicitacaoVencedor") AS mediana,
          max("vlLicitacaoVencedor") AS maior
        FROM "LicitacaoVencedorTcePr"
        WHERE ${whereSql} AND "vlLicitacaoVencedor" IS NOT NULL
      `,
      ...whereParams.slice(0, -3),
    )
    const metricRow = metricRows[0]

    const facetParams = whereParams.slice(0, -3)
    const [municipios, modalidades, anos, fornecedores] = await Promise.all([
      facet(whereSql, facetParams, '"nmMunicipio"'),
      facet(whereSql, facetParams, '"dsModalidadeLicitacao"'),
      facet(whereSql, facetParams, 'cast("nrAnoLicitacao" as text)'),
      facet(whereSql, facetParams, '"nmPessoa"'),
    ])

    const metricas: TcePrMetricas | null = metricRow
      ? {
          quantidade: asCount(metricRow.quantidade),
          menor: asNumber(metricRow.menor),
          media: asNumber(metricRow.media),
          mediana: asNumber(metricRow.mediana),
          maior: asNumber(metricRow.maior),
        }
      : null

    return {
      items: rows.map(toItem),
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      metricas,
      filtrosSugeridos: { municipios, modalidades, anos, fornecedores },
      apenasVencedores,
    }
  }
}
