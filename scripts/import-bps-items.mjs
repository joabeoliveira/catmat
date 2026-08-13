import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = '/app/dados-importacao/bps.CSV'
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '003_bps_referencia.sql')

const prisma = new PrismaClient()

const columns = [
  'codigo_compra',
  'codigo_catmat',
  'descricao_catmat',
  'unidade_fornecimento',
  'data_homologacao',
  'modalidade_compra',
  'cnpj_fabricante',
  'fabricante',
  'cnpj_fornecedor',
  'fornecedor',
  'cnpj_comprador',
  'nome_instituicao',
  'uf',
  'nome_municipio',
  'valor_item_compra',
  'quantidade_item_compra',
  'valor_total_compra',
  'observacoes',
  'seq_compra_item',
  'fonte_arquivo',
]

const headerMap = {
  'Código Compra': 'codigo_compra',
  'Código CATMAT': 'codigo_catmat',
  'Descrição Catmat': 'descricao_catmat',
  'Unidade Fornecimento': 'unidade_fornecimento',
  'Data Homologação': 'data_homologacao',
  'Modalidade Compra': 'modalidade_compra',
  'CNPJ Fabricante': 'cnpj_fabricante',
  Fabricante: 'fabricante',
  'CNPJ Fornecedor': 'cnpj_fornecedor',
  Fornecedor: 'fornecedor',
  'CNPJ Comprador': 'cnpj_comprador',
  'Nome Instituição': 'nome_instituicao',
  UF: 'uf',
  'Nome Município': 'nome_municipio',
  'Valor Item Compra': 'valor_item_compra',
  'Quantidade Item Compra': 'quantidade_item_compra',
  'Valor Total Compra': 'valor_total_compra',
  Observações: 'observacoes',
  'Seq. Compra Item': 'seq_compra_item',
}

const normalizedHeaderMap = Object.fromEntries(
  Object.entries(headerMap).map(([header, column]) => [normalizeHeader(header), column]),
)

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ';' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function emptyToNull(value) {
  const text = String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u0096/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text : null
}

function parseDecimal(value) {
  const text = emptyToNull(value)
  if (!text) return null
  const normalized = text
    .replace(/^R\$\s*/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateBr(value) {
  const text = emptyToNull(value)
  if (!text) return null
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function normalizeRow(headers, values, sourceFile) {
  const row = Object.fromEntries(headers.map((header, index) => [normalizedHeaderMap[normalizeHeader(header)] || header, values[index] ?? '']))
  const mapped = {}

  for (const dbColumn of Object.values(headerMap)) {
    mapped[dbColumn] = emptyToNull(row[dbColumn])
  }

  mapped.data_homologacao = parseDateBr(mapped.data_homologacao)
  mapped.valor_item_compra = parseDecimal(mapped.valor_item_compra)
  mapped.quantidade_item_compra = parseDecimal(mapped.quantidade_item_compra)
  mapped.valor_total_compra = parseDecimal(mapped.valor_total_compra)
  mapped.uf = mapped.uf?.slice(0, 2).toUpperCase() ?? null
  mapped.fonte_arquivo = path.basename(sourceFile)

  return mapped.seq_compra_item && mapped.codigo_compra && mapped.descricao_catmat ? mapped : null
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function ensureSchema() {
  const sql = fs.readFileSync(setupSqlPath, 'utf8')
  for (const statement of splitSqlStatements(sql)) {
    await prisma.$executeRawUnsafe(statement)
  }
}

async function insertBatch(batch) {
  if (!batch.length) return

  const values = []
  const tuples = batch.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      values.push(row[column] ?? null)
      return `$${rowIndex * columns.length + columnIndex + 1}`
    })
    return `(${placeholders.join(', ')})`
  })

  const updateColumns = columns
    .filter((column) => column !== 'seq_compra_item')
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ')

  const sql = `
    INSERT INTO bps_itens_referencia (${columns.join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT (seq_compra_item)
    DO UPDATE SET ${updateColumns}, importado_em = now()
  `

  await prisma.$executeRawUnsafe(sql, ...values)
}

async function main() {
  const inputPath = process.argv[2] || defaultFile
  const batchSize = Number(process.env.BPS_IMPORT_BATCH_SIZE || 1000)
  const encoding = process.env.BPS_IMPORT_ENCODING || 'latin1'

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao esta definida.')
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo nao encontrado: ${inputPath}`)
  }

  await ensureSchema()

  const stream = fs.createReadStream(inputPath, { encoding })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let headers = null
  let batch = []
  let processed = 0
  let imported = 0
  let skipped = 0
  const startedAt = Date.now()

  for await (const line of rl) {
    if (!line.trim()) continue

    if (!headers) {
      headers = parseCsvLine(line)
      continue
    }

    processed += 1
    const row = normalizeRow(headers, parseCsvLine(line), inputPath)
    if (!row) {
      skipped += 1
      continue
    }

    batch.push(row)
    if (batch.length >= batchSize) {
      await insertBatch(batch)
      imported += batch.length
      batch = []
      if (imported % (batchSize * 10) === 0) {
        console.log(`Importados ${imported} registros BPS...`)
      }
    }
  }

  if (batch.length) {
    await insertBatch(batch)
    imported += batch.length
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`Importacao BPS concluida: ${imported} importados, ${skipped} ignorados, ${processed} linhas processadas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar BPS:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
