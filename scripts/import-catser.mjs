import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = '/app/dados-importacao/catser.csv'
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '004_catser_referencia.sql')

const prisma = new PrismaClient()

const columns = [
  'codigoGrupo',
  'nomeGrupo',
  'codigoClasse',
  'nomeClasse',
  'codigoServico',
  'nomeServico',
  'statusServico',
  'fonte_arquivo',
]

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

function parseIntOrNull(value) {
  const text = emptyToNull(value)
  if (!text) return null
  const n = Number(text.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function parseBoolean(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (text === '1' || text === 'true' || text === 'sim' || text === 's') return true
  if (text === '0' || text === 'false' || text === 'nao' || text === 'não' || text === 'n') return false
  return null
}

function normalizeRow(headers, values, sourceFile) {
  const rowObj = Object.fromEntries(headers.map((h, i) => [normalizeHeader(h), values[i] ?? '']))
  const mapped = {
    codigoGrupo: parseIntOrNull(rowObj['CODIGOGRUPO'] ?? rowObj['CODIGO GRUPO'] ?? rowObj['CODIGO_GRUPO']),
    nomeGrupo: emptyToNull(rowObj['NOMEGRUPO'] ?? rowObj['NOME GRUPO'] ?? rowObj['NOME_GRUPO']),
    codigoClasse: emptyToNull(rowObj['CODIGOCLASSE'] ?? rowObj['CODIGO CLASSE'] ?? rowObj['CODIGO_CLASSE']),
    nomeClasse: emptyToNull(rowObj['NOMECLASSE'] ?? rowObj['NOME CLASSE'] ?? rowObj['NOME_CLASSE']),
    codigoServico: parseIntOrNull(rowObj['CODIGOSERVICO'] ?? rowObj['CODIGO SERVICO'] ?? rowObj['CODIGO_SERVICO']),
    nomeServico: emptyToNull(rowObj['NOMESERVICO'] ?? rowObj['NOME SERVICO'] ?? rowObj['NOME_SERVICO']),
    statusServico: parseBoolean(rowObj['STATUSSERVICO'] ?? rowObj['STATUS SERVICO'] ?? rowObj['STATUS_SERVICO']),
    fonte_arquivo: path.basename(sourceFile),
  }

  if (!mapped.codigoServico || !mapped.nomeServico) return null
  return mapped
}

async function ensureSchema() {
  if (!fs.existsSync(setupSqlPath)) return
  const sql = fs.readFileSync(setupSqlPath, 'utf8')
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt)
  }
}

async function insertBatch(batch) {
  if (!batch.length) return 0
  const chunkSize = Number(process.env.CATSER_IMPORT_BATCH_SIZE || 1000)
  let inserted = 0
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize)
    try {
      await prisma.catserItem.createMany({ data: chunk.map((r) => ({
        codigoGrupo: r.codigoGrupo ?? 0,
        nomeGrupo: r.nomeGrupo ?? '',
        codigoClasse: r.codigoClasse ?? '',
        nomeClasse: r.nomeClasse ?? '',
        codigoServico: r.codigoServico ?? 0,
        nomeServico: r.nomeServico ?? '',
        statusServico: r.statusServico ?? false,
      })), skipDuplicates: true })
      inserted += chunk.length
    } catch (e) {
      console.warn('Erro ao inserir chunk CATSER, tentando individualmente...', e)
      for (const row of chunk) {
        try {
          await prisma.catserItem.create({ data: {
            codigoGrupo: row.codigoGrupo ?? 0,
            nomeGrupo: row.nomeGrupo ?? '',
            codigoClasse: row.codigoClasse ?? '',
            nomeClasse: row.nomeClasse ?? '',
            codigoServico: row.codigoServico ?? 0,
            nomeServico: row.nomeServico ?? '',
            statusServico: row.statusServico ?? false,
          }})
          inserted += 1
        } catch (err) {
          // skip problematic row
        }
      }
    }
  }
  return inserted
}

async function main() {
  const inputPath = process.argv[2] || defaultFile
  const batchSize = Number(process.env.CATSER_IMPORT_BATCH_SIZE || 1000)
  const encoding = process.env.CATSER_IMPORT_ENCODING || 'latin1'

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
      imported += await insertBatch(batch)
      batch = []
      if (imported % (batchSize * 10) === 0) {
        console.log(`Importados ${imported} registros CATSER...`)
      }
    }
  }

  if (batch.length) {
    imported += await insertBatch(batch)
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`Importacao CATSER concluida: ${imported} importados, ${skipped} ignorados, ${processed} linhas processadas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar CATSER:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
