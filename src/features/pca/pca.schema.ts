import { z } from 'zod'

export const pcaCatalogTypeSchema = z.enum(['CATMAT', 'CATSER', 'OBRA', 'INDEFINIDO'])

export const pcaSourceRowSchema = z.object({
  sourceSheet: z.string().min(1),
  sourceRow: z.number().int().positive(),
  originalRow: z.record(z.unknown()),
  description: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().finite().optional(),
  className: z.string().optional(),
})

export const pcaJobIdSchema = z.object({ id: z.string().min(1).max(128) })

export const pcaChunkRequestSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(25).max(50).default(35),
})

export const pcaAttributesSchema = z.object({
  quantities: z.array(z.string()),
  measures: z.array(z.string()),
  concentrations: z.array(z.string()),
  voltages: z.array(z.string()),
  dimensions: z.array(z.string()),
  packaging: z.array(z.string()),
  technicalTokens: z.array(z.string()),
})
