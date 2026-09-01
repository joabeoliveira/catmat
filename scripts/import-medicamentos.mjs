// Importa medicamentos CATMAT do CSV local ou do MinIO.
// Uso local: npm run import:medicamentos -- dados/tabela_medicamentos_catmat.csv
// Uso MinIO: npm run import:medicamentos
// Variaveis MinIO: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
// MINIO_BUCKET (default: diversos), MINIO_MEDICAMENTOS_KEY

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = path.join(rootDir, 'dados', 'tabela_medicamentos_catmat.csv')
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '008_medicamentos_catmat_referencia.sql')

const prisma = new PrismaClient()
const COLUNAS = ['codigoBr', 'catmat', 'principioAtivo', 'concentracao', 'formaFarmaceutica', 'unidadeFornecimento']

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

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeRow(headers, values) {
  const row = Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), values[index] ?? '']))
  const codigoBr = String(row.codigo_br || row.odigo_br || '').trim().toUpperCase()
  const catmat = Number(String(row.catmat || '').trim())
  const principioAtivo = String(row.principio_ativo || '').trim()
  const concentracao = String(row.concentracao || '').trim()
  const formaFarmaceutica = String(row.forma_farmaceutica || '').trim()
  const unidadeFornecimento = String(row.unidade_fornecimento || '').trim()

  if (!codigoBr || !Number.isInteger(catmat) || catmat <= 0 || !principioAtivo) return null

  return { codigoBr, catmat, principioAtivo, concentracao, formaFarmaceutica, unidadeFornecimento }
}

async function baixarCsvDoMinio() {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket = process.env.MINIO_BUCKET || 'diversos'
  const key = process.env.MINIO_MEDICAMENTOS_KEY || 'tabela_medicamentos_catmat.csv'
  if (!endpoint || !accessKey || !secretKey) return null

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
  return { buffer: Buffer.concat(chunks), name: key, bucket }
}

function splitSqlStatements(sql) {
  return sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean)
}

async function ensureSchema() {
  const sql = fs.readFileSync(setupSqlPath, 'utf8')
  for (const statement of splitSqlStatements(sql)) await prisma.$executeRawUnsafe(statement)
}

async function insertBatch(batch) {
  if (!batch.length) return 0
  // O PostgreSQL rejeita um INSERT ... ON CONFLICT quando o mesmo valor
  // da chave única aparece mais de uma vez no conjunto de valores. O CSV
  // pode conter duplicidades de codigo_br; neste caso, prevalece a última
  // ocorrência do lote.
  const unicos = [...new Map(batch.map((row) => [row.codigoBr, row])).values()]
  const values = []
  const tuples = unicos.map((row, rowIndex) => {
    const placeholders = COLUNAS.map((column, columnIndex) => {
      values.push(row[column] ?? null)
      return `$${rowIndex * COLUNAS.length + columnIndex + 1}`
    })
    return `(${placeholders.join(', ')})`
  })
  const updateColumns = COLUNAS
    .filter((column) => column !== 'codigoBr')
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(', ')
  const sql = `
    INSERT INTO "MedicamentoCatmat" (${COLUNAS.map((column) => `"${column}"`).join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT ("codigoBr") DO UPDATE SET ${updateColumns}, "atualizadoEm" = now()
  `
  await prisma.$executeRawUnsafe(sql, ...values)
  return unicos.length
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL nao esta definida.')
  const batchSize = Math.min(Math.max(100, Number(process.env.MEDICAMENTOS_IMPORT_BATCH_SIZE || 1000)), 5000)
  let inputPath = process.argv[2]
  let tempPath = null

  if (!inputPath) {
    const minio = await baixarCsvDoMinio()
    if (minio) {
      tempPath = path.join(os.tmpdir(), `medicamentos-${Date.now()}.csv`)
      fs.writeFileSync(tempPath, minio.buffer)
      inputPath = tempPath
      console.log(`📦 CSV baixado do MinIO: ${minio.bucket}/${minio.name} (${(minio.buffer.length / 1024 / 1024).toFixed(1)} MiB)`)
    } else {
      inputPath = defaultFile
    }
  }

  if (!fs.existsSync(inputPath)) throw new Error(`Arquivo nao encontrado: ${inputPath}`)
  await ensureSchema()

  const rl = readline.createInterface({ input: fs.createReadStream(inputPath, { encoding: 'utf8' }), crlfDelay: Infinity })
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
      if (imported % (batchSize * 10) === 0) console.log(`Importados ${imported} medicamentos...`)
    }
  }
  if (batch.length) imported += await insertBatch(batch)
  if (tempPath) fs.rmSync(tempPath, { force: true })

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`✅ Importação de medicamentos concluída: ${imported} registros, ${skipped} ignorados, ${processed} linhas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar medicamentos:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
