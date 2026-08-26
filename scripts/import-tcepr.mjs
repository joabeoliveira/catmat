// scripts/import-tcepr.mjs
// Importa licitações municipais homologadas (TCE-PR) a partir dos XMLs de LicitacaoVencedor.
// Fontes (em ordem de prioridade):
//   1. Caminho local (arquivo ou pasta) passado como argumento:
//      npm run import:tcepr -- dados/tcepr
//      npm run import:tcepr -- dados/tcepr/2026_410010_LicitacaoVencedor.xml
//   2. MinIO (produção) quando MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY existirem:
//      bucket MINIO_TCEPR_BUCKET (default 'tcepr'), prefixo MINIO_TCEPR_PREFIX (default '2026/')
//   3. Fallback: dados/tcepr/ (todos os *.xml)
//
// Formato: <root><LicitacaoVencedor attr1="..." attr2="..." .../></root>
// PONTO CRÍTICO: o atributo dsItem pode conter aspas duplas internas não escapadas.
// O parser é delimiter-based: o fim de cada valor é o PRÓXIMO nome de atributo conhecido
// (ordem fixa) ou o fechamento '/>', e NÃO a primeira aspa dupla.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const defaultDir = path.join(rootDir, 'data', 'tcepr')
const fallbackDir = path.join(rootDir, 'data')
const setupSqlPath = path.join(rootDir, 'prisma', 'sql', '006_tcepr_referencia.sql')

const prisma = new PrismaClient()

// Colunas da tabela "LicitacaoVencedorTcePr" (ordem do INSERT)
const COLS = [
  'cdIbge', 'nmMunicipio', 'idPessoa', 'nmEntidade', 'idLicitacao', 'nrAnoLicitacao', 'nrLicitacao',
  'dsModalidadeLicitacao', 'dtHomologacao', 'nrDocumento', 'nmPessoa', 'nrLote', 'nrItem', 'dsItem',
  'idUnidadeMedida', 'dsUnidadeMedida', 'nrQuantidade', 'vlMinimoUnitarioItem', 'vlMinimoTotal',
  'vlMaximoUnitarioItem', 'vlMaximoTotal', 'nrQuantidadeProposta', 'vlPropostaItem',
  'nrQuantidadeVencedor', 'vlLicitacaoVencedor', 'nrClassificacao', 'dsFormaPagamento',
  'nrPrazoLimiteEntrega', 'idTipoEntregaProduto', 'dsTipoEntregaProduto', 'dtValidadeProposta',
  'dtPrazoEntregaProposta', 'ultimoEnvioSimam', 'dataReferencia',
]

// Colunas que compõem a chave única (ON CONFLICT)
const CHAVE = ['idLicitacao', 'nrLote', 'nrItem', 'nrDocumento', 'nrClassificacao']

// Ordem FIXA dos atributos no XML <LicitacaoVencedor .../> — usada como delimitador do parser.
const ATRIBUTOS = [
  'cdIBGE', 'nmMunicipio', 'idPessoa', 'nmEntidade', 'idlicitacao', 'nrAnoLicitacao', 'nrLicitacao',
  'dsModalidadeLicitacao', 'nmPessoa', 'nrDocumento', 'nrLote', 'nrItem', 'nrQuantidade',
  'idUnidadeMedida', 'dsUnidadeMedida', 'vlMinimoUnitarioItem', 'vlMinimoTotal',
  'vlMaximoUnitarioitem', 'vlMaximoTotal', 'dsItem', 'dsFormaPagamento', 'nrPrazoLimiteEntrega',
  'idTipoEntregaProduto', 'dsTipoEntregaProduto', 'nrQuantidadePropostaLicitacao',
  'vlPropostaItem', 'dtValidadeProposta', 'dtPrazoEntregaPropostaLicitacao',
  'nrQuantidadeVencedorLicitacao', 'vlLicitacaoVencedorLicitacao', 'nrClassificacao',
  'dtHomologacao', 'ultimoEnvioSIMAMNesteExercicio', 'DataReferencia',
]

// ---------- Parser XML delimiter-based ----------
function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Extrai atributos de uma tag <LicitacaoVencedor ...>. `inner` = conteúdo entre
// "<LicitacaoVencedor" e ">" (sem o nome da tag).
function extrairAtributos(inner) {
  const attrs = {}
  let pos = 0
  for (const nome of ATRIBUTOS) {
    const marker = `${nome}="`
    const start = inner.indexOf(marker, pos)
    if (start === -1) continue
    const valueStart = start + marker.length

    // Fim do valor = próxima ocorrência de qualquer atributo conhecido OU fechamento
    let fim = inner.length
    for (const outro of ATRIBUTOS) {
      const idx = inner.indexOf(`${outro}="`, valueStart)
      if (idx !== -1 && idx < fim) fim = idx
    }
    const fechamento = inner.indexOf('/>', valueStart)
    if (fechamento !== -1 && fechamento < fim) fim = fechamento
    const fechamentoSimples = inner.indexOf('>', valueStart)
    if (fechamentoSimples !== -1 && fechamentoSimples < fim) fim = fechamentoSimples

    // O valor capturado termina com a aspa dupla de fechamento do atributo
    // (o delimitador é o PRÓXIMO nome de atributo, não a 1ª aspa). Remove apenas essa.
    // No último atributo pode sobrar o '/' do self-closing (o '>' fica fora do inner).
    let value = inner.slice(valueStart, fim).trim()
    value = value.replace(/\/+$/, '')
    if (value.endsWith('"')) value = value.slice(0, -1)

    attrs[nome] = value.trim()
    pos = fim
  }
  return attrs
}

// Separa as tags <LicitacaoVencedor .../> completas de um pedaço de texto, devolvendo
// o conteúdo interno de cada uma e o "resto" (possível tag cortada no fim) para a próxima linha.
function parseLicitacoesDoChunk(chunk, buffer) {
  const text = buffer + chunk
  const tags = []
  const re = /<LicitacaoVencedor\b([^>]*)>/g
  let match = null
  let last = 0
  while ((match = re.exec(text)) !== null) {
    tags.push(match[1])
    last = match.index + match[0].length
  }
  return { tags, remainder: text.slice(last) }
}

// ---------- Conversores ----------
function parseNumber(value) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDate(value) {
  if (value == null) return null
  const text = String(value).trim()
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeRow(attrs) {
  const get = (nome) => decodeEntities(attrs[nome])

  const idLicitacao = parseNumber(get('idlicitacao'))
  const nrItem = parseNumber(get('nrItem'))
  const nrDocumento = String(get('nrDocumento') ?? '').trim()
  const nrClassificacao = parseNumber(get('nrClassificacao'))
  const nmMunicipio = String(get('nmMunicipio') ?? '').trim()

  if (!idLicitacao || !nrItem || !nrDocumento || !nrClassificacao || !nmMunicipio) return null

  return {
    cdIbge: String(get('cdIBGE') ?? '').trim() || null,
    nmMunicipio,
    idPessoa: parseNumber(get('idPessoa')),
    nmEntidade: String(get('nmEntidade') ?? '').trim(),
    idLicitacao,
    nrAnoLicitacao: parseNumber(get('nrAnoLicitacao')),
    nrLicitacao: parseNumber(get('nrLicitacao')),
    dsModalidadeLicitacao: String(get('dsModalidadeLicitacao') ?? '').trim(),
    dtHomologacao: parseDate(get('dtHomologacao')),
    nrDocumento,
    nmPessoa: String(get('nmPessoa') ?? '').trim(),
    nrLote: parseNumber(get('nrLote')) ?? 1,
    nrItem,
    dsItem: String(get('dsItem') ?? '').trim(),
    idUnidadeMedida: parseNumber(get('idUnidadeMedida')),
    dsUnidadeMedida: String(get('dsUnidadeMedida') ?? '').trim() || null,
    nrQuantidade: parseNumber(get('nrQuantidade')),
    vlMinimoUnitarioItem: parseNumber(get('vlMinimoUnitarioItem')),
    vlMinimoTotal: parseNumber(get('vlMinimoTotal')),
    vlMaximoUnitarioItem: parseNumber(get('vlMaximoUnitarioitem')),
    vlMaximoTotal: parseNumber(get('vlMaximoTotal')),
    nrQuantidadeProposta: parseNumber(get('nrQuantidadePropostaLicitacao')),
    vlPropostaItem: parseNumber(get('vlPropostaItem')),
    nrQuantidadeVencedor: parseNumber(get('nrQuantidadeVencedorLicitacao')),
    vlLicitacaoVencedor: parseNumber(get('vlLicitacaoVencedorLicitacao')),
    nrClassificacao,
    dsFormaPagamento: String(get('dsFormaPagamento') ?? '').trim() || null,
    nrPrazoLimiteEntrega: parseNumber(get('nrPrazoLimiteEntrega')),
    idTipoEntregaProduto: parseNumber(get('idTipoEntregaProduto')),
    dsTipoEntregaProduto: String(get('dsTipoEntregaProduto') ?? '').trim() || null,
    dtValidadeProposta: parseDate(get('dtValidadeProposta')),
    dtPrazoEntregaProposta: parseDate(get('dtPrazoEntregaPropostaLicitacao')),
    ultimoEnvioSimam: String(get('ultimoEnvioSIMAMNesteExercicio') ?? '').trim() || null,
    dataReferencia: String(get('DataReferencia') ?? '').trim() || null,
  }
}

// ---------- MinIO (opcional) ----------
async function listarXmlsDoMinio() {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucket = process.env.MINIO_TCEPR_BUCKET || 'tcepr'
  const prefix = process.env.MINIO_TCEPR_PREFIX || '2026/'

  if (!endpoint || !accessKey || !secretKey) return []

  // Import dinâmico: só exige @aws-sdk/client-s3 quando o MinIO for usado
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  const listar = async (p) => {
    const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: p }))
    return (listed.Contents || [])
      .map((object) => object.Key)
      .filter((key) => key && key.toLowerCase().endsWith('.xml'))
  }

  let keys = await listar(prefix)
  // Se o prefixo padrão '2026/' não retornar nada (arquivos na raiz do bucket), varre tudo.
  if (!keys.length && !process.env.MINIO_TCEPR_PREFIX) {
    keys = await listar('')
  }

  const files = []
  for (const key of keys) {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const chunks = []
    for await (const chunk of response.Body) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)
    const local = path.join(os.tmpdir(), path.basename(key))
    fs.writeFileSync(local, buffer)
    files.push({ local, key })
  }
  return files
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

// Se a coluna busca_tsv existir como coluna COMUM (ex.: criada antes por `prisma db push`),
// o ADD COLUMN IF NOT EXISTS ... GENERATED do SQL vira no-op e a busca FTS não funciona.
// Recria como coluna gerada (DROP + ADD) e regenera o índice GIN. Idempotente.
async function garantirBuscaTsv() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT is_generated FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'LicitacaoVencedorTcePr' AND column_name = 'busca_tsv'`,
  )
  const coluna = rows[0]
  if (!coluna || coluna.is_generated === 'ALWAYS') return

  await prisma.$executeRawUnsafe(`ALTER TABLE "LicitacaoVencedorTcePr" DROP COLUMN IF EXISTS busca_tsv`)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LicitacaoVencedorTcePr"
    ADD COLUMN busca_tsv tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("dsItem", ''))), 'A') ||
      setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmMunicipio", ''))), 'B') ||
      setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmEntidade", ''))), 'C') ||
      setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmPessoa", ''))), 'C') ||
      setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("dsModalidadeLicitacao", ''))), 'C')
    ) STORED
  `)
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS tcepr_busca_tsv_idx ON "LicitacaoVencedorTcePr" USING gin ("busca_tsv")`,
  )
  console.log('⚠️ busca_tsv recriada como coluna gerada (antes existia como coluna comum).')
}

// ---------- Inserção (upsert pela chave única) ----------
async function insertBatch(batch) {
  if (!batch.length) return 0

  const values = []
  const tuples = batch.map((row, rowIndex) => {
    const placeholders = COLS.map((column, columnIndex) => {
      values.push(row[column] ?? null)
      return `$${rowIndex * COLS.length + columnIndex + 1}`
    })
    return `(${placeholders.join(', ')})`
  })

  const updateColumns = COLS
    .filter((column) => !CHAVE.includes(column))
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(', ')

  const sql = `
    INSERT INTO "LicitacaoVencedorTcePr" (${COLS.map((column) => `"${column}"`).join(', ')})
    VALUES ${tuples.join(', ')}
    ON CONFLICT (${CHAVE.map((column) => `"${column}"`).join(', ')})
    DO UPDATE SET ${updateColumns}
  `

  await prisma.$executeRawUnsafe(sql, ...values)
  return batch.length
}

// ---------- Coleta de fontes ----------
function listarXmlsDaPasta(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.xml'))
    .map((name) => path.join(dir, name))
}

function listarXmlsDoArgumento(arg) {
  const resolved = path.resolve(arg)
  if (fs.statSync(resolved).isDirectory()) {
    return listarXmlsDaPasta(resolved)
  }
  return [resolved]
}

// ---------- Main ----------
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao esta definida.')
  }

  const batchSize = Number(process.env.TCEPR_IMPORT_BATCH_SIZE || 1000)

  let inputPaths = []
  let tempFiles = []

  const arg = process.argv[2]
  if (arg) {
    inputPaths = listarXmlsDoArgumento(arg)
  } else {
    const minioFiles = await listarXmlsDoMinio()
    if (minioFiles.length) {
      inputPaths = minioFiles.map((file) => file.local)
      tempFiles = minioFiles
      console.log(`📦 ${minioFiles.length} XML(s) encontrado(s) no MinIO (bucket ${process.env.MINIO_TCEPR_BUCKET || 'tcepr'}):`)
      for (const file of minioFiles) console.log(`   - ${file.key}`)
    } else {
      // Preferência local: data/tcepr/*.xml; fallback: data/*_LicitacaoVencedor.xml
      inputPaths = listarXmlsDaPasta(defaultDir)
      if (!inputPaths.length) {
        inputPaths = listarXmlsDaPasta(fallbackDir)
          .filter((filePath) => filePath.toLowerCase().includes('licitacaovencedor'))
      }
    }
  }

  if (!inputPaths.length) {
    const temMinio = Boolean(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY)
    throw new Error(
      temMinio
        ? `Nenhum arquivo XML encontrado no bucket '${process.env.MINIO_TCEPR_BUCKET || 'tcepr'}' (prefixo '${process.env.MINIO_TCEPR_PREFIX || '2026/'}'). Confira se os arquivos foram enviados ao MinIO (console ou mc) ou passe um caminho local: npm run import:tcepr -- data`
        : 'Nenhum arquivo XML encontrado. Configure MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY ou passe a pasta/arquivo como argumento (ex.: npm run import:tcepr -- data).',
    )
  }

  await ensureSchema()
  await garantirBuscaTsv()

  let imported = 0
  let skipped = 0
  let processed = 0
  let batch = []
  const startedAt = Date.now()

  for (const filePath of inputPaths) {
    console.log(`📄 Processando: ${path.basename(filePath)}`)
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

    let buffer = ''
    for await (const line of rl) {
      const { tags, remainder } = parseLicitacoesDoChunk(line + '\n', buffer)
      buffer = remainder
      for (const inner of tags) {
        processed += 1
        const row = normalizeRow(extrairAtributos(inner))
        if (!row) {
          skipped += 1
          continue
        }
        batch.push(row)
        if (batch.length >= batchSize) {
          imported += await insertBatch(batch)
          batch = []
          if (imported % (batchSize * 10) === 0) {
            console.log(`Importados ${imported} registros TCE-PR...`)
          }
        }
      }
    }
  }

  if (batch.length) {
    imported += await insertBatch(batch)
  }

  for (const file of tempFiles) {
    fs.rmSync(file.local, { force: true })
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`✅ Importação TCE-PR concluída: ${imported} registros, ${skipped} ignorados, ${processed} tags em ${seconds}s.`)
}

export { extrairAtributos, parseLicitacoesDoChunk, normalizeRow }

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename
if (isMain) {
  main()
    .catch((error) => {
      console.error('Erro ao importar TCE-PR:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
