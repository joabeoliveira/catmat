// Rate limit em memória por processo (janela deslizante).
// Suficiente para instância única; em produção multi-instância, migrar para Redis.
const buckets = new Map<string, number[]>()

export function allowRequest(ip: string, limit = 60, windowMs = 60_000) {
  const now = Date.now()
  const windowStart = now - windowMs
  const entries = (buckets.get(ip) || []).filter((timestamp) => timestamp > windowStart)
  entries.push(now)
  buckets.set(ip, entries)
  return entries.length <= limit
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export function tooManyRequests() {
  return new Response(JSON.stringify({ erro: 'Muitas requisições em pouco tempo.' }), {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
  })
}
