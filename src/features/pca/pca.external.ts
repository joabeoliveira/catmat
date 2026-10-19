import type { PcaCatalogType } from './pca.types'

interface ExternalSuggestion { codigo: number; tipo: PcaCatalogType; justificativa?: string }

let failures = 0
let openUntil = 0

export async function consultarProviderExterno(descricao: string, tipo: PcaCatalogType): Promise<ExternalSuggestion[]> {
  const baseUrl = process.env.PCA_JEV_URL?.trim() || process.env.PCA_AI_URL?.trim()
  if (!baseUrl || Date.now() < openUntil) return []
  try {
    const response = await fetch(baseUrl, {
      method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ descricao, tipo }), signal: AbortSignal.timeout(Number(process.env.PCA_PROVIDER_TIMEOUT_MS || 4000)),
    })
    if (!response.ok) throw new Error(`Provider externo retornou ${response.status}`)
    const payload = await response.json() as { resultado?: unknown[]; suggestions?: unknown[] }
    const values = Array.isArray(payload.resultado) ? payload.resultado : Array.isArray(payload.suggestions) ? payload.suggestions : []
    failures = 0
    return values.map((value) => {
      const row = value as Record<string, unknown>
      return { codigo: Number(row.codigo ?? row.codigoItem ?? row.codigoServico), tipo: (row.tipo ?? tipo) as PcaCatalogType, justificativa: typeof row.justificativa === 'string' ? row.justificativa : undefined }
    }).filter((row) => Number.isInteger(row.codigo) && row.codigo > 0 && (row.tipo === 'CATMAT' || row.tipo === 'CATSER'))
  } catch {
    failures += 1
    if (failures >= 3) openUntil = Date.now() + 30_000
    return []
  }
}
