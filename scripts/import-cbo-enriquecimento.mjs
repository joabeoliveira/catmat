// Enriquece SalarioCbo com os arquivos CBO 2002 do MinIO (ou diretório local).
// Uso: npm run import:cbo -- [diretorio-local]
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localArg = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1])
const localDir = localArg || process.env.CBO_DATA_DIR || path.join(root, 'dados', 'salarios')
const csvEncoding = process.env.CBO_IMPORT_ENCODING || 'latin1'
const files = {
  familia: 'cbo2002-familia.csv',
  grandeGrupo: 'cbo2002-grande-grupo.csv',
  subgrupo: 'cbo2002-subgrupo-principal.csv',
  ocupacao: 'cbo2002-ocupacao.csv',
  perfil: 'cbo2002-perfilocupacional.csv',
  sinonimo: 'cbo2002-sinonimo.csv',
}

function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function parseLinha(line) {
  const out = []
  let value = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ';' && !quoted) { out.push(value.trim()); value = '' }
    else value += char
  }
  out.push(value.trim())
  return out
}

function codigo(value) {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : null
}

function texto(value) {
  return String(value ?? '').replace(/^"|"$/g, '').trim()
}

async function caminhoFonte(nome, chaveEnv) {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const key = process.env[chaveEnv] || `${process.env.MINIO_CBO_PREFIX || ''}${nome}`
  if (endpoint && accessKey && secretKey) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } })
    const response = await client.send(new GetObjectCommand({ Bucket: process.env.MINIO_BUCKET || 'catmat-dados', Key: key }))
    const temp = path.join(process.env.TEMP || '/tmp', `catmat-${Date.now()}-${nome}`)
    const chunks = []
    for await (const chunk of response.Body) chunks.push(chunk)
    fs.writeFileSync(temp, Buffer.concat(chunks))
    return { path: temp, temporary: true }
  }
  return { path: path.join(localDir, nome), temporary: false }
}

async function lerMapa(nome, chaveEnv) {
  const fonte = await caminhoFonte(nome, chaveEnv)
  const mapa = new Map()
  const stream = fs.createReadStream(fonte.path, { encoding: csvEncoding })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  let header = true
  let ignoradas = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    if (header) { header = false; continue }
    const values = parseLinha(line)
    const code = codigo(values[0])
    const title = texto(values[1] || values.slice(1).join(' — '))
    if (code && title) mapa.set(code, title)
    else ignoradas += 1
  }
  if (fonte.temporary) fs.rmSync(fonte.path, { force: true })
  console.log(`${nome}: ${mapa.size} registros, ${ignoradas} ignorados`)
  return mapa
}

async function lerPerfis(nome, chaveEnv) {
  const fonte = await caminhoFonte(nome, chaveEnv)
  const mapa = new Map()
  const rl = readline.createInterface({ input: fs.createReadStream(fonte.path, { encoding: csvEncoding }), crlfDelay: Infinity })
  let header = true
  let indices = { familia: 3, ocupacao: 4, area: 6, atividade: 8 }
  for await (const line of rl) {
    if (!line.trim()) continue
    if (header) {
      const columns = parseLinha(line).map((column) => normalizar(column))
      indices = {
        familia: Math.max(0, columns.indexOf('cod_familia')),
        ocupacao: Math.max(0, columns.indexOf('cod_ocupacao')),
        area: Math.max(0, columns.indexOf('nome_grande_area')),
        atividade: Math.max(0, columns.indexOf('nome_atividade')),
      }
      header = false
      continue
    }
    const values = parseLinha(line)
    const code = codigo(values[indices.familia]) || codigo(values[indices.ocupacao])
    const area = texto(values[indices.area])
    const activity = texto(values[indices.atividade])
    if (code && activity) {
      const current = mapa.get(code) || ''
      const entry = `${area ? `${area}: ` : ''}${activity}`
      if (!current.includes(entry)) mapa.set(code, current ? `${current}\n- ${entry}` : `Atividades do perfil:\n- ${entry}`)
    }
  }
  if (fonte.temporary) fs.rmSync(fonte.path, { force: true })
  console.log(`${nome}: ${mapa.size} perfis`)
  return mapa
}

async function lerSinonimos(nome, chaveEnv) {
  const fonte = await caminhoFonte(nome, chaveEnv)
  const rows = []
  const rl = readline.createInterface({ input: fs.createReadStream(fonte.path, { encoding: csvEncoding }), crlfDelay: Infinity })
  let header = true
  for await (const line of rl) {
    if (!line.trim()) continue
    if (header) { header = false; continue }
    const values = parseLinha(line)
    const code = codigo(values[0])
    const synonym = texto(values[1] || values.slice(1).join(' '))
    if (code && synonym) {
      // O arquivo de sinônimos usa CBO ocupação (6 dígitos); SalarioCbo usa família (4 dígitos).
      const familyCode = code > 9999 ? Math.floor(code / 100) : code
      rows.push({ code: familyCode, synonym, normalized: normalizar(synonym) })
    }
  }
  if (fonte.temporary) fs.rmSync(fonte.path, { force: true })
  console.log(`${nome}: ${rows.length} sinônimos`)
  return rows
}

function percentil(values, p) {
  if (!values.length) return null
  const index = (values.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return lower === upper ? values[lower] : values[lower] + (values[upper] - values[lower]) * (index - lower)
}

async function main() {
  const perfilOnly = process.argv.includes('--perfil-only')
  const sinonimoOnly = process.argv.includes('--sinonimo-only')
  if (perfilOnly) {
    const perfis = await lerPerfis(files.perfil, 'MINIO_CBO_PERFIL_KEY')
    const rows = await prisma.$queryRawUnsafe(`SELECT "uf", "cbo" FROM "SalarioCbo"`)
    let atualizados = 0
    for (const row of rows) {
      const profile = perfis.get(Number(String(row.cbo).padStart(4, '0')))
      if (!profile) continue
      await prisma.$executeRawUnsafe(`UPDATE "SalarioCbo" SET "perfilOcupacional"=$1,"fonte"=COALESCE("fonte", $2) WHERE "uf"=$3 AND "cbo"=$4`, profile, 'CBO2002 perfil ocupacional via MinIO', row.uf, row.cbo)
      atualizados += 1
    }
    console.log(`Perfis ocupacionais atualizados: ${atualizados} registros.`)
    return
  }
  if (sinonimoOnly) {
    const sinonimos = await lerSinonimos(files.sinonimo, 'MINIO_CBO_SINONIMO_KEY')
    let importados = 0
    for (const row of sinonimos) {
      await prisma.$executeRawUnsafe(`INSERT INTO "SalarioCboSinonimo" ("cbo","sinonimo","sinonimoNormalizado","fonte") SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM "SalarioCbo" WHERE "cbo"=$1) ON CONFLICT ("cbo","sinonimoNormalizado") DO UPDATE SET "sinonimo"=EXCLUDED."sinonimo","fonte"=EXCLUDED."fonte"`, row.code, row.synonym, row.normalized, 'CBO2002 sinônimos via MinIO')
      importados += 1
    }
    console.log(`Sinônimos processados: ${importados} registros.`)
    return
  }
  const familia = await lerMapa(files.familia, 'MINIO_CBO_FAMILIA_KEY')
  const grandeGrupo = await lerMapa(files.grandeGrupo, 'MINIO_CBO_GRANDE_GRUPO_KEY')
  const subgrupo = await lerMapa(files.subgrupo, 'MINIO_CBO_SUBGRUPO_KEY')
  const ocupacao = await lerMapa(files.ocupacao, 'MINIO_CBO_OCUPACAO_KEY')
  const perfis = await lerPerfis(files.perfil, 'MINIO_CBO_PERFIL_KEY')
  const sinonimos = await lerSinonimos(files.sinonimo, 'MINIO_CBO_SINONIMO_KEY')

  const rows = await prisma.$queryRawUnsafe(`SELECT "uf", "cbo", "salario2023", "salario2024", "salario2025", "salario2026" FROM "SalarioCbo"`)
  const salariosPorCboAno = new Map()
  let atualizados = 0
  for (const row of rows) {
    const familyCode = String(row.cbo).padStart(4, '0')
    const familyNumber = Number(familyCode)
    const familyTitle = familia.get(familyNumber) || ocupacao.get(familyNumber) || null
    const groupCode = familyCode.slice(0, 1)
    const subgroupCode = familyCode.slice(0, 2)
    const groupTitle = grandeGrupo.get(Number(groupCode)) || null
    const subgroupTitle = subgrupo.get(Number(subgroupCode)) || null
    const profile = perfis.get(familyNumber) || null
    await prisma.$executeRawUnsafe(`UPDATE "SalarioCbo" SET "familiaCodigo"=$1,"familiaTitulo"=$2,"grandeGrupoCodigo"=$3,"grandeGrupoTitulo"=$4,"subgrupoPrincipalCodigo"=$5,"subgrupoPrincipalTitulo"=$6,"perfilOcupacional"=$7,"fonte"=$8 WHERE "uf"=$9 AND "cbo"=$10`, familyCode, familyTitle, groupCode, groupTitle, subgroupCode, subgroupTitle, profile, 'CBO2002/COGED/MTE/IBGE/RAIS-MTE via MinIO', row.uf, row.cbo)
    atualizados += 1
    for (const year of [2023, 2024, 2025, 2026]) {
      const salary = Number(row[`salario${year}`])
      if (!Number.isFinite(salary) || salary <= 0) continue
      const key = `${row.cbo}:${year}`
      const list = salariosPorCboAno.get(key) || []
      list.push(salary)
      salariosPorCboAno.set(key, list)
      await prisma.$executeRawUnsafe(`INSERT INTO "SalarioCboHistorico" ("cbo","uf","ano","salario","fonte") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("uf","cbo","ano") DO UPDATE SET "salario"=EXCLUDED."salario","fonte"=EXCLUDED."fonte","carregadoEm"=now()`, row.cbo, row.uf, year, salary, 'SalarioCbo via MinIO')
    }
  }

  for (const [key, rawValues] of salariosPorCboAno) {
    const [cbo, year] = key.split(':').map(Number)
    const values = rawValues.sort((a, b) => a - b)
    const sum = values.reduce((total, value) => total + value, 0)
    await prisma.$executeRawUnsafe(`INSERT INTO "SalarioCboPercentil" ("cbo","ano","observacoes","p10","p25","p50","p75","p90","media","minimo","maximo","fonte") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT ("cbo","ano") DO UPDATE SET "observacoes"=EXCLUDED."observacoes","p10"=EXCLUDED."p10","p25"=EXCLUDED."p25","p50"=EXCLUDED."p50","p75"=EXCLUDED."p75","p90"=EXCLUDED."p90","media"=EXCLUDED."media","minimo"=EXCLUDED."minimo","maximo"=EXCLUDED."maximo","calculadoEm"=now()`, cbo, year, values.length, percentil(values, .1), percentil(values, .25), percentil(values, .5), percentil(values, .75), percentil(values, .9), sum / values.length, values[0], values[values.length - 1], 'Calculado a partir de SalarioCbo')
  }

  for (const row of sinonimos) {
    await prisma.$executeRawUnsafe(`INSERT INTO "SalarioCboSinonimo" ("cbo","sinonimo","sinonimoNormalizado","fonte") SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM "SalarioCbo" WHERE "cbo"=$1) ON CONFLICT ("cbo","sinonimoNormalizado") DO UPDATE SET "sinonimo"=EXCLUDED."sinonimo","fonte"=EXCLUDED."fonte"`, row.code, row.synonym, row.normalized, 'CBO2002 via MinIO')
  }
  console.log(`Enriquecimento concluído: ${atualizados} salários atualizados, ${salariosPorCboAno.size} percentis calculados.`)
}

main().catch((error) => { console.error('Erro no enriquecimento CBO:', error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
