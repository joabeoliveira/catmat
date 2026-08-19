// src/features/catser/catser.service.ts
import { prisma } from '@/lib/db'

export interface CatserFiltros {
  codigoGrupo?: number
  codigoClasse?: string
  statusServico?: boolean
}

export interface BuscarCatserParams {
  termo: string
  pagina?: number
  limite?: number
  filtros?: CatserFiltros
}

export interface CatserPrecosFiltros {
  pagina?: number
  tamanhoPagina?: number
  uf?: string
  codigoUasg?: string
  codigoMunicipio?: number
  poder?: string
  esfera?: string
  dataCompraInicio?: string
  dataCompraFim?: string
}

interface CatserRow {
  codigoItem: number
  codigoGrupo: number
  nomeGrupo: string
  codigoClasse: string
  nomeClasse: string
  codigoServico: number
  nomeServico: string
  statusServico: boolean
  score: number
}

interface CountRow {
  total: bigint | number
}

interface FacetRow {
  valor: string | null
  quantidade: bigint | number
}

interface PrecoServicoRaw {
  idCompra?: string | null
  idItemCompra?: number | null
  forma?: string | null
  modalidade?: number | null
  criterioJulgamento?: string | null
  numeroItemCompra?: number | null
  descricaoItem?: string | null
  codigoItemCatalogo?: number | null
  nomeUnidadeMedida?: string | null
  siglaUnidadeMedida?: string | null
  quantidade?: unknown
  precoUnitario?: unknown
  percentualMaiorDesconto?: unknown
  niFornecedor?: string | null
  nomeFornecedor?: string | null
  codigoUasg?: string | null
  nomeUasg?: string | null
  codigoMunicipio?: number | null
  municipio?: string | null
  estado?: string | null
  codigoOrgao?: number | null
  nomeOrgao?: string | null
  poder?: string | null
  esfera?: string | null
  dataCompra?: string | null
  objetoCompra?: string | null
  descricaoDetalhadaItem?: string | null
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

function buildWhere(termo: string, filtros: CatserFiltros = {}, params: unknown[]) {
  const clauses: string[] = []
  const q = pushParam(params, termo)
  clauses.push(`(
    "busca_tsv" @@ websearch_to_tsquery('portuguese', ${q})
    OR similarity(immutable_unaccent("nomeServico"), immutable_unaccent(${q})) > 0.08
  )`)

  if (filtros.codigoGrupo !== undefined) clauses.push(`"codigoGrupo" = ${pushParam(params, filtros.codigoGrupo)}`)
  if (filtros.codigoClasse) clauses.push(`"codigoClasse" = ${pushParam(params, filtros.codigoClasse)}`)
  if (filtros.statusServico !== undefined) clauses.push(`"statusServico" = ${pushParam(params, filtros.statusServico)}`)

  return clauses.join(' AND ')
}

function toItem(row: CatserRow) {
  return {
    codigoItem: row.codigoItem,
    codigoGrupo: row.codigoGrupo,
    nomeGrupo: row.nomeGrupo,
    codigoClasse: row.codigoClasse,
    nomeClasse: row.nomeClasse,
    codigoServico: row.codigoServico,
    nomeServico: row.nomeServico,
    statusServico: row.statusServico,
    compatibilidade: Math.max(0, Math.min(100, Math.round(Number(row.score || 0) * 100))),
  }
}

function toPrecoItem(row: PrecoServicoRaw) {
  return {
    idCompra: row.idCompra ?? null,
    idItemCompra: row.idItemCompra ?? null,
    forma: row.forma ?? null,
    modalidade: row.modalidade ?? null,
    criterioJulgamento: row.criterioJulgamento ?? null,
    numeroItemCompra: row.numeroItemCompra ?? null,
    descricaoItem: row.descricaoItem ?? '',
    codigoItemCatalogo: row.codigoItemCatalogo ?? null,
    nomeUnidadeMedida: row.nomeUnidadeMedida ?? null,
    siglaUnidadeMedida: row.siglaUnidadeMedida ?? null,
    quantidade: asNumber(row.quantidade),
    precoUnitario: asNumber(row.precoUnitario),
    percentualMaiorDesconto: asNumber(row.percentualMaiorDesconto),
    niFornecedor: row.niFornecedor ?? null,
    nomeFornecedor: row.nomeFornecedor ?? null,
    codigoUasg: row.codigoUasg ?? null,
    nomeUasg: row.nomeUasg ?? null,
    codigoMunicipio: row.codigoMunicipio ?? null,
    municipio: row.municipio ?? null,
    estado: row.estado ?? null,
    codigoOrgao: row.codigoOrgao ?? null,
    nomeOrgao: row.nomeOrgao ?? null,
    poder: row.poder ?? null,
    esfera: row.esfera ?? null,
    dataCompra: row.dataCompra ?? null,
    objetoCompra: row.objetoCompra ?? null,
    descricaoDetalhadaItem: row.descricaoDetalhadaItem ?? null,
  }
}

function calcularMetricas(itens: PrecoServicoRaw[]) {
  const precos = itens
    .map((item) => asNumber(item.precoUnitario))
    .filter((preco): preco is number => preco !== null && preco > 0)

  if (precos.length === 0) {
    return { quantidade: 0, menor: null, media: null, mediana: null, maior: null }
  }

  const sorted = [...precos].sort((a, b) => a - b)
  const soma = precos.reduce((acc, valor) => acc + valor, 0)
  const meio = Math.floor(sorted.length / 2)
  const mediana =
    sorted.length % 2 === 0 ? (sorted[meio - 1] + sorted[meio]) / 2 : sorted[meio]

  return {
    quantidade: precos.length,
    menor: sorted[0],
    media: soma / precos.length,
    mediana,
    maior: sorted[sorted.length - 1],
  }
}

async function safeFacet(whereSql: string, params: unknown[], column: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<FacetRow[]>(
      `
        SELECT ${column} AS valor, count(*) AS quantidade
        FROM "CatserItem"
        WHERE ${whereSql} AND ${column} IS NOT NULL AND ${column} <> ''
        GROUP BY ${column}
        ORDER BY quantidade DESC, valor ASC
        LIMIT 20
      `,
      ...params,
    )
    return rows.map((row) => ({ valor: row.valor || '', quantidade: asCount(row.quantidade) }))
  } catch (error) {
    console.warn(`Falha ao carregar filtro CATSER ${column}:`, error)
    return []
  }
}

export class CatserService {
  /**
   * Busca serviços por descrição (full-text + trigram), com filtros por
   * grupo, classe e status. Retorna itens, paginação e sugestões de filtro.
   */
  async buscar(params: BuscarCatserParams) {
    const termo = params.termo.trim()
    if (termo.length < 2) {
      return {
        items: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0,
        filtrosSugeridos: { grupos: [], classes: [] },
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

    const rows = await prisma.$queryRawUnsafe<CatserRow[]>(
      `
        SELECT
          "codigoItem",
          "codigoGrupo",
          "nomeGrupo",
          "codigoClasse",
          "nomeClasse",
          "codigoServico",
          "nomeServico",
          "statusServico",
          (
            ts_rank_cd("busca_tsv", websearch_to_tsquery('portuguese', ${termoParam}))
            + similarity(immutable_unaccent("nomeServico"), immutable_unaccent(${termoParam}))
          ) AS score
        FROM "CatserItem"
        WHERE ${whereSql}
        ORDER BY score DESC, "codigoGrupo", "codigoClasse"
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      ...whereParams,
    )

    const baseParams = whereParams.slice(0, -3)
    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT count(*) AS total FROM "CatserItem" WHERE ${whereSql}`,
      ...baseParams,
    )
    const total = asCount(countRows[0]?.total ?? 0)

    const grupos = await safeFacet(whereSql, baseParams, '"nomeGrupo"')
    const classes = await safeFacet(whereSql, baseParams, '"nomeClasse"')

    return {
      items: rows.map(toItem),
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      filtrosSugeridos: { grupos, classes },
    }
  }

  /**
   * Busca os dados cadastrais de um serviço pelo código do CATSER.
   */
  async buscarPorCodigo(codigoServico: number) {
    if (!Number.isInteger(codigoServico) || codigoServico <= 0) {
      throw new Error('Código do serviço inválido.')
    }
    return prisma.catserItem.findFirst({ where: { codigoServico } })
  }

  /**
   * Consulta os preços praticados do serviço na API de Dados Abertos do
   * Compras.gov.br (módulo 3_consultarServico), com filtros e métricas.
   */
  async consultarPrecos(codigoServico: number, filtros: CatserPrecosFiltros = {}) {
    if (!Number.isInteger(codigoServico) || codigoServico <= 0) {
      throw new Error('Código do serviço inválido.')
    }

    const params = new URLSearchParams()
    params.set('pagina', String(filtros.pagina || 1))
    params.set('tamanhoPagina', String(filtros.tamanhoPagina || 10))
    params.set('codigoItemCatalogo', String(codigoServico))
    params.set('dataResultado', 'false')
    if (filtros.uf) params.set('estado', filtros.uf.toUpperCase())
    if (filtros.codigoUasg) params.set('codigoUasg', filtros.codigoUasg)
    if (filtros.codigoMunicipio) params.set('codigoMunicipio', String(filtros.codigoMunicipio))
    if (filtros.poder) params.set('poder', filtros.poder)
    if (filtros.esfera) params.set('esfera', filtros.esfera)
    if (filtros.dataCompraInicio) params.set('dataCompraInicio', filtros.dataCompraInicio)
    if (filtros.dataCompraFim) params.set('dataCompraFim', filtros.dataCompraFim)

    const url = `https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/3_consultarServico?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: '*/*' },
      next: { revalidate: 3600 }, // Cache do Next.js por 1 hora
    })

    if (!response.ok) {
      throw new Error(`Erro na consulta de preços do serviço (Status: ${response.status})`)
    }

    const data = await response.json()
    const resultado: PrecoServicoRaw[] = Array.isArray(data.resultado) ? data.resultado : []
    const metricas = calcularMetricas(resultado)

    return {
      codigoServico,
      itens: resultado.map(toPrecoItem),
      totalRegistros: data.totalRegistros ?? 0,
      totalPaginas: data.totalPaginas ?? 0,
      paginasRestantes: data.paginasRestantes ?? 0,
      metricas,
    }
  }
}
