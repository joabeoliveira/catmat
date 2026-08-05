import { prisma } from '@/lib/db'
import { catmatMockData, type CatmatItemSeed } from './mock-data'
import type { BuscaFiltros, BuscaParams, BuscaResultado } from './catmat.types'

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
}

function toSeed(row: PrismaCatmatRow): CatmatItemSeed {
  return {
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
}

function buildWhere(params: BuscaParams) {
  const termo = String(params.termo || '').trim()
  const where: Record<string, unknown> = {}

  if (termo) {
    where.OR = [
      { descricaoItem: { contains: termo, mode: 'insensitive' } },
      { nomePdm: { contains: termo, mode: 'insensitive' } },
      { nomeClasse: { contains: termo, mode: 'insensitive' } },
      { nomeGrupo: { contains: termo, mode: 'insensitive' } },
    ]
  }

  const filtros: BuscaFiltros = params.filtros ?? {}
  if (filtros.codigoGrupo?.length) where.codigoGrupo = { in: filtros.codigoGrupo }
  if (filtros.codigoClasse?.length) where.codigoClasse = { in: filtros.codigoClasse }
  if (filtros.codigoPdm?.length) where.codigoPdm = { in: filtros.codigoPdm }
  if (filtros.aplicaMargemPreferencia !== undefined) {
    where.aplicaMargemPreferencia = filtros.aplicaMargemPreferencia
  }

  return where
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

  const total = filtrado.length
  const start = (pagina - 1) * limite
  const end = start + limite

  return {
    items: filtrado.slice(start, end) as unknown as BuscaResultado['items'],
    total,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / limite)),
    filtrosSugeridos: {
      grupos: [...new Set(filtrado.map((item) => item.codigoGrupo))],
      classes: [...new Set(filtrado.map((item) => item.codigoClasse))],
    },
  }
}

export class CatmatService {
  async buscarItens(params: BuscaParams): Promise<BuscaResultado> {
    const pagina = Number(params.pagina || 1)
    const limite = Number(params.limite || 20)

    try {
      const where = buildWhere(params)
      const total = await prisma.catmatItem.count({ where })

      if (total === 0) {
        // Banco ainda não populado — usa o mock para evitar tela vazia
        return buscarNoMock(params)
      }

      const rows = await prisma.catmatItem.findMany({
            where,
            // recupera um conjunto razoável de candidatos para ranqueio em memória
            // depois aplicamos pontuação ponderada para priorizar `nomePdm` e matches exatos
            orderBy: [
              { codigoPdm: 'asc' },
              { codigoGrupo: 'asc' },
            ],
            take: Math.max(200, limite * 10),
      })

          // se não houver termo, devolve ordenação natural e paginação simples
          const termo = String(params.termo || '').trim()
          if (!termo) {
            const paged = rows.slice((pagina - 1) * limite, (pagina - 1) * limite + limite)
            return {
              items: paged.map(toSeed) as unknown as BuscaResultado['items'],
              total,
              pagina,
              totalPaginas: Math.max(1, Math.ceil(total / limite)),
              filtrosSugeridos: {
                grupos: [...new Set(rows.map((row) => row.codigoGrupo))],
                classes: [...new Set(rows.map((row) => row.codigoClasse))],
              },
            }
          }

          // função de escore simples e determinística
          const scoreFor = (row: PrismaCatmatRow, q: string) => {
            const t = q.toLowerCase()
            const descricao = String(row.descricaoItem || '').toLowerCase()
            const pdm = String(row.nomePdm || '').toLowerCase()
            const classe = String(row.nomeClasse || '').toLowerCase()
            const grupo = String(row.nomeGrupo || '').toLowerCase()

            let score = 0

            // nomePdm tem maior peso
            if (pdm === t) score += 200
            else if (pdm.startsWith(t)) score += 120
            else if (pdm.includes(t)) score += 60

            // descricaoItem também conta
            if (descricao === t) score += 150
            else if (descricao.startsWith(t)) score += 70
            else if (descricao.includes(t)) score += 30

            // classe/grupo servem como sinais auxiliares
            if (classe === t) score += 50
            else if (classe.includes(t)) score += 20

            if (grupo === t) score += 40
            else if (grupo.includes(t)) score += 15

            // tokens: soma pequena para cada token presente
            const tokens = t.split(/\s+/).filter(Boolean)
            for (const tk of tokens) {
              if (pdm.includes(tk)) score += 8
              if (descricao.includes(tk)) score += 4
              if (classe.includes(tk)) score += 3
            }

            return score
          }

          // avalia e ordena por score desc, nomePdm, descricao
          const scored = rows.map((r) => ({ row: r, score: scoreFor(r as PrismaCatmatRow, termo) }))
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score
              const pa = String(a.row.nomePdm || '')
              const pb = String(b.row.nomePdm || '')
              if (pa !== pb) return pa.localeCompare(pb)
              return String(a.row.descricaoItem || '').localeCompare(String(b.row.descricaoItem || ''))
            })

          const itemsPaged = scored.slice((pagina - 1) * limite, (pagina - 1) * limite + limite).map((s) => s.row)

          // gerar filtros sugeridos a partir dos top 200 scores
          const top = scored.slice(0, 200).map((s) => s.row)
          const countMap = (arr: PrismaCatmatRow[], key: keyof PrismaCatmatRow) => {
            const map = new Map<any, number>()
            for (const r of arr) {
              const v = (r as any)[key]
              map.set(v, (map.get(v) || 0) + 1)
            }
            return [...map.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])
          }

          return {
            items: itemsPaged.map(toSeed) as unknown as BuscaResultado['items'],
            total,
            pagina,
            totalPaginas: Math.max(1, Math.ceil(total / limite)),
            filtrosSugeridos: {
              grupos: countMap(top, 'codigoGrupo'),
              classes: countMap(top, 'codigoClasse'),
              pdms: countMap(top, 'codigoPdm'),
            },
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
}

export type { BuscaFiltros, BuscaParams, BuscaResultado }
