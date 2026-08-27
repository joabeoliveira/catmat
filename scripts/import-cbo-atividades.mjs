// scripts/import-cbo-atividades.mjs
// Importa as atividades do perfil ocupacional (CBO 2002) a partir do CSV cbo2002-perfilocupacional.csv.
// Fontes do CSV (em ordem de prioridade):
//   1. Caminho local passado como argumento: npm run import:cbo-atividades -- dados/salarios/cbo2002-perfilocupacional.csv
//   2. MinIO (produção) quando MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY existirem:
//      npm run import:cbo-atividades
//   3. Fallback: data/cbo_perfilocupacional.csv
//
// Formato do CSV: separador ponto e vírgula; colunas:
// COD_GRANDE_GRUPO,COD_SUBGRUPO_PRINCIPAL,COD_SUBGRUPO,COD_FAMILIA,COD_OCUPACAO,
// SGL_GRANDE_AREA,NOME_GRANDE_AREA,COD_ATIVIDADE,NOME_ATIVIDADE
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = path.join(rootDir, 'dados', 'salarios', 'cbo2002-perfilocupacional.csv')
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '007_cbo_atividades_referencia.sql')

const prisma = new PrismaClient()

const COLUNAS = [
  'cbo',
  'familiaCbo',
  'codigoAtividade',
  'nomeAtividade',
  'siglaGrandeArea',
  'grandeArea',
  'grandeGrupoCodigo',
  'subgrupoPrincipalCodigo',
  'subgrupoCodigo',
  'familiaCodigo',
  'fonte',
]

// ---------- Parser CSV (delimitador ponto e vírgula + aspas) ----------
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function codigo(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isInteger(parsed) ? parsed : null
}

function texto(value) {
  return String(value ?? '').trim()
}

function normalizeRow(headers, values) {
  const rowObj = Object.fromEntries(headers.map((header, index) => [normalizeHeader(header), values[index] ?? '']))

  // Number() remove zeros à esquerda — casa com SalarioCbo.cbo (família) e
  // SalarioCboOcupacao.cbo (ocupação), que armazenam os códigos como Int sem pad.
  const cbo = codigo(rowObj['COD_OCUPACAO'])
  const familiaCbo = codigo(rowObj['COD_FAMILIA'])
  const codigoAtividade = codigo(rowObj['COD_ATIVIDADE'])
  const nomeAtividade = texto(rowObj['NOME_ATIVIDADE'])
  if (cbo === null || familiaCbo === null || codigoAtividade === null || !nomeAtividade) return null

  return {
    cbo,
    familiaCbo,
    codigoAtividade,
    nomeAtividade,
    siglaGrandeArea: texto(rowObj['SGL_GRANDE_AREA']),
    grandeArea: texto(rowObj['NOME_GRANDE_AREA']),
    grandeGrupoCodigo: codigo(rowObj['COD_GRANDE_GRUPO']) ?? 0,
    subgrupoPrincipalCodigo: codigo(rowObj['COD_SUBGRUPO_PRINCIPAL']) ?? 0,
    subgrupoCodigo: codigo(rowObj['COD_SUBGRUPO']) ?? 0,
    familiaCodigo: familiaCbo,
    fonte: 'CBO 2002 — perfil ocupacional (MTE)',
  }
}

// ---------- MinIO (opcional) ----------
async function baixarCsvDoMinio() {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket = process.env.MINIO_BUCKET || 'catmat-dados'
  const key = process.env.MINIO_CBO_ATIVIDADES_KEY || 'cbo2002-perfilocupacional.csv'

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
  return { buffer: Buffer.concat(chunks), name: key }
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

// ---------- Inserção (upsert por cbo + siglaGrandeArea + codigoAtividade) ----------
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
    .filter((column) => column !== 'cbo' && column !== 'siglaGrandeArea' && column !== 'codigoAtividade')
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(', ')

  const sql = `
    INSERT INTO "SalarioCboAtividade" (${COLUNAS.map((c) => `"${c}"`).join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT ("cbo", "siglaGrandeArea", "codigoAtividade")
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

  const encoding = process.env.CBO_ATIVIDADES_IMPORT_ENCODING || 'latin1'
  const maxBatch = Math.floor(32767 / COLUNAS.length)
  const batchSize = Math.min(maxBatch, Math.max(1, Number(process.env.CBO_ATIVIDADES_IMPORT_BATCH_SIZE || 2000)))

  let inputPath = process.argv[2]
  let tempPath = null

  if (!inputPath) {
    const minio = await baixarCsvDoMinio()
    if (minio) {
      tempPath = path.join(os.tmpdir(), `cbo-atividades-${Date.now()}.csv`)
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
      'Passe o caminho do CSV como argumento (ex.: npm run import:cbo-atividades -- dados/salarios/cbo2002-perfilocupacional.csv)\n' +
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
        console.log(`Importados ${imported} registros de atividades...`)
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
  console.log(`✅ Importação de atividades CBO concluída: ${imported} registros, ${skipped} ignorados, ${processed} linhas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar atividades CBO:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
