import { createHash } from 'node:crypto'

type PeriodoAnp = {
  dataInicio: Date
  dataFim: Date
}

type DownloadAnp = PeriodoAnp & {
  buffer: Buffer
  url: string
  objectKey: string
  hashSha256: string
  tamanhoBytes: number
}

function normalizarUtc(data: Date): Date {
  if (Number.isNaN(data.getTime())) {
    throw new Error('Data inválida.')
  }

  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
}

function formatarData(data: Date): string {
  const ano = data.getUTCFullYear().toString().padStart(4, '0')
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0')
  const dia = data.getUTCDate().toString().padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function calcularSemanaAnterior(referencia: Date = new Date()): PeriodoAnp {
  const data = normalizarUtc(referencia)
  const diasDesdeSegunda = (data.getUTCDay() + 6) % 7
  const segundaAtual = new Date(data)
  segundaAtual.setUTCDate(segundaAtual.getUTCDate() - diasDesdeSegunda)

  const dataInicio = new Date(segundaAtual)
  dataInicio.setUTCDate(dataInicio.getUTCDate() - 7)

  const dataFim = new Date(dataInicio)
  dataFim.setUTCDate(dataFim.getUTCDate() + 6)

  return { dataInicio, dataFim }
}

export function calcularSemanaPorDatas(dataInicio: Date, dataFim: Date): PeriodoAnp {
  const inicio = normalizarUtc(dataInicio)
  const fim = normalizarUtc(dataFim)

  if (inicio.getTime() > fim.getTime()) {
    throw new Error('dataInicio deve ser menor ou igual a dataFim.')
  }

  return { dataInicio: inicio, dataFim: fim }
}

export function montarUrlAnp(dataInicio: Date, dataFim: Date): string {
  const periodo = calcularSemanaPorDatas(dataInicio, dataFim)
  const inicio = formatarData(periodo.dataInicio)
  const fim = formatarData(periodo.dataFim)
  const ano = periodo.dataInicio.getUTCFullYear()

  return `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/${ano}/resumo_semanal_lpc_${inicio}_${fim}.xlsx`
}

export function montarObjectKey(dataInicio: Date, dataFim: Date): string {
  const periodo = calcularSemanaPorDatas(dataInicio, dataFim)
  const inicio = formatarData(periodo.dataInicio)
  const fim = formatarData(periodo.dataFim)
  const ano = periodo.dataInicio.getUTCFullYear()

  return `${ano}/resumo_semanal_lpc_${inicio}_${fim}.xlsx`
}

export async function baixarXlsxAnp(dataInicio: Date, dataFim: Date): Promise<DownloadAnp> {
  const periodo = calcularSemanaPorDatas(dataInicio, dataFim)
  const url = montarUrlAnp(periodo.dataInicio, periodo.dataFim)
  const objectKey = montarObjectKey(periodo.dataInicio, periodo.dataFim)
  const timeoutMs = Number(process.env.ANP_TIMEOUT_MS) || 60000

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': process.env.ANP_USER_AGENT || 'sistema-precos-anp/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout ao baixar arquivo XLSX da ANP após ${timeoutMs} ms: ${url}`, { cause: error })
    }

    throw error
  }

  if (response.status !== 200) {
    throw new Error(`Falha ao baixar arquivo XLSX da ANP: HTTP ${response.status} — ${url}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const hashSha256 = createHash('sha256').update(buffer).digest('hex')

  return {
    ...periodo,
    buffer,
    url,
    objectKey,
    hashSha256,
    tamanhoBytes: buffer.length,
  }
}
