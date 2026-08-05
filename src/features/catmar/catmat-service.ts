import { catmatMockData, type CatmatItemSeed } from './mock-data'

export interface BuscaFiltros {
  codigoGrupo?: number[]
  codigoClasse?: number[]
  codigoPdm?: number[]
  aplicaMargemPreferencia?: boolean
}

export interface BuscaParams {
  termo: string
  filtros?: BuscaFiltros
  pagina?: number
  limite?: number
}

export interface BuscaResultado {
  items: CatmatItemSeed[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos: {
    grupos: number[]
    classes: number[]
  }
}

export class CatmatService {
  async buscarItens(params: BuscaParams): Promise<BuscaResultado> {
    const termo = String(params.termo || '').trim().toLowerCase()
    const pagina = Number(params.pagina || 1)
    const limite = Number(params.limite || 20)

    const filtrado = catmatMockData.filter((item) => {
      const texto = `${item.descricaoItem} ${item.nomePdm} ${item.nomeClasse} ${item.nomeGrupo}`.toLowerCase()
      const bateTermo = !termo || texto.includes(termo)
      const bateGrupo = !params?.filtros?.codigoGrupo?.length || params.filtros.codigoGrupo.includes(item.codigoGrupo)
      const bateClasse = !params?.filtros?.codigoClasse?.length || params.filtros.codigoClasse.includes(item.codigoClasse)
      const batePdm = !params?.filtros?.codigoPdm?.length || params.filtros.codigoPdm.includes(item.codigoPdm)
      const bateMargem = params?.filtros?.aplicaMargemPreferencia === undefined || item.aplicaMargemPreferencia === params.filtros.aplicaMargemPreferencia

      return bateTermo && bateGrupo && bateClasse && batePdm && bateMargem
    })

    const total = filtrado.length
    const start = (pagina - 1) * limite
    const end = start + limite

    return {
      items: filtrado.slice(start, end),
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
      filtrosSugeridos: {
        grupos: [...new Set(filtrado.map((item) => item.codigoGrupo))],
        classes: [...new Set(filtrado.map((item) => item.codigoClasse))],
      },
    }
  }
}
