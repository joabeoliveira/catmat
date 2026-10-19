import * as XLSX from 'xlsx'
import type { PcaParseResult, PcaSourceRow } from './pca.types'

const HEADER_ALIASES: Record<string, string[]> = {
  description: ['OBJETO', 'DESCRICAO', 'DESCRIÇÃO', 'ITEM', 'PRODUTO', 'SERVICO', 'SERVIÇO'],
  unit: ['UNIDADE', 'UND', 'UNIDADE DE FORNECIMENTO'],
  quantity: ['QUANTIDADE', 'QTD', 'QUANT'],
  className: ['CLASSE', 'CLASSIFICAÇÃO', 'CLASSIFICACAO', 'TIPO'],
}

function keyOf(value: unknown) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
}

function matchingHeader(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw || /:\s*$/.test(raw)) return null
  const key = keyOf(value)
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => keyOf(alias) === key || key.includes(keyOf(alias)))) return field
  }
  return null
}

function asText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function asQuantity(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = asText(value).replace(/\./g, '').replace(',', '.')
  const found = text.match(/-?\d+(?:\.\d+)?/)
  if (!found) return undefined
  const number = Number(found[0])
  return Number.isFinite(number) ? number : undefined
}

export function parsePcaBuffer(buffer: Buffer, fileName: string): PcaParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false })
  const items: PcaSourceRow[] = []
  const warnings: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: null, raw: false })
    let headerIndex = -1
    let columns = new Map<string, number>()

    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 80); rowIndex += 1) {
      const candidate = new Map<string, number>()
      ;(rows[rowIndex] || []).forEach((value, columnIndex) => {
        const field = matchingHeader(value)
        if (field && !candidate.has(field)) candidate.set(field, columnIndex)
      })
      if (candidate.has('description') && candidate.size >= 2) {
        headerIndex = rowIndex
        columns = candidate
        break
      }
    }

    if (headerIndex < 0) {
      warnings.push(`Aba "${sheetName}" ignorada: cabeçalho de descrição não localizado.`)
      continue
    }

    const header = rows[headerIndex] || []
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const values = rows[rowIndex] || []
      const description = asText(values[columns.get('description') ?? -1])
      if (!description || /^descri[cç][aã]o:?$/i.test(description) || /^breve identifica/i.test(description)) continue
      const originalRow: Record<string, unknown> = {}
      header.forEach((name, index) => {
        const label = asText(name) || `COLUNA_${index + 1}`
        originalRow[label] = values[index] ?? null
      })
      items.push({
        sourceSheet: sheetName,
        sourceRow: rowIndex + 1,
        originalRow,
        description,
        unit: asText(values[columns.get('unit') ?? -1]) || undefined,
        quantity: asQuantity(values[columns.get('quantity') ?? -1]),
        className: asText(values[columns.get('className') ?? -1]) || undefined,
      })
    }
  }

  if (!items.length && !warnings.length) warnings.push(`Nenhum item encontrado em ${fileName}.`)
  return { items, sheets: workbook.SheetNames, warnings }
}
