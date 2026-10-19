import type { PcaAttributes, PcaCatalogType, PcaCanonicalGroup, PcaNormalizedItem, PcaSourceRow } from './pca.types'

const ADMINISTRATIVE_PATTERNS = [
  /em conformidade com[^,;]*[,;]?/gi,
  /\bconforme (?:a )?lei[^,;]*[,;]?/gi,
  /nos termos da lei[^,;]*[,;]?/gi,
  /a fim de atender[^,;]*[,;]?/gi,
  /para atender[^,;]*[,;]?/gi,
  /em atendimento [^,;]*[,;]?/gi,
  /conforme justificativa[^,;]*[,;]?/gi,
  /visando (?:a|à) [^.;]*[.;]?/gi,
  /registro de pre[cç]os[^,.;]*/gi,
]

const SERVICE_WORDS = /\b(servi[cç]o|manuten[cç][aã]o|instala[cç][aã]o|loca[cç][aã]o|hora t[eé]cnica|consultoria|contrata[cç][aã]o de empresa)\b/i
const WORK_WORDS = /\b(obras?|reforma|pavimenta[cç][aã]o|constru[cç][aã]o civil|engenharia)\b/i

function cleanText(value: string) {
  let text = value.normalize('NFC').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  for (const pattern of ADMINISTRATIVE_PATTERNS) text = text.replace(pattern, ' ')
  return text.replace(/\s+([,.;:])/g, '$1').replace(/[,.;:]{2,}/g, '.').replace(/\s+/g, ' ').trim()
}

function uniqueMatches(text: string, pattern: RegExp) {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[0].toLowerCase().replace(/\s+/g, ' ').trim()))]
}

function attributesOf(text: string): PcaAttributes {
  return {
    quantities: uniqueMatches(text, /\b\d+(?:[.,]\d+)?\s*(?:unidades?|un|kg|g|mg|l|ml|cx|caixas?|pacotes?|p[aá]ginas?)\b/gi),
    measures: uniqueMatches(text, /\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|g|kg|mg|l|ml|litros?|polegadas?)\b/gi),
    concentrations: uniqueMatches(text, /\b\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|%|mg\/ml|g\/l)\b/gi),
    voltages: uniqueMatches(text, /\b\d+(?:[.,]\d+)?\s*(?:v|volts?|hz|w|watts?)\b/gi),
    dimensions: uniqueMatches(text, /\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m)?\b/gi),
    packaging: uniqueMatches(text, /\b(?:caixa|pacote|embalagem|fardo|kit|frasco|ampola|lata)\s*(?:com\s*)?\d*\s*[a-z0-9]*\b/gi),
    technicalTokens: [...new Set((text.toLowerCase().match(/[a-zà-ÿ0-9]{3,}/gi) || []).filter((token) => !/^(para|com|sem|uma|uns|dos|das|por|que|não|nao)$/.test(token)))].slice(0, 80),
  }
}

function catalogType(text: string, className?: string): PcaCatalogType {
  const combined = `${text} ${className || ''}`
  if (WORK_WORDS.test(combined)) return 'OBRA'
  if (SERVICE_WORDS.test(combined) || /servi[cç]os? de terceiros/i.test(combined)) return 'CATSER'
  if (/material|produto|aquisi[cç][aã]o|fornecimento|medicamento|alimento|equipamento/i.test(combined)) return 'CATMAT'
  return 'INDEFINIDO'
}

export function normalizePcaRow(row: PcaSourceRow): PcaNormalizedItem {
  const normalizedDescription = cleanText(row.description)
  const attributes = attributesOf(normalizedDescription)
  const canonicalTerm = normalizedDescription.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  return {
    ...row,
    originalDescription: row.description,
    normalizedDescription,
    canonicalTerm,
    catalogType: catalogType(normalizedDescription, row.className),
    attributes,
  }
}

export function normalizePcaRows(rows: PcaSourceRow[]) {
  return rows.map(normalizePcaRow)
}

export function groupByCanonicalTerm(items: PcaNormalizedItem[]): PcaCanonicalGroup[] {
  const groups = new Map<string, PcaNormalizedItem[]>()
  for (const item of items) {
    const current = groups.get(item.canonicalTerm) || []
    current.push(item)
    groups.set(item.canonicalTerm, current)
  }
  return [...groups.entries()].map(([canonicalTerm, groupedItems]) => ({ canonicalTerm, items: groupedItems }))
}
