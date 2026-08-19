import { z } from 'zod'

export const compraItemSchema = z.object({
  idCompra: z.number().int(),
  idItemCompra: z.number().int(),
  numeroItemCompra: z.number().int(),
  codigoItemCatalogo: z.number().int(),
  dataCompra: z.string(),
  dataResultado: z.string().optional(),
  modalidade: z.number().int().optional(),
  forma: z.string().optional(),
  criterioJulgamento: z.string().optional(),
  niFornecedor: z.string().optional(),
  nomeFornecedor: z.string().optional(),
  quantidade: z.number(),
  precoUnitario: z.number(),
  percentualMaiorDesconto: z.number().optional(),
  siglaUnidadeFornecimento: z.string().optional(),
  nomeUnidadeFornecimento: z.string().optional(),
  capacidadeUnidadeFornecimento: z.number().optional(),
  siglaUnidadeMedida: z.string().optional(),
  codigoUasg: z.string().optional(),
  nomeUasg: z.string().optional(),
  estado: z.string().optional(),
  municipio: z.string().optional(),
})

export const metricasPrecoSchema = z.object({
  media: z.number(),
  mediana: z.number(),
  menor: z.number(),
  maior: z.number(),
  amostras: z.number(),
  desvioPadrao: z.number().optional(),
})
