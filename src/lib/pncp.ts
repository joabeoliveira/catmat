// Helpers (server-side) para construir o link direto da compra no Portal
// Nacional de Contratações Públicas (PNCP).
//
// Formato do link: https://pncp.gov.br/app/editais/{cnpjOrgao}/{ano}/{numeroCompra}
//
// O idCompra retornado pela API de preços tem o formato:
//   {UASG(6)}{modalidade(2)}{numeroCompra(5, zeros à esquerda)}{ano(4)}
// Ex.: "10230306002292026" -> UASG 102303, modalidade 06, nº 229, ano 2026.
// O CNPJ do órgão é resolvido pela busca pública do PNCP por UASG.

const URL_PNCP = 'https://pncp.gov.br/app'
const URL_BUSCA_PNCP = 'https://pncp.gov.br/app/compras'
const URL_SEARCH_PNCP = 'https://pncp.gov.br/api/search'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
const TTL_CNPJ_MS = 1000 * 60 * 60 * 24 // 24h

export interface IdCompraDecodificado {
  uasg: string
  modalidade: string
  numeroCompra: number
  ano: string
}

export function decodificarIdCompra(idCompra: string): IdCompraDecodificado | null {
  if (!/^\d{17}$/.test(idCompra)) return null
  return {
    uasg: idCompra.slice(0, 6),
    modalidade: idCompra.slice(6, 8),
    numeroCompra: parseInt(idCompra.slice(8, 13), 10),
    ano: idCompra.slice(13, 17),
  }
}

// Cache simples UASG -> CNPJ (evita chamadas repetidas à busca do PNCP)
const cacheCnpjPorUasg = new Map<string, { cnpj: string; quando: number }>()

export async function buscarCnpjPorUasg(uasg: string): Promise<string | null> {
  const cache = cacheCnpjPorUasg.get(uasg)
  if (cache && Date.now() - cache.quando < TTL_CNPJ_MS) return cache.cnpj

  try {
    const url = `${URL_SEARCH_PNCP}?tipos_documento=edital&q=${encodeURIComponent(uasg)}&pagina=1&tamanhoPagina=1`
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const items = Array.isArray(payload?.items) ? payload.items : []
    const cnpj = items[0]?.orgao_cnpj
    if (cnpj) {
      const valor = String(cnpj)
      cacheCnpjPorUasg.set(uasg, { cnpj: valor, quando: Date.now() })
      return valor
    }
  } catch {
    // noop
  }
  return null
}

/** Monta o link direto no formato editais/{cnpj}/{ano}/{numero}. Retorna null se não for possível. */
export async function montarLinkPncp(idCompra: string): Promise<string | null> {
  const decod = decodificarIdCompra(idCompra)
  if (!decod) return null
  const cnpj = await buscarCnpjPorUasg(decod.uasg)
  if (!cnpj) return null
  return `${URL_PNCP}/editais/${cnpj}/${decod.ano}/${decod.numeroCompra}`
}

/** Link de busca (fallback) quando o link direto não puder ser montado. */
export function linkBuscaPncp(idCompra: string): string {
  return `${URL_BUSCA_PNCP}?busca=${encodeURIComponent(idCompra)}`
}
