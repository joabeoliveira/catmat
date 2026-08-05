/**
 * Cliente HTTP mínimo para uso server-side.
 * Mantém uma interface `get/post` semelhante ao axios, sem dependências externas.
 */

export interface ApiClientRequestConfig {
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface ApiClientResponse<T> {
  data: T
  status: number
  ok: boolean
}

function buildUrl(base: string, params?: Record<string, unknown>): string {
  if (!params) return base
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    query.append(key, String(value))
  }
  const queryString = query.toString()
  return queryString ? `${base}?${queryString}` : base
}

async function request<T>(
  method: 'GET' | 'POST',
  url: string,
  config: ApiClientRequestConfig = {},
  body?: unknown,
): Promise<ApiClientResponse<T>> {
  const finalUrl = buildUrl(url, config.params)
  const response = await fetch(finalUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(config.headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => null)) as T
  return {
    data,
    status: response.status,
    ok: response.ok,
  }
}

export const apiClient = {
  get<T = unknown>(url: string, config?: ApiClientRequestConfig) {
    return request<T>('GET', url, config)
  },
  post<T = unknown>(url: string, body?: unknown, config?: ApiClientRequestConfig) {
    return request<T>('POST', url, config, body)
  },
}

export default apiClient
