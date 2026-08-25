// scripts/import-salarios.mjs
// Importa salários por CBO/UF a partir do CSV salariosBrasil_INPC.csv (base anual 2023..2026).
// Fontes do CSV (em ordem de prioridade):
//   1. Caminho local passado como argumento: npm run import:salarios -- dados/salariosBrasil_INPC.csv
//   2. MinIO (produção) quando MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY existirem:
//      npm run import:salarios
//   3. Fallback: dados/salariosBrasil_INPC.csv
//
// Formato do CSV: separador vírgula, decimal vírgula (pt-BR), campo CBO = "codigo - descricao",
// colunas: Estado,UF,CBO,Salario_2023,Salario_2024,Salario_2025,Salario_2026
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = path.join(rootDir, 'dados', 'salariosBrasil_INPC.csv')
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '005_salarios_referencia.sql')

const prisma = new PrismaClient()

const COLUNAS = ['uf', 'estado', 'cbo', 'titulo', 'salario2023', 'salario2024', 'salario2025', 'salario2026']

// ---------- Parser CSV (delimitador vírgula + aspas + decimal vírgula) ----------
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
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

// Decimal pt-BR ("1968,63", "11745,8", "1879") -> number
function parseDecimal(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const normalized = text
    .replace(/^R\$\s*/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

// Campo CBO = "1130 - Dirigentes de povos indígenas..." -> { codigo: 1130, titulo: "Dirigentes..." }
function parseCboField(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{1,8})\s*[-–—]?\s*(.*)$/)
  if (!match) return { codigo: null, titulo: text }
  const codigo = Number(match[1])
  const titulo = match[2].trim()
  return { codigo: Number.isFinite(codigo) ? codigo : null, titulo: titulo || text }
}

function normalizeRow(headers, values) {
  const rowObj = Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), values[index] ?? '']))

  const uf = String(rowObj['UF'] || '').trim().toUpperCase().slice(0, 2)
  const estado = String(rowObj['ESTADO'] || '').trim()
  const { codigo, titulo } = parseCboField(rowObj['CBO'])

  if (!uf || !estado || !codigo || !titulo) return null

  return {
    uf,
    estado,
    cbo: codigo,
    titulo,
    salario2023: parseDecimal(rowObj['SALARIO2023'] ?? rowObj['SALARIO 2023'] ?? rowObj['SALARIO_2023']),
    salario2024: parseDecimal(rowObj['SALARIO2024'] ?? rowObj['SALARIO 2024'] ?? rowObj['SALARIO_2024']),
    salario2025: parseDecimal(rowObj['SALARIO2025'] ?? rowObj['SALARIO 2025'] ?? rowObj['SALARIO_2025']),
    salario2026: parseDecimal(rowObj['SALARIO2026'] ?? rowObj['SALARIO 2026'] ?? rowObj['SALARIO_2026']),
  }
}

// ---------- MinIO (opcional) ----------
async function baixarCsvDoMinio() {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket = process.env.MINIO_BUCKET || 'catmat-dados'
  const key = process.env.MINIO_CSV_KEY || 'salariosBrasil_INPC.csv'

  if (!endpoint || !accessKey || !secretKey) return null

  // Import dinâmico: só exige @aws-sdk/client-s3 quando o MinIO for usado
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const chunks = []
  for await (const chunk of response.Body) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  return { buffer, name: key }
}

// ---------- Schema (tabela + índices) ----------
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

// ---------- Inserção (upsert por uf+cbo) ----------
async function insertBatch(batch) {
  if (!batch.length) return 0

  const values = []
  const tuples = batch.map((row, rowIndex) => {
    const placeholders = COLUNAS.map((column, columnIndex) => {
      values.push(row[column] ?? null)
      return `$${rowIndex * COLUNAS.length + columnIndex + 1}`
    })
    return `(${placeholders.join(', ')})`
  })

  const updateColumns = COLUNAS
    .filter((column) => column !== 'uf' && column !== 'cbo')
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(', ')

  const sql = `
    INSERT INTO "SalarioCbo" (${COLUNAS.map((c) => `"${c}"`).join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT ("uf", "cbo")
    DO UPDATE SET ${updateColumns}
  `

  await prisma.$executeRawUnsafe(sql, ...values)
  return batch.length
}

// ---------- Main ----------
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao esta definida.')
  }

  const encoding = process.env.SALARIOS_IMPORT_ENCODING || 'utf8'
  const batchSize = Number(process.env.SALARIOS_IMPORT_BATCH_SIZE || 1000)

  let inputPath = process.argv[2]
  let tempPath = null

  if (!inputPath) {
    const minio = await baixarCsvDoMinio()
    if (minio) {
      tempPath = path.join(os.tmpdir(), `salarios-${Date.now()}.csv`)
      fs.writeFileSync(tempPath, minio.buffer)
      inputPath = tempPath
      console.log(`📦 CSV baixado do MinIO: ${minio.name} (${(minio.buffer.length / 1024 / 1024).toFixed(1)} MiB)`)
    } else {
      inputPath = defaultFile
    }
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Arquivo nao encontrado: ${inputPath}\n` +
      'Passe o caminho do CSV como argumento (ex.: npm run import:salarios -- dados/salariosBrasil_INPC.csv)\n' +
      'ou configure MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY para baixar do bucket.',
    )
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
    const row = normalizeRow(headers, parseCsvLine(line))
    if (!row) {
      skipped += 1
      continue
    }

    batch.push(row)
    if (batch.length >= batchSize) {
      imported += await insertBatch(batch)
      batch = []
      if (imported % (batchSize * 10) === 0) {
        console.log(`Importados ${imported} registros de salário...`)
      }
    }
  }

  if (batch.length) {
    imported += await insertBatch(batch)
  }

  if (tempPath) {
    fs.rmSync(tempPath, { force: true })
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`✅ Importação de salários concluída: ${imported} registros, ${skipped} ignorados, ${processed} linhas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar salários:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
