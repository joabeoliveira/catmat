import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { precosRequestSchema } from '@/features/catmar/catmat.schema'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const parsed = precosRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ erro: 'Payload inválido', detalhes: parsed.error.issues.map((issue) => issue.message) }, { status: 400 })
  }

  const payload = parsed.data

  if (payload.codigoItem !== undefined) {
    const compras = await prisma.compraItem.findMany({
      where: { codigoItemCatalogo: Number(payload.codigoItem) },
      orderBy: { dataCompra: 'asc' },
      select: { precoUnitario: true, dataCompra: true },
    })

    const precos = compras.map((compra) => Number(compra.precoUnitario)).filter((valor) => Number.isFinite(valor) && valor > 0)
    if (!precos.length) {
      return NextResponse.json({
        metricas: {
          menor: 0,
          media: 0,
          mediana: 0,
          maior: 0,
          amostras: 0,
          quantidadeCompras: 0,
          quantidadeOutliersRemovidos: 0,
          periodoInicio: null,
          periodoFim: null,
          fonte: 'Compras.gov.br / PNCP',
        },
      })
    }

    const sorted = [...precos].sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0
    const iqr = q3 - q1
    const limiteInferior = q1 - 1.5 * iqr
    const limiteSuperior = q3 + 1.5 * iqr
    const precosFiltrados = sorted.filter((value) => value >= limiteInferior && value <= limiteSuperior)
    const outliers = sorted.filter((value) => value < limiteInferior || value > limiteSuperior)
    const media = precosFiltrados.length ? precosFiltrados.reduce((total, value) => total + value, 0) / precosFiltrados.length : 0
    const mediana = precosFiltrados.length % 2 === 0
      ? (precosFiltrados[Math.floor(precosFiltrados.length / 2) - 1] + precosFiltrados[precosFiltrados.length / 2]) / 2
      : precosFiltrados[Math.floor(precosFiltrados.length / 2)]

    return NextResponse.json({
      metricas: {
        menor: Number((precosFiltrados[0] ?? 0).toFixed(2)),
        media: Number(media.toFixed(2)),
        mediana: Number(mediana.toFixed(2)),
        maior: Number((precosFiltrados[precosFiltrados.length - 1] ?? 0).toFixed(2)),
        amostras: precosFiltrados.length,
        quantidadeCompras: compras.length,
        quantidadeOutliersRemovidos: outliers.length,
        periodoInicio: compras[0]?.dataCompra ? new Date(compras[0].dataCompra).toISOString() : null,
        periodoFim: compras[compras.length - 1]?.dataCompra ? new Date(compras[compras.length - 1].dataCompra).toISOString() : null,
        fonte: 'Compras.gov.br / PNCP',
      },
    })
  }

  const precos = (Array.isArray(payload.precos) ? payload.precos : []).map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value) && value > 0)

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
      periodoInicio: payload.periodoInicio || null,
      periodoFim: payload.periodoFim || null,
      fonte: 'Compras.gov.br / PNCP',
    },
  })
}
