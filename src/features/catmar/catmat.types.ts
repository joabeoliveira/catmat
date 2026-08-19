import { z } from 'zod'
import { catmatItemSchema } from './catmat.schema'

export type CatmatItem = z.infer<typeof catmatItemSchema>

export interface BuscaFiltros {
  codigoGrupo?: number[]
  codigoClasse?: number[]
  codigoPdm?: number[]
  statusItem?: boolean
  aplicaMargemPreferencia?: boolean
}

export interface BuscaParams {
  termo: string
  filtros?: BuscaFiltros
  pagina?: number
  limite?: number
}

export interface FiltroFacetado {
  codigo: number
  nome: string
  quantidade: number
}

export interface ContagensCompatibilidade {
  exato: number
  alta: number
  similar: number
}

export interface BuscaResultado {
  items: CatmatItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos?: {
    grupos: FiltroFacetado[]
    classes: FiltroFacetado[]
    pdms?: FiltroFacetado[]
  }
  contagens?: ContagensCompatibilidade
}

export interface BuscaItem extends CatmatItem {
  compatibilidade?: number
  faixa?: 'exato' | 'alta' | 'similar'
}
