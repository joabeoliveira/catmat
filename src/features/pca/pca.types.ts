export type PcaCatalogType = 'CATMAT' | 'CATSER' | 'OBRA' | 'INDEFINIDO'

export interface PcaSourceRow {
  sourceSheet: string
  sourceRow: number
  originalRow: Record<string, unknown>
  description: string
  unit?: string
  quantity?: number
  className?: string
}

export interface PcaAttributes {
  quantities: string[]
  measures: string[]
  concentrations: string[]
  voltages: string[]
  dimensions: string[]
  packaging: string[]
  technicalTokens: string[]
}

export interface PcaNormalizedItem extends PcaSourceRow {
  originalDescription: string
  normalizedDescription: string
  canonicalTerm: string
  catalogType: PcaCatalogType
  attributes: PcaAttributes
}

export interface PcaParseResult {
  items: PcaSourceRow[]
  sheets: string[]
  warnings: string[]
}

export interface PcaCanonicalGroup {
  canonicalTerm: string
  items: PcaNormalizedItem[]
}

export interface PcaChunkResult {
  jobId: string
  processed: number
  nextOffset: number | null
  total: number
  progress: number
  status: string
  errors: number
}
