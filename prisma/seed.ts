import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

const csvFiles = ['catmat.csv', 'catser.csv']

type CsvRow = Record<string, string>

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(';').map((header) => header.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(';').map((value) => value.replace(/^"|"$/g, '').trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })

  return rows
}

async function importarCsv(fileName: string) {
  const filePath = path.resolve(process.cwd(), 'dados', fileName)
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Arquivo não encontrado: ${filePath}`)
    return
  }

  const rows = parseCsv(filePath)
  if (!rows.length) {
    console.log(`ℹ️ Nenhuma linha encontrada em ${fileName}`)
    return
  }

  if (fileName === 'catmat.csv') {
    const dados = rows.map((row) => ({
      codigoItem: Number(row.codigoItem || 0),
      codigoGrupo: Number(row.codigoGrupo || 0),
      nomeGrupo: row.nomeGrupo || '',
      codigoClasse: Number(row.codigoClasse || 0),
      nomeClasse: row.nomeClasse || '',
      codigoPdm: Number(row.codigoPdm || 0),
      nomePdm: row.nomePdm || '',
      descricaoItem: row.descricaoItem || '',
      codigoNcm: row.codigoNcm || null,
      aplicaMargemPreferencia: row.aplicaMargemPreferencia === 'true',
      dataHoraAtualizacao: new Date(row.dataHoraAtualizacao || new Date().toISOString()),
    }))

    const batchSize = 1000
    for (let i = 0; i < dados.length; i += batchSize) {
      const batch = dados.slice(i, i + batchSize)
      await prisma.catmatItem.createMany({ data: batch, skipDuplicates: true })
    }

    console.log(`✅ Importados ${dados.length} itens de ${fileName}`)
    return
  }

  const dados = rows.map((row) => ({
    codigoItem: Number(row.codigoServico || 0),
    codigoGrupo: Number(row.codigoGrupo || 0),
    nomeGrupo: row.nomeGrupo || '',
    codigoClasse: row.codigoClasse || '',
    nomeClasse: row.nomeClasse || '',
    codigoServico: Number(row.codigoServico || 0),
    nomeServico: row.nomeServico || '',
    statusServico: row.statusServico === 'True' || row.statusServico === 'true',
  }))

  const batchSize = 1000
  for (let i = 0; i < dados.length; i += batchSize) {
    const batch = dados.slice(i, i + batchSize)
    await prisma.catserItem.createMany({ data: batch, skipDuplicates: true })
  }

  console.log(`✅ Importados ${dados.length} itens de ${fileName}`)
}

async function main() {
  console.log('🌱 Iniciando seed automático com os CSVs do projeto...')

  for (const fileName of csvFiles) {
    await importarCsv(fileName)
  }

  console.log('🎉 Seed concluído!')
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })