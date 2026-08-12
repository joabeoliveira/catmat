import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultFile = '/app/dados-importacao/202608_NFe_NotaFiscalItem.csv'
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '002_nfe_referencia.sql')

const prisma = new PrismaClient()

const columns = [
  'chave_acesso',
  'modelo',
  'serie',
  'numero',
  'natureza_operacao',
  'data_emissao',
  'cpf_cnpj_emitente',
  'razao_social_emitente',
  'inscricao_estadual_emitente',
  'uf_emitente',
  'municipio_emitente',
  'codigo_orgao_superior_destinatario',
  'orgao_superior_destinatario',
  'codigo_orgao_destinatario',
  'orgao_destinatario',
  'cnpj_destinatario',
  'nome_destinatario',
  'uf_destinatario',
  'indicador_ie_destinatario',
  'destino_operacao',
  'consumidor_final',
  'presenca_comprador',
  'numero_produto',
  'descricao_produto_servico',
  'codigo_ncm_sh',
  'ncm_sh',
  'cfop',
  'quantidade',
  'unidade',
  'valor_unitario',
  'valor_total',
  'fonte_arquivo',
]

const headerMap = {
  'CHAVE DE ACESSO': 'chave_acesso',
  MODELO: 'modelo',
  'SÉRIE': 'serie',
  'NÚMERO': 'numero',
  'NATUREZA DA OPERAÇÃO': 'natureza_operacao',
  'DATA EMISSÃO': 'data_emissao',
  'CPF/CNPJ Emitente': 'cpf_cnpj_emitente',
  'RAZÃO SOCIAL EMITENTE': 'razao_social_emitente',
  'INSCRIÇÃO ESTADUAL EMITENTE': 'inscricao_estadual_emitente',
  'UF EMITENTE': 'uf_emitente',
  'MUNICÍPIO EMITENTE': 'municipio_emitente',
  'CÓDIGO ÓRGÃO SUPERIOR DESTINATÁRIO': 'codigo_orgao_superior_destinatario',
  'ÓRGÃO SUPERIOR DESTINATÁRIO': 'orgao_superior_destinatario',
  'CÓDIGO ÓRGÃO DESTINATÁRIO': 'codigo_orgao_destinatario',
  'ÓRGÃO DESTINATÁRIO': 'orgao_destinatario',
  'CNPJ DESTINATÁRIO': 'cnpj_destinatario',
  'NOME DESTINATÁRIO': 'nome_destinatario',
  'UF DESTINATÁRIO': 'uf_destinatario',
  'INDICADOR IE DESTINATÁRIO': 'indicador_ie_destinatario',
  'DESTINO DA OPERAÇÃO': 'destino_operacao',
  'CONSUMIDOR FINAL': 'consumidor_final',
  'PRESENÇA DO COMPRADOR': 'presenca_comprador',
  'NÚMERO PRODUTO': 'numero_produto',
  'DESCRIÇÃO DO PRODUTO/SERVIÇO': 'descricao_produto_servico',
  'CÓDIGO NCM/SH': 'codigo_ncm_sh',
  'NCM/SH (TIPO DE PRODUTO)': 'ncm_sh',
  CFOP: 'cfop',
  QUANTIDADE: 'quantidade',
  UNIDADE: 'unidade',
  'VALOR UNITÁRIO': 'valor_unitario',
  'VALOR TOTAL': 'valor_total',
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
  const text = String(value ?? '').trim()
  return text ? text : null
}

function parseDecimal(value) {
  const text = emptyToNull(value)
  if (!text) return null
  const normalized = text.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateBr(value) {
  const text = emptyToNull(value)
  if (!text) return null
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!match) return null
  const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = match
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss)))
}

function normalizeRow(headers, values, sourceFile) {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  const mapped = {}

  for (const [csvHeader, dbColumn] of Object.entries(headerMap)) {
    mapped[dbColumn] = emptyToNull(row[csvHeader])
  }

  mapped.data_emissao = parseDateBr(mapped.data_emissao)
  mapped.quantidade = parseDecimal(mapped.quantidade)
  mapped.valor_unitario = parseDecimal(mapped.valor_unitario)
  mapped.valor_total = parseDecimal(mapped.valor_total)
  mapped.uf_emitente = mapped.uf_emitente?.slice(0, 2).toUpperCase() ?? null
  mapped.uf_destinatario = mapped.uf_destinatario?.slice(0, 2).toUpperCase() ?? null
  mapped.fonte_arquivo = path.basename(sourceFile)

  return mapped.chave_acesso && mapped.numero_produto && mapped.descricao_produto_servico ? mapped : null
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
    .filter((column) => !['chave_acesso', 'numero_produto'].includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ')

  const sql = `
    INSERT INTO nfe_itens_referencia (${columns.join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT (chave_acesso, numero_produto)
    DO UPDATE SET ${updateColumns}, importado_em = now()
  `

  await prisma.$executeRawUnsafe(sql, ...values)
}

async function main() {
  const inputPath = process.argv[2] || defaultFile
  const batchSize = Number(process.env.NFE_IMPORT_BATCH_SIZE || 1000)

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao esta definida.')
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo nao encontrado: ${inputPath}`)
  }

  await ensureSchema()

  const stream = fs.createReadStream(inputPath, { encoding: 'latin1' })
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
        console.log(`Importados ${imported} registros...`)
      }
    }
  }

  if (batch.length) {
    await insertBatch(batch)
    imported += batch.length
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`Importacao concluida: ${imported} importados, ${skipped} ignorados, ${processed} linhas processadas em ${seconds}s.`)
}

main()
  .catch((error) => {
    console.error('Erro ao importar NF-e:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
