import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '@/lib/db'
import {
  baixarXlsxAnp,
  calcularSemanaAnterior,
  calcularSemanaPorDatas,
} from '@/features/anp/anp.source'
import { parseAnpXlsx } from '@/features/anp/anp.parser'
import { sincronizarSemanaAnp } from '@/features/anp/anp.service'
import type { AnpResultadoParsing } from '@/features/anp/anp.types'

type Opcoes = {
  dataInicio?: string
  dataFim?: string
  arquivo?: string
  dryRun: boolean
  ajuda: boolean
}

function imprimirAjuda(): void {
  console.log(`Uso:
  npm run import:anp -- [opções]

Opções:
  --data-inicio YYYY-MM-DD  Data inicial da semana
  --data-fim YYYY-MM-DD     Data final da semana
  --arquivo <caminho>       Lê um XLSX local sem rede, MinIO ou Postgres
  --dry-run                 Baixa ou lê, parseia e não persiste
  --ajuda                   Exibe esta ajuda`)
}

function lerArgumentos(argumentos: string[]): Opcoes {
  const opcoes: Opcoes = { dryRun: false, ajuda: false }

  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const argumento = argumentos[indice]

    if (argumento === '--ajuda' || argumento === '-h') {
      opcoes.ajuda = true
      continue
    }

    if (argumento === '--dry-run') {
      opcoes.dryRun = true
      continue
    }

    if (argumento === '--data-inicio' || argumento === '--data-fim' || argumento === '--arquivo') {
      const valor = argumentos[indice + 1]
      if (!valor || valor.startsWith('--')) {
        throw new Error(`Informe um valor para ${argumento}.`)
      }

      if (argumento === '--data-inicio') opcoes.dataInicio = valor
      if (argumento === '--data-fim') opcoes.dataFim = valor
      if (argumento === '--arquivo') opcoes.arquivo = valor
      indice += 1
      continue
    }

    throw new Error(`Argumento desconhecido: ${argumento}`)
  }

  return opcoes
}

function converterData(valor: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error(`Data inválida: ${valor}. Use o formato YYYY-MM-DD.`)
  }

  const data = new Date(`${valor}T00:00:00.000Z`)
  if (Number.isNaN(data.getTime())) throw new Error(`Data inválida: ${valor}.`)
  return data
}

function obterPeriodo(opcoes: Opcoes): { dataInicio: Date; dataFim: Date } {
  if (Boolean(opcoes.dataInicio) !== Boolean(opcoes.dataFim)) {
    throw new Error('--data-inicio e --data-fim devem ser informados juntos.')
  }

  if (!opcoes.dataInicio || !opcoes.dataFim) return calcularSemanaAnterior()

  return calcularSemanaPorDatas(converterData(opcoes.dataInicio), converterData(opcoes.dataFim))
}

function imprimirContagens(resultado: AnpResultadoParsing): void {
  const contar = <T extends keyof AnpResultadoParsing['linhas'][number]>(campo: T) => {
    const contagens = new Map<string, number>()
    for (const linha of resultado.linhas) {
      const valor = String(linha[campo])
      contagens.set(valor, (contagens.get(valor) || 0) + 1)
    }
    return Object.fromEntries([...contagens.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }

  if (resultado.abasFaltantes.length > 0) {
    throw new Error(`Abas faltantes no XLSX da ANP: ${resultado.abasFaltantes.join(', ')}`)
  }

  console.log(`Abas encontradas: ${resultado.abasEncontradas.join(', ')}`)
  console.log(`Abas faltantes: ${resultado.abasFaltantes.length ? resultado.abasFaltantes.join(', ') : 'nenhuma'}`)
  console.log(`Total de linhas: ${resultado.totalLinhas}`)
  console.log(`Por abrangência: ${JSON.stringify(contar('abrangencia'))}`)
  console.log(`Por produto: ${JSON.stringify(contar('produto'))}`)
  console.log(`Por unidade: ${JSON.stringify(contar('unidade'))}`)
}

async function executar(opcoes: Opcoes): Promise<void> {
  if (opcoes.ajuda) {
    imprimirAjuda()
    return
  }

  if (opcoes.arquivo) {
    const arquivo = path.resolve(opcoes.arquivo)
    const buffer = await readFile(arquivo)
    const resultado = parseAnpXlsx(buffer)
    imprimirContagens(resultado)
    console.log(`Arquivo local processado: ${arquivo}`)
    console.log('Nenhum dado foi gravado no PostgreSQL ou no MinIO.')
    return
  }

  const periodo = obterPeriodo(opcoes)

  if (opcoes.dryRun) {
    const download = await baixarXlsxAnp(periodo.dataInicio, periodo.dataFim)
    const resultado = parseAnpXlsx(download.buffer)
    imprimirContagens(resultado)
    console.log(`Download concluído: ${download.url}`)
    console.log(`Object key: ${download.objectKey}`)
    console.log(`SHA-256: ${download.hashSha256}`)
    console.log(`Tamanho: ${download.tamanhoBytes} bytes`)
    console.log('Dry-run concluído. Nenhum dado foi gravado no PostgreSQL ou no MinIO.')
    return
  }

  const resumo = await sincronizarSemanaAnp(periodo.dataInicio, periodo.dataFim)
  console.log(`Semana: ${resumo.semanaId}`)
  console.log(`Data inicial: ${resumo.dataInicio}`)
  console.log(`Data final: ${resumo.dataFim}`)
  console.log(`Status: ${resumo.status}`)
  console.log(`Linhas lidas: ${resumo.linhasLidas}`)
  console.log(`Preços gravados: ${resumo.precosGravados}`)
  console.log(`Object key: ${resumo.objectKey}`)
  console.log(`SHA-256: ${resumo.hashSha256.slice(0, 12)}`)
  console.log(`Tamanho: ${resumo.tamanhoBytes} bytes`)
}

async function main(): Promise<void> {
  try {
    await executar(lerArgumentos(process.argv.slice(2)))
  } catch (error) {
    console.error(`Importação ANP falhou: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void main()
