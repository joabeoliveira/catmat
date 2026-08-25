// src/features/salarios/inpc.service.ts
// Fator de correção monetária pelo INPC (série 188 do SGS/Banco Central do Brasil),
// com cache em memória de 24h e fallback 1.0 quando a API estiver indisponível.
//
// O fator acumula as variações mensais entre 1º de janeiro do ano base e a data
// atual: valorCorrigido = valorBase × fator.

const SERIE_INPC = 188
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  valor: number
  expiraEm: number
}

const cache = new Map<string, CacheEntry>()

function mesAno(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${data.getFullYear()}-${mes}`
}

function formatarDataBR(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${data.getFullYear()}`
}

async function buscarFator(dataInicial: Date, dataFinal: Date): Promise<number> {
  const chave = `inpc:${mesAno(dataInicial)}:${mesAno(dataFinal)}`
  const agora = Date.now()
  const cacheado = cache.get(chave)
  if (cacheado && cacheado.expiraEm > agora) return cacheado.valor

  try {
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIE_INPC}/dados` +
      `?formato=json&dataInicial=${formatarDataBR(dataInicial)}&dataFinal=${formatarDataBR(dataFinal)}`

    const resposta = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!resposta.ok) return 1

    const taxas: { valor: string }[] = await resposta.json()
    let fator = 1
    for (const taxa of taxas) {
      const percentual = Number(String(taxa.valor).replace(',', '.'))
      if (Number.isFinite(percentual)) fator *= 1 + percentual / 100
    }

    cache.set(chave, { valor: fator, expiraEm: agora + CACHE_TTL_MS })
    return fator
  } catch (error) {
    console.warn('Falha ao buscar INPC — usando fator 1.0:', error)
    return 1
  }
}

/**
 * Fator acumulado do INPC entre 1º de janeiro do ano base e a data `ate` (hoje).
 * Aproximação: considera o salário anual como referido ao início do ano.
 */
export async function getFatorInpc(anoBase: number, ate?: Date): Promise<number> {
  const anoValido = Math.min(Math.max(anoBase, 2020), 2099)
  const inicio = new Date(anoValido, 0, 1)
  const fim = ate ?? new Date()
  if (fim <= inicio) return 1
  return buscarFator(inicio, fim)
}
