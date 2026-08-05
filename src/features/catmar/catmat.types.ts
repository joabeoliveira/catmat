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

export interface BuscaResultado {
  items: CatmatItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos?: {
    grupos: number[]
    classes: number[]
  }
}

// Mantém compatibilidade sem referência direta a `prisma`.
export type BuscaItem = CatmatItem;