// Resolução do link de auditoria da compra no PNCP, a partir dos dados
// oficiais do Compras.gov.br (dados abertos). Fluxo definido:
//
// 1) Pesquisa de preço -> idCompra (e demais campos: idItemCompra, codigoUasg,
//    modalidade, dataCompra). A API de preços NÃO retorna link pronto, então
//    sempre resolvemos pela contratação.
// 2) Módulo contratações:
//    GET /modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id
//        ?tipo=idCompra&codigo={idCompra}
//    -> orgaoEntidadeCnpj, anoCompraPncp, sequencialCompraPncp, numeroControlePNCP
// 3) Link final:
//    https://pncp.gov.br/app/editais/{cnpj}/{anoCompra}/{sequencialCompra}
//    (CNPJ só com números; sequencial sem zeros à esquerda)
//
// Se a resolução falhar, o chamador deve usar linkBuscaPncp() como fallback
// textual de auditoria (não bloqueia o salvamento).

const URL_PNCP = 'https://pncp.gov.br/app'
const URL_BUSCA_PNCP = 'https://pncp.gov.br/app/compras'
const URL_CONTRATACOES_ID =
  'https://dadosabertos.compras.gov.br/modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id'

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
  resolucao: ResolucaoContratacao | null
  quando: number
}

const TTL_MS = 1000 * 60 * 60 * 24 // 24h
const cacheResolucao = new Map<string, CacheEntry>()

/** Consulta o módulo de contratações pelo idCompra (endpoint oficial). */
export async function resolverContratacaoPorIdCompra(idCompra: string): Promise<ResolucaoContratacao | null> {
  const cache = cacheResolucao.get(idCompra)
  if (cache && Date.now() - cache.quando < TTL_MS) return cache.resolucao

  try {
    const url = `${URL_CONTRATACOES_ID}?tipo=idCompra&codigo=${encodeURIComponent(idCompra)}`
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const item = Array.isArray(payload?.resultado) ? payload.resultado[0] : null
    if (!item) {
      cacheResolucao.set(idCompra, { resolucao: null, quando: Date.now() })
      return null
    }

    const resolucao: ResolucaoContratacao = {
      idCompra: String(item.idCompra ?? idCompra),
      numeroControlePNCP: item.numeroControlePNCP ?? null,
      anoCompraPncp: typeof item.anoCompraPncp === 'number' ? item.anoCompraPncp : null,
      sequencialCompraPncp: typeof item.sequencialCompraPncp === 'number' ? item.sequencialCompraPncp : null,
      orgaoEntidadeCnpj: item.orgaoEntidadeCnpj ?? null,
      unidadeOrgaoCodigoUnidade: item.unidadeOrgaoCodigoUnidade ?? null,
      modalidadeIdPncp: typeof item.modalidadeIdPncp === 'number' ? item.modalidadeIdPncp : null,
      dataPublicacaoPncp: item.dataPublicacaoPncp ?? null,
    }
    cacheResolucao.set(idCompra, { resolucao, quando: Date.now() })
    return resolucao
  } catch {
    return null
  }
}

/** Monta o link final de auditoria no PNCP. Retorna null se não for possível. */
export async function montarLinkPncp(idCompra: string): Promise<string | null> {
  const resolucao = await resolverContratacaoPorIdCompra(idCompra)
  if (!resolucao) return null

  const cnpj = resolucao.orgaoEntidadeCnpj?.replace(/\D/g, '') || ''
  const ano = resolucao.anoCompraPncp
  const sequencial = resolucao.sequencialCompraPncp

  if (!cnpj || !ano || sequencial == null) return null

  const sequencialSemZeros = String(sequencial).replace(/^0+/, '') || '0'
  return `${URL_PNCP}/editais/${cnpj}/${ano}/${sequencialSemZeros}`
}

/** Link de busca (fallback textual de auditoria) quando a resolução falha. */
export function linkBuscaPncp(idCompra: string): string {
  return `${URL_BUSCA_PNCP}?busca=${encodeURIComponent(idCompra)}`
}
