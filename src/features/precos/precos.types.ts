import { z } from 'zod'
import { compraItemSchema, metricasPrecoSchema } from './precos.schema'

export type CompraItem = z.infer<typeof compraItemSchema>
export type MetricasPreco = z.infer<typeof metricasPrecoSchema>

export interface FiltrosPreco {
  dataCompraInicio?: string
  dataCompraFim?: string
  codigoUasg?: string
  estado?: string
  codigoMunicipio?: number
}

export interface PrecoItemCompleto {
  compras: CompraItem[]
  metricas: MetricasPreco
  unidadesDisponiveis: {
    sigla: string
    nome: string
    capacidade?: number
  }[]
}

export interface EspurgoResultado {
  precosFiltrados: number[]
  outliers: number[]
  precoSugerido: number
  novaMedia: number
  novoDesvioPadrao: number
}