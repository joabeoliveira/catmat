import { z } from 'zod'

import type {
  AnpAbrangencia,
  AnpProduto,
  AnpUnidade,
} from './anp.types'

const abrangenciaValues: [AnpAbrangencia, ...AnpAbrangencia[]] = [
  'CAPITAIS',
  'MUNICIPIOS',
  'ESTADOS',
  'REGIOES',
  'BRASIL',
]

const produtoValues: [AnpProduto, ...AnpProduto[]] = [
  'ETANOL_HIDRATADO',
  'GASOLINA_COMUM',
  'GASOLINA_ADITIVADA',
  'OLEO_DIESEL',
  'OLEO_DIESEL_S10',
  'GLP',
  'GNV',
]

const unidadeValues: [AnpUnidade, ...AnpUnidade[]] = [
  'LITRO',
  'TREZE_KG',
  'METRO_CUBICO',
]

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD.')

export const anpFiltrosSchema = z
  .object({
    semanaId: z.string().optional(),
    dataInicio: dataSchema.optional(),
    dataFim: dataSchema.optional(),
    abrangencia: z.enum(abrangenciaValues).optional(),
    produto: z.enum(produtoValues).optional(),
    unidade: z.enum(unidadeValues).optional(),
    estado: z.string().length(2).regex(/^[A-Z]{2}$/, 'Informe a UF em letras maiúsculas.').optional(),
    municipio: z.string().optional(),
    regiao: z.string().optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict()
  .refine(
    ({ dataInicio, dataFim }) => !dataInicio || !dataFim || dataInicio <= dataFim,
    { message: 'dataInicio deve ser menor ou igual a dataFim.', path: ['dataInicio'] },
  )

export const anpSincronizarSchema = z
  .object({
    dataInicio: dataSchema.optional(),
    dataFim: dataSchema.optional(),
  })
  .strict()
  .refine(
    ({ dataInicio, dataFim }) => Boolean(dataInicio) === Boolean(dataFim),
    { message: 'dataInicio e dataFim devem ser informadas juntas.', path: ['dataInicio'] },
  )
  .refine(
    ({ dataInicio, dataFim }) => !dataInicio || !dataFim || dataInicio <= dataFim,
    { message: 'dataInicio deve ser menor ou igual a dataFim.', path: ['dataInicio'] },
  )

export const anpSemanaIdSchema = z
  .object({ id: z.string().min(1) })
  .strict()
