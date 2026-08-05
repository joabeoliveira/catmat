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
        orderBy: [
          { codigoGrupo: 'asc' },
          { codigoClasse: 'asc' },
          { codigoPdm: 'asc' },
          { descricaoItem: 'asc' },
        ],
        skip: (pagina - 1) * limite,
        take: limite,
      })

      return {
        items: rows.map(toSeed) as unknown as BuscaResultado['items'],
        total,
        pagina,
        totalPaginas: Math.max(1, Math.ceil(total / limite)),
        filtrosSugeridos: {
          grupos: [...new Set(rows.map((row) => row.codigoGrupo))],
          classes: [...new Set(rows.map((row) => row.codigoClasse))],
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
