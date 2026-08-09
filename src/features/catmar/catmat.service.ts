import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { metricasDoItem } from '@/features/precos/estatisticas'
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
  ftsMatch?: boolean | null
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

function classificarCompatibilidade(score: number | null | undefined, ftsMatch?: boolean | null): 'exato' | 'alta' | 'similar' {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'similar'
  // "exato" exige piso absoluto: todos os tokens da busca presentes no item (match full-text),
  // não apenas o melhor score relativo da página — evita rotular typo/fuzzy como exato
  if (score >= 95 && ftsMatch === true) return 'exato'
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

      // Busca em dois estágios: 1) full-text puro (tsv indexado, cobre acentos e
      // é a via rápida); 2) somente se o FTS não encontrar nada, trigram sobre
      // nomePdm para tolerância a typo. O trigram sobre descricaoItem foi removido:
      // com termos curtos, a rechecagem de similaridade em textos longos varre um
      // volume enorme de candidatos e estourava o timeout de 10s em produção.
      const executarBusca = async (matchClause: Prisma.Sql) => {
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
            ) AS score,
            (c.tsv @@ q.tsq) AS "ftsMatch"
          FROM "CatmatItem" c, q
          WHERE ${matchClause}
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
          WHERE ${matchClause}
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
            WHERE ${matchClause}
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
          WHERE ${matchClause}
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
          WHERE ${matchClause}
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
          WHERE ${matchClause}
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

        return { rows, totalResult, topScoreResult, grupos, classes, pdms }
      }

      let resultado = await executarBusca(Prisma.sql`c.tsv @@ q.tsq`)
      if ((resultado.totalResult[0]?.total ?? 0) === 0) {
        // Nada no full-text: provavelmente typo — tenta trigram no nomePdm
        resultado = await executarBusca(Prisma.sql`immutable_unaccent(c."nomePdm") % q.raw`)
      }

      const { rows, totalResult, topScoreResult, grupos, classes, pdms } = resultado
      const total = totalResult[0]?.total ?? 0
      const topScore = Number(topScoreResult[0]?.topScore ?? 0)
      const items = rows.map((row) => {
        const compatibilidade = normalizarScore(row.score, topScore)
        return {
          ...toSeed(row),
          compatibilidade,
          faixa: classificarCompatibilidade(compatibilidade, row.ftsMatch),
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
      // Lógica compartilhada com /api/catmat/precos: banco local com fallback
      // para a API de dados abertos do governo (contrato vigente)
      return await metricasDoItem(codigoItem)
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
        unidades: [],
        comprasRecentes: [],
      }
    }
  }
}

export type { BuscaFiltros, BuscaParams, BuscaResultado }
