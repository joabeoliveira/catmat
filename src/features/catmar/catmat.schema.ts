import { z } from 'zod'

export const catmatItemSchema = z.object({
  codigoItem: z.number().int(),
  codigoGrupo: z.number().int(),
  nomeGrupo: z.string(),
  codigoClasse: z.number().int(),
  nomeClasse: z.string(),
  codigoPdm: z.number().int(),
  nomePdm: z.string(),
  descricaoItem: z.string(),
  codigoNcm: z.string().nullable(),
  aplicaMargemPreferencia: z.boolean(),
  dataHoraAtualizacao: z.union([z.date(), z.string()]),
  compatibilidade: z.number().optional(),
  faixa: z.enum(['exato', 'alta', 'similar']).optional(),
})

export const buscaParamsSchema = z.object({
  termo: z.string().max(200, 'Termo de busca muito longo').default(''),
  filtros: z.object({
    codigoGrupo: z.array(z.number().int()).optional(),
    codigoClasse: z.array(z.number().int()).optional(),
    codigoPdm: z.array(z.number().int()).optional(),
    statusItem: z.boolean().optional(),
    aplicaMargemPreferencia: z.boolean().optional(),
  }).optional(),
  pagina: z.number().int().min(1).default(1),
  limite: z.number().int().min(1).max(100).default(20),
})

export const sugestaoSchema = z.object({
  q: z.string().max(200).optional(),
})

export const precosRequestSchema = z.object({
  codigoItem: z.number().int().optional(),
  precos: z.array(z.number()).optional(),
  periodoInicio: z.string().optional().nullable(),
  periodoFim: z.string().optional().nullable(),
})
