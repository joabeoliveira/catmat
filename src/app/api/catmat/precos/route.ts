import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const precos = (Array.isArray(body?.precos) ? body.precos : []).map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value) && value > 0)

  const sorted = [...precos].sort((a, b) => a - b)
  const media = sorted.length ? sorted.reduce((total, value) => total + value, 0) / sorted.length : 0
  const desvio = sorted.length ? Math.sqrt(sorted.reduce((total, value) => total + Math.pow(value - media, 2), 0) / sorted.length) : 0
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0
  const iqr = q3 - q1
  const limiteInferior = q1 - 1.5 * iqr
  const limiteSuperior = q3 + 1.5 * iqr
  const precosFiltrados = sorted.filter((value) => value >= limiteInferior && value <= limiteSuperior)
  const outliers = sorted.filter((value) => value < limiteInferior || value > limiteSuperior)

  return NextResponse.json({
    metricas: {
      menor: precosFiltrados[0] ?? 0,
      media: Number((precosFiltrados.length ? precosFiltrados.reduce((total, value) => total + value, 0) / precosFiltrados.length : media).toFixed(2)),
      mediana: precosFiltrados.length % 2 === 0 ? (precosFiltrados[Math.floor(precosFiltrados.length / 2) - 1] + precosFiltrados[precosFiltrados.length / 2]) / 2 : precosFiltrados[Math.floor(precosFiltrados.length / 2)],
      maior: precosFiltrados[precosFiltrados.length - 1] ?? 0,
      desvioPadrao: Number((precosFiltrados.length ? Math.sqrt(precosFiltrados.reduce((total, value) => total + Math.pow(value - (precosFiltrados.reduce((sum, current) => sum + current, 0) / precosFiltrados.length), 2), 0) / precosFiltrados.length) : desvio).toFixed(2)),
      amostras: precosFiltrados.length,
      quantidadeOutliersRemovidos: outliers.length,
      periodoInicio: body?.periodoInicio || null,
      periodoFim: body?.periodoFim || null,
    },
  })
}
