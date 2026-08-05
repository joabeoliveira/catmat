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
  dataHoraAtualizacao: z.date()
})

export const buscaParamsSchema = z.object({
  termo: z.string().min(1, 'Termo de busca obrigatório'),
  filtros: z.object({
    codigoGrupo: z.array(z.number().int()).optional(),
    codigoClasse: z.array(z.number().int()).optional(),
    codigoPdm: z.array(z.number().int()).optional(),
    statusItem: z.boolean().optional(),
    aplicaMargemPreferencia: z.boolean().optional()
  }).optional(),
  pagina: z.number().int().min(1).default(1),
  limite: z.number().int().min(1).max(100).default(20)
})