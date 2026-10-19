import type { PcaCatalogType } from './pca.types'

interface ExternalSuggestion { codigo: number; tipo: PcaCatalogType; justificativa?: string }

let failures = 0
let openUntil = 0

export async function consultarProviderExterno(descricao: string, tipo: PcaCatalogType): Promise<ExternalSuggestion[]> {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
  const isOpenRouter = Boolean(openRouterKey)
  const baseUrl = isOpenRouter
    ? (process.env.OPENROUTER_URL?.trim() || 'https://openrouter.ai/api/v1/chat/completions')
    : (process.env.PCA_JEV_URL?.trim() || process.env.PCA_AI_URL?.trim())
  if (!baseUrl || Date.now() < openUntil) return []
  try {
    const system = 'Você é um classificador de catálogo de compras públicas. Retorne somente JSON válido no formato {"sugestoes":[{"codigo":123,"tipo":"CATMAT","justificativa":"..."}]}. Nunca invente códigos; sugira apenas códigos plausíveis para a descrição.'
    const user = JSON.stringify({ descricao, tipo, instrucoes: 'Sugira até 3 códigos. O sistema validará os códigos no catálogo local.' })
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json', 'content-type': 'application/json',
        ...(isOpenRouter ? {
          Authorization: `Bearer ${openRouterKey}`,
          ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
          ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
        } : {}),
      },
      body: JSON.stringify(isOpenRouter ? {
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      } : { descricao, tipo }),
      signal: AbortSignal.timeout(Number(process.env.PCA_PROVIDER_TIMEOUT_MS || 5000)),
    })
    if (!response.ok) throw new Error(`Provider externo retornou ${response.status}`)
    const payload = await response.json() as { resultado?: unknown[]; suggestions?: unknown[]; sugestoes?: unknown[]; choices?: Array<{ message?: { content?: string } }> }
    let values: unknown[] = Array.isArray(payload.resultado) ? payload.resultado : Array.isArray(payload.suggestions) ? payload.suggestions : Array.isArray(payload.sugestoes) ? payload.sugestoes : []
    if (!values.length && payload.choices?.[0]?.message?.content) {
      const content = payload.choices[0].message.content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(content) as { sugestoes?: unknown[]; suggestions?: unknown[]; resultado?: unknown[] }
      values = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : Array.isArray(parsed.suggestions) ? parsed.suggestions : Array.isArray(parsed.resultado) ? parsed.resultado : []
    }
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
