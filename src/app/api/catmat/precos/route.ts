import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const precos = Array.isArray(body?.precos) ? body.precos : []

  const sorted = [...precos].sort((a, b) => Number(a) - Number(b))
  const media = sorted.length ? sorted.reduce((total, value) => total + Number(value), 0) / sorted.length : 0
  const desvio = sorted.length ? Math.sqrt(sorted.reduce((total, value) => total + Math.pow(Number(value) - media, 2), 0) / sorted.length) : 0

  return NextResponse.json({
    metricas: {
      menor: sorted[0] ?? 0,
      media: Number(media.toFixed(2)),
      mediana: sorted.length % 2 === 0 ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)],
      maior: sorted[sorted.length - 1] ?? 0,
      desvioPadrao: Number(desvio.toFixed(2)),
      amostras: sorted.length,
    },
  })
}
