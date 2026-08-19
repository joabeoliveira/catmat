// Resolução do link de auditoria da compra no PNCP, a partir dos dados
// oficiais do Compras.gov.br (dados abertos). Fluxo em cascata:
//
// 1) Pesquisa de preço -> idCompra (e demais campos: idItemCompra, codigoUasg,
//    modalidade, dataCompra). A API de preços NÃO retorna link pronto, então
//    sempre resolvemos.
// 2) RESOLUÇÃO PRIMÁRIA (autoritativa) — módulo de contratações:
//    GET /modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id
//        ?tipo=idCompra&codigo={idCompra}
//    -> orgaoEntidadeCnpj, anoCompraPncp, sequencialCompraPncp, numeroControlePNCP
// 3) RESOLUÇÃO SECUNDÁRIA — busca pública do PNCP por UASG + ano + número da
//    contratação (decodificado do idCompra), usando o item_url do documento.
// 4) Link final:
//    https://pncp.gov.br/app/editais/{cnpj}/{anoCompra}/{sequencialCompra}
//    (CNPJ só com números; sequencial sem zeros à esquerda)
//
// Se tudo falhar, o chamador deve usar linkBuscaPncp() como fallback textual
// de auditoria (não bloqueia o salvamento).

const URL_PNCP = 'https://pncp.gov.br/app'
const URL_BUSCA_PNCP = 'https://pncp.gov.br/app/compras'
const URL_CONTRATACOES_ID =
  'https://dadosabertos.compras.gov.br/modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id'
const URL_SEARCH_PNCP = 'https://pncp.gov.br/api/search'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
const TTL_MS = 1000 * 60 * 60 * 24 // 24h

export interface ResolucaoContratacao {
  idCompra: string
  numeroControlePNCP?: string | null
  anoCompraPncp?: number | null
  sequencialCompraPncp?: number | null
  orgaoEntidadeCnpj?: string | null
  unidadeOrgaoCodigoUnidade?: string | null
  modalidadeIdPncp?: number | null
  dataPublicacaoPncp?: string | null
}

interface CacheEntry {
  link: string | null
  quando: number
}

const cacheLink = new Map<string, CacheEntry>()

/** Decodifica o idCompra: {UASG(6)}{modalidade(2)}{numero(N)}{ano(4)}. */
function decodificarIdCompra(idCompra: string): { uasg: string; numero: number; ano: string } | null {
  if (!/^\d{16,18}$/.test(idCompra)) return null
  return {
    uasg: idCompra.slice(0, 6),
    numero: parseInt(idCompra.slice(8, -4), 10), // entre modalidade(2) e ano(4)
    ano: idCompra.slice(-4),
  }
}

/** Consulta o módulo de contratações pelo idCompra (endpoint oficial). */
export async function resolverContratacaoPorIdCompra(idCompra: string): Promise<ResolucaoContratacao | null> {
  try {
    const url = `${URL_CONTRATACOES_ID}?tipo=idCompra&codigo=${encodeURIComponent(idCompra)}`
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const item = Array.isArray(payload?.resultado) ? payload.resultado[0] : null
    if (!item) return null

    return {
      idCompra: String(item.idCompra ?? idCompra),
      numeroControlePNCP: item.numeroControlePNCP ?? null,
      anoCompraPncp: typeof item.anoCompraPncp === 'number' ? item.anoCompraPncp : null,
      sequencialCompraPncp: typeof item.sequencialCompraPncp === 'number' ? item.sequencialCompraPncp : null,
      orgaoEntidadeCnpj: item.orgaoEntidadeCnpj ?? null,
      unidadeOrgaoCodigoUnidade: item.unidadeOrgaoCodigoUnidade ?? null,
      modalidadeIdPncp: typeof item.modalidadeIdPncp === 'number' ? item.modalidadeIdPncp : null,
      dataPublicacaoPncp: item.dataPublicacaoPncp ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Resolução secundária: busca pública do PNCP por UASG + ano + número da
 * contratação (decodificado do idCompra). Usa o item_url do documento que
 * bate com "nº {numero}/{ano}" no título.
 */
async function resolverViaBuscaPncp(idCompra: string): Promise<string | null> {
  const info = decodificarIdCompra(idCompra)
  if (!info) return null

  try {
    const url = `${URL_SEARCH_PNCP}?tipos_documento=edital&q=${encodeURIComponent(`${info.uasg} ${info.ano} ${info.numero}`)}&pagina=1&tamanhoPagina=30`
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const items = Array.isArray(payload?.items) ? payload.items : []
    const padrao = new RegExp(`n[º°o]?\\.?\\s*${info.numero}/${info.ano}`)

    for (const item of items) {
      const titulo = String(item?.title ?? '')
      if (!padrao.test(titulo)) continue

      const cnpj = String(item?.orgao_cnpj ?? '').replace(/\D/g, '')
      const ano = String(item?.ano ?? '')
      const itemUrl = String(item?.item_url ?? '')
      const sequencial = itemUrl.split('/').filter(Boolean).pop() || String(item?.numero_sequencial ?? '')
      if (cnpj && ano && sequencial) {
        return `${URL_PNCP}/editais/${cnpj}/${ano}/${sequencial.replace(/^0+/, '') || '0'}`
      }
    }
  } catch {
    // noop
  }
  return null
}

/** Monta o link final de auditoria no PNCP (primário + secundário). Retorna null se não for possível. */
export async function montarLinkPncp(idCompra: string): Promise<string | null> {
  const cache = cacheLink.get(idCompra)
  if (cache && Date.now() - cache.quando < TTL_MS) return cache.link

  let link: string | null = null

  // 1) Resolução primária (autoritativa) pelo módulo de contratações
  const resolucao = await resolverContratacaoPorIdCompra(idCompra)
  if (resolucao) {
    const cnpj = resolucao.orgaoEntidadeCnpj?.replace(/\D/g, '') || ''
    const ano = resolucao.anoCompraPncp
    const sequencial = resolucao.sequencialCompraPncp
    if (cnpj && ano && sequencial != null) {
      link = `${URL_PNCP}/editais/${cnpj}/${ano}/${String(sequencial).replace(/^0+/, '') || '0'}`
    }
  }

  // 2) Resolução secundária pela busca pública do PNCP
  if (!link) {
    link = await resolverViaBuscaPncp(idCompra)
  }

  cacheLink.set(idCompra, { link, quando: Date.now() })
  return link
}

/** Link de busca (fallback textual de auditoria) quando a resolução falha. */
export function linkBuscaPncp(idCompra: string): string {
  return `${URL_BUSCA_PNCP}?busca=${encodeURIComponent(idCompra)}`
}
