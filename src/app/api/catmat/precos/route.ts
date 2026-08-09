import { NextResponse } from 'next/server'
import { precosRequestSchema } from '@/features/catmar/catmat.schema'
import { calcularMetricas, metricasDoItem, FONTE_PRECOS } from '@/features/precos/estatisticas'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const codigoItem = Number(searchParams.get('codigoItem'))
  if (!Number.isInteger(codigoItem) || codigoItem <= 0) {
    return NextResponse.json({ erro: 'Parâmetro codigoItem inválido' }, { status: 400 })
  }

  const metricas = await metricasDoItem(codigoItem)
  return NextResponse.json(
    { metricas },
    { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' } },
  )
}

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const body = await request.json().catch(() => ({}))
  const parsed = precosRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ erro: 'Payload inválido', detalhes: parsed.error.issues.map((issue) => issue.message) }, { status: 400 })
  }

  const payload = parsed.data

  if (payload.codigoItem !== undefined) {
    const metricas = await metricasDoItem(Number(payload.codigoItem))
    return NextResponse.json({ metricas })
  }

  // Modo "espurgo": estatísticas sobre uma lista de preços enviada pelo cliente
  const precos = (Array.isArray(payload.precos) ? payload.precos : [])
    .map((value: unknown) => Number(value))
    .filter((value: number) => Number.isFinite(value) && value > 0)

  const metricas = calcularMetricas(precos.map((precoUnitario) => ({ precoUnitario, dataCompra: null })))
  return NextResponse.json({
    metricas: {
      ...metricas,
      periodoInicio: payload.periodoInicio || null,
      periodoFim: payload.periodoFim || null,
      fonte: FONTE_PRECOS,
    },
  })
}
