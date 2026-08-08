import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { catmatMockData, type CatmatItemSeed } from './mock-data'
import type { BuscaFiltros, BuscaParams, BuscaResultado, BuscaItem, FiltroFacetado, ContagensCompatibilidade } from './catmat.types'

interface PrismaCatmatRow {
  codigoItem: number
  codigoGrupo: number
  nomeGrupo: string
  codigoClasse: number
  nomeClasse: string
  codigoPdm: number
  nomePdm: string
  descricaoItem: string
  codigoNcm: string | null
  aplicaMargemPreferencia: boolean
  dataHoraAtualizacao: Date
  score?: number | null
  compatibilidade?: number | null
  faixa?: 'exato' | 'alta' | 'similar'
}

type CatmatItemParaBusca = Omit<CatmatItemSeed, 'dataHoraAtualizacao'> & Partial<BuscaItem> & {
  dataHoraAtualizacao: string
}

function toSeed(row: PrismaCatmatRow): CatmatItemParaBusca {
  const item = {
    codigoItem: row.codigoItem,
    codigoGrupo: row.codigoGrupo,
    nomeGrupo: row.nomeGrupo,
    codigoClasse: row.codigoClasse,
    nomeClasse: row.nomeClasse,
    codigoPdm: row.codigoPdm,
    nomePdm: row.nomePdm,
    descricaoItem: row.descricaoItem,
    codigoNcm: row.codigoNcm,
    aplicaMargemPreferencia: row.aplicaMargemPreferencia,
    dataHoraAtualizacao: row.dataHoraAtualizacao instanceof Date
      ? row.dataHoraAtualizacao.toISOString()
      : String(row.dataHoraAtualizacao),
  }

  return {
    ...item,
    compatibilidade: row.compatibilidade ?? undefined,
    faixa: row.faixa,
  }
}

function buscarNoMock(params: BuscaParams): BuscaResultado {
  const termo = String(params.termo || '').trim().toLowerCase()
  const pagina = Number(params.pagina || 1)
  const limite = Number(params.limite || 20)

  const filtrado = catmatMockData.filter((item) => {
    const texto = `${item.descricaoItem} ${item.nomePdm} ${item.nomeClasse} ${item.nomeGrupo}`.toLowerCase()
    const bateTermo = !termo || texto.includes(termo)
    const bateGrupo = !params.filtros?.codigoGrupo?.length || params.filtros.codigoGrupo.includes(item.codigoGrupo)
    const bateClasse = !params.filtros?.codigoClasse?.length || params.filtros.codigoClasse.includes(item.codigoClasse)
    const batePdm = !params.filtros?.codigoPdm?.length || params.filtros.codigoPdm.includes(item.codigoPdm)
    const bateMargem =
      params.filtros?.aplicaMargemPreferencia === undefined ||
      item.aplicaMargemPreferencia === params.filtros.aplicaMargemPreferencia
    return bateTermo && bateGrupo && bateClasse && batePdm && bateMargem
  })

  const items = filtrado.slice((pagina - 1) * limite, (pagina - 1) * limite + limite).map((item) => ({
    ...item,
    compatibilidade: 100,
    faixa: 'exato' as const,
  }))

  return {
    items: items as unknown as BuscaResultado['items'],
    total: filtrado.length,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(filtrado.length / limite)),
    filtrosSugeridos: {
      grupos: [...new Set(filtrado.map((item) => item.codigoGrupo))].map((codigo) => ({ codigo, nome: '', quantidade: 1 })),
      classes: [...new Set(filtrado.map((item) => item.codigoClasse))].map((codigo) => ({ codigo, nome: '', quantidade: 1 })),
      pdms: [...new Set(filtrado.map((item) => item.codigoPdm))].map((codigo) => ({ codigo, nome: '', quantidade: 1 })),
    },
    contagens: { exato: items.length, alta: 0, similar: 0 },
  }
}

function buildFilters(params: BuscaParams) {
  const filtros: BuscaFiltros = params.filtros ?? {}
  const clauses: Prisma.Sql[] = []

  if (filtros.codigoGrupo?.length) {
    clauses.push(Prisma.sql`AND c."codigoGrupo" = ANY (${filtros.codigoGrupo})`)
  }
  if (filtros.codigoClasse?.length) {
    clauses.push(Prisma.sql`AND c."codigoClasse" = ANY (${filtros.codigoClasse})`)
  }
  if (filtros.codigoPdm?.length) {
    clauses.push(Prisma.sql`AND c."codigoPdm" = ANY (${filtros.codigoPdm})`)
  }
  if (filtros.aplicaMargemPreferencia !== undefined) {
    clauses.push(Prisma.sql`AND c."aplicaMargemPreferencia" = ${filtros.aplicaMargemPreferencia}`)
  }

  return clauses
}

function classificarCompatibilidade(score: number | null | undefined): 'exato' | 'alta' | 'similar' {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'similar'
  if (score >= 95) return 'exato'
  if (score >= 70) return 'alta'
  return 'similar'
}

function normalizarScore(score: number | null | undefined, topScore: number): number {
  if (typeof score !== 'number' || Number.isNaN(score) || topScore <= 0) return 0
  return Math.min(100, Math.round((score / topScore) * 100))
}

function toFacetList(rows: Array<{ codigo: number; nome: string; quantidade: number }>): FiltroFacetado[] {
  return rows.map((row) => ({ codigo: row.codigo, nome: row.nome, quantidade: row.quantidade }))
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs = 10_000): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo limite excedido ao consultar o banco')), timeoutMs)
    operation.then((value) => {
      clearTimeout(timer)
      resolve(value)
    }).catch((error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

export class CatmatService {
  async buscarItens(params: BuscaParams): Promise<BuscaResultado> {
    const pagina = Number(params.pagina || 1)
    const limite = Number(params.limite || 20)
    const termo = String(params.termo || '').trim()
    const filtros = buildFilters(params)
    const whereClause = filtros.length ? Prisma.join(filtros, ' ') : Prisma.empty

    try {
      if (!termo) {
        const rowsQuery = Prisma.sql`
          SELECT c."codigoItem", c."codigoGrupo", c."nomeGrupo", c."codigoClasse", c."nomeClasse", c."codigoPdm", c."nomePdm", c."descricaoItem", c."codigoNcm", c."aplicaMargemPreferencia", c."dataHoraAtualizacao"
          FROM "CatmatItem" c
          WHERE true
          ${whereClause}
          ORDER BY c."codigoPdm" ASC, c."codigoGrupo" ASC, c."codigoItem" ASC
          LIMIT ${limite} OFFSET ${Math.max(0, (pagina - 1) * limite)}
        `

        const countQuery = Prisma.sql`
          SELECT COUNT(*)::int AS total
          FROM "CatmatItem" c
          WHERE true
          ${whereClause}
        `

        const facetsQuery = Prisma.sql`
          SELECT c."codigoGrupo" AS codigo, c."nomeGrupo" AS nome, COUNT(*)::int AS quantidade
          FROM "CatmatItem" c
          WHERE true
          ${whereClause}
          GROUP BY c."codigoGrupo", c."nomeGrupo"
          ORDER BY quantidade DESC, c."nomeGrupo" ASC
          LIMIT 10
        `

        const facetsClassesQuery = Prisma.sql`
          SELECT c."codigoClasse" AS codigo, c."nomeClasse" AS nome, COUNT(*)::int AS quantidade
          FROM "CatmatItem" c
          WHERE true
          ${whereClause}
          GROUP BY c."codigoClasse", c."nomeClasse"
          ORDER BY quantidade DESC, c."nomeClasse" ASC
          LIMIT 10
        `

        const facetsPdmQuery = Prisma.sql`
          SELECT c."codigoPdm" AS codigo, c."nomePdm" AS nome, COUNT(*)::int AS quantidade
          FROM "CatmatItem" c
          WHERE true
          ${whereClause}
          GROUP BY c."codigoPdm", c."nomePdm"
          ORDER BY quantidade DESC, c."nomePdm" ASC
          LIMIT 10
        `

        const [rows, totalResult, grupos, classes, pdms] = await Promise.all([
          withTimeout(prisma.$queryRaw<Array<PrismaCatmatRow>>(rowsQuery)),
          withTimeout(prisma.$queryRaw<Array<{ total: number }>>(countQuery)),
          withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsQuery)),
          withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsClassesQuery)),
          withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsPdmQuery)),
        ])

        const total = totalResult[0]?.total ?? 0
        const items = rows.map((row) => ({ ...toSeed(row), compatibilidade: 100, faixa: 'exato' as const }))

        return {
          items: items as unknown as BuscaResultado['items'],
          total,
          pagina,
          totalPaginas: Math.max(1, Math.ceil(total / limite)),
          filtrosSugeridos: {
            grupos: toFacetList(grupos),
            classes: toFacetList(classes),
            pdms: toFacetList(pdms),
          },
          contagens: { exato: items.length, alta: 0, similar: 0 },
        }
      }

      const query = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        )
        SELECT c."codigoItem", c."codigoGrupo", c."nomeGrupo", c."codigoClasse", c."nomeClasse", c."codigoPdm", c."nomePdm", c."descricaoItem", c."codigoNcm", c."aplicaMargemPreferencia", c."dataHoraAtualizacao",
          (
            ts_rank_cd(c.tsv, q.tsq, 32) * 0.6
            + GREATEST(
                similarity(immutable_unaccent(c."nomePdm"), q.raw),
                similarity(immutable_unaccent(c."descricaoItem"), q.raw) * 0.8
              ) * 0.4
          ) AS score
        FROM "CatmatItem" c, q
        WHERE (c.tsv @@ q.tsq
               OR immutable_unaccent(c."nomePdm") % q.raw
               OR immutable_unaccent(c."descricaoItem") % q.raw)
        ${whereClause}
        ORDER BY score DESC, c."nomePdm" ASC, c."codigoItem" ASC
        LIMIT ${limite} OFFSET ${Math.max(0, (pagina - 1) * limite)}
      `

      const countQuery = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        )
        SELECT COUNT(*)::int AS total
        FROM "CatmatItem" c, q
        WHERE (c.tsv @@ q.tsq
               OR immutable_unaccent(c."nomePdm") % q.raw
               OR immutable_unaccent(c."descricaoItem") % q.raw)
        ${whereClause}
      `

      const topScoreQuery = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        ), ranked AS (
          SELECT (
            ts_rank_cd(c.tsv, q.tsq, 32) * 0.6
            + GREATEST(
                similarity(immutable_unaccent(c."nomePdm"), q.raw),
                similarity(immutable_unaccent(c."descricaoItem"), q.raw) * 0.8
              ) * 0.4
          ) AS score
          FROM "CatmatItem" c, q
          WHERE (c.tsv @@ q.tsq
                 OR immutable_unaccent(c."nomePdm") % q.raw
                 OR immutable_unaccent(c."descricaoItem") % q.raw)
          ${whereClause}
        )
        SELECT MAX(score) AS "topScore"
        FROM ranked
      `

      const facetsQuery = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        )
        SELECT c."codigoGrupo" AS codigo, c."nomeGrupo" AS nome, COUNT(*)::int AS quantidade
        FROM "CatmatItem" c, q
        WHERE (c.tsv @@ q.tsq
               OR immutable_unaccent(c."nomePdm") % q.raw
               OR immutable_unaccent(c."descricaoItem") % q.raw)
        ${whereClause}
        GROUP BY c."codigoGrupo", c."nomeGrupo"
        ORDER BY quantidade DESC, c."nomeGrupo" ASC
        LIMIT 10
      `

      const facetsClassesQuery = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        )
        SELECT c."codigoClasse" AS codigo, c."nomeClasse" AS nome, COUNT(*)::int AS quantidade
        FROM "CatmatItem" c, q
        WHERE (c.tsv @@ q.tsq
               OR immutable_unaccent(c."nomePdm") % q.raw
               OR immutable_unaccent(c."descricaoItem") % q.raw)
        ${whereClause}
        GROUP BY c."codigoClasse", c."nomeClasse"
        ORDER BY quantidade DESC, c."nomeClasse" ASC
        LIMIT 10
      `

      const facetsPdmQuery = Prisma.sql`
        WITH q AS (
          SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${termo})) AS tsq,
                 immutable_unaccent(${termo}) AS raw
        )
        SELECT c."codigoPdm" AS codigo, c."nomePdm" AS nome, COUNT(*)::int AS quantidade
        FROM "CatmatItem" c, q
        WHERE (c.tsv @@ q.tsq
               OR immutable_unaccent(c."nomePdm") % q.raw
               OR immutable_unaccent(c."descricaoItem") % q.raw)
        ${whereClause}
        GROUP BY c."codigoPdm", c."nomePdm"
        ORDER BY quantidade DESC, c."nomePdm" ASC
        LIMIT 10
      `

      const [rows, totalResult, topScoreResult, grupos, classes, pdms] = await Promise.all([
        withTimeout(prisma.$queryRaw<Array<PrismaCatmatRow>>(query)),
        withTimeout(prisma.$queryRaw<Array<{ total: number }>>(countQuery)),
        withTimeout(prisma.$queryRaw<Array<{ topScore: number | null }>>(topScoreQuery)),
        withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsQuery)),
        withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsClassesQuery)),
        withTimeout(prisma.$queryRaw<Array<{ codigo: number; nome: string; quantidade: number }>>(facetsPdmQuery)),
      ])

      const total = totalResult[0]?.total ?? 0
      const topScore = Number(topScoreResult[0]?.topScore ?? 0)
      const items = rows.map((row) => {
        const compatibilidade = normalizarScore(row.score, topScore)
        return {
          ...toSeed(row),
          compatibilidade,
          faixa: classificarCompatibilidade(compatibilidade),
        }
      })

      const contagens: ContagensCompatibilidade = {
        exato: items.filter((item) => item.faixa === 'exato').length,
        alta: items.filter((item) => item.faixa === 'alta').length,
        similar: items.filter((item) => item.faixa === 'similar').length,
      }

      return {
        items: items as unknown as BuscaResultado['items'],
        total,
        pagina,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
        filtrosSugeridos: {
          grupos: toFacetList(grupos),
          classes: toFacetList(classes),
          pdms: toFacetList(pdms),
        },
        contagens,
      }
    } catch (error) {
      console.warn('[catmat] Falha ao consultar banco, usando mock:', error)
      return buscarNoMock(params)
    }
  }

  async obterItem(codigoItem: number) {
    try {
      return await prisma.catmatItem.findUnique({ where: { codigoItem } })
    } catch (error) {
      console.warn('[catmat] Falha ao consultar item:', error)
      return null
    }
  }

  async obterEstatisticasPreco(codigoItem: number) {
    try {
      const compras = await prisma.compraItem.findMany({
        where: { codigoItemCatalogo: codigoItem },
        select: { precoUnitario: true, dataCompra: true },
        orderBy: { dataCompra: 'asc' },
      })

      const precos = compras.map((compra) => Number(compra.precoUnitario)).filter((valor) => Number.isFinite(valor) && valor > 0)
      if (!precos.length) {
        return {
          media: 0,
          mediana: 0,
          menor: 0,
          maior: 0,
          amostras: 0,
          quantidadeCompras: 0,
          quantidadeOutliersRemovidos: 0,
          periodoInicio: null,
          periodoFim: null,
        }
      }

      const sorted = [...precos].sort((a, b) => a - b)
      const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0
      const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0
      const iqr = q3 - q1
      const limiteInferior = q1 - 1.5 * iqr
      const limiteSuperior = q3 + 1.5 * iqr
      const precosFiltrados = sorted.filter((valor) => valor >= limiteInferior && valor <= limiteSuperior)
      const outliers = sorted.filter((valor) => valor < limiteInferior || valor > limiteSuperior)
      const sum = precosFiltrados.reduce((total, valor) => total + valor, 0)
      const media = precosFiltrados.length ? sum / precosFiltrados.length : 0
      const mediana = precosFiltrados.length % 2 === 0
        ? (precosFiltrados[Math.floor(precosFiltrados.length / 2) - 1] + precosFiltrados[precosFiltrados.length / 2]) / 2
        : precosFiltrados[Math.floor(precosFiltrados.length / 2)]

      return {
        media: Number(media.toFixed(2)),
        mediana: Number(mediana.toFixed(2)),
        menor: Number((precosFiltrados[0] ?? 0).toFixed(2)),
        maior: Number((precosFiltrados[precosFiltrados.length - 1] ?? 0).toFixed(2)),
        amostras: precosFiltrados.length,
        quantidadeCompras: compras.length,
        quantidadeOutliersRemovidos: outliers.length,
        periodoInicio: compras[0]?.dataCompra ? new Date(compras[0].dataCompra).toISOString() : null,
        periodoFim: compras[compras.length - 1]?.dataCompra ? new Date(compras[compras.length - 1].dataCompra).toISOString() : null,
      }
    } catch (error) {
      console.warn('[catmat] Falha ao calcular estatísticas de preço:', error)
      return {
        media: 0,
        mediana: 0,
        menor: 0,
        maior: 0,
        amostras: 0,
        quantidadeCompras: 0,
        quantidadeOutliersRemovidos: 0,
        periodoInicio: null,
        periodoFim: null,
      }
    }
  }
}

export type { BuscaFiltros, BuscaParams, BuscaResultado }
