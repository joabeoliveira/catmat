import { prisma } from '@/lib/db'

export const FONTE_PRECOS = 'Compras.gov.br / PNCP'

export interface CompraPreco {
  precoUnitario: number
  dataCompra: string | Date | null
}

export interface MetricasPrecoItem {
  menor: number
  media: number
  mediana: number
  maior: number
  amostras: number
  quantidadeCompras: number
  quantidadeOutliersRemovidos: number
  periodoInicio: string | null
  periodoFim: string | null
}

function metricasVazias(): MetricasPrecoItem {
  return {
    menor: 0,
    media: 0,
    mediana: 0,
    maior: 0,
    amostras: 0,
    quantidadeCompras: 0,
    quantidadeOutliersRemovidos: 0,
    periodoInicio: null,
    periodoFim: null,
  }
}

// Estatísticas com corte de outliers por IQR (1,5x) sobre os preços unitários
export function calcularMetricas(compras: CompraPreco[]): MetricasPrecoItem {
  const precos = compras
    .map((compra) => Number(compra.precoUnitario))
    .filter((valor) => Number.isFinite(valor) && valor > 0)

  if (!precos.length) return metricasVazias()

  const sorted = [...precos].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0
  const iqr = q3 - q1
  const limiteInferior = q1 - 1.5 * iqr
  const limiteSuperior = q3 + 1.5 * iqr
  const precosFiltrados = sorted.filter((value) => value >= limiteInferior && value <= limiteSuperior)
  const outliers = sorted.filter((value) => value < limiteInferior || value > limiteSuperior)
  const media = precosFiltrados.length
    ? precosFiltrados.reduce((total, value) => total + value, 0) / precosFiltrados.length
    : 0
  const mediana = precosFiltrados.length % 2 === 0
    ? (precosFiltrados[Math.floor(precosFiltrados.length / 2) - 1] + precosFiltrados[precosFiltrados.length / 2]) / 2
    : precosFiltrados[Math.floor(precosFiltrados.length / 2)]

  const datas = compras
    .map((compra) => (compra.dataCompra ? new Date(compra.dataCompra).getTime() : NaN))
    .filter((tempo) => Number.isFinite(tempo))
    .sort((a, b) => a - b)

  return {
    menor: Number((precosFiltrados[0] ?? 0).toFixed(2)),
    media: Number(media.toFixed(2)),
    mediana: Number((mediana ?? 0).toFixed(2)),
    maior: Number((precosFiltrados[precosFiltrados.length - 1] ?? 0).toFixed(2)),
    amostras: precosFiltrados.length,
    quantidadeCompras: compras.length,
    quantidadeOutliersRemovidos: outliers.length,
    periodoInicio: datas.length ? new Date(datas[0]).toISOString() : null,
    periodoFim: datas.length ? new Date(datas[datas.length - 1]).toISOString() : null,
  }
}

async function comprasDoBanco(codigoItem: number): Promise<CompraPreco[]> {
  try {
    return await prisma.compraItem.findMany({
      where: { codigoItemCatalogo: codigoItem },
      select: { precoUnitario: true, dataCompra: true },
    })
  } catch {
    return []
  }
}

// Consulta ao vivo na API de dados abertos. Contrato vigente do endpoint
// 1_consultarMaterial: tipo=codigoItemCatalogo&codigo=<item>, tamanhoPagina 10-500.
// (O contrato antigo, ?codigoItemCatalogo=, passou a responder 404.)
async function comprasDoGoverno(codigoItem: number): Promise<CompraPreco[]> {
  const base = process.env.PRECO_API_BASE_URL || 'https://dadosabertos.compras.gov.br'

  const consultar = async (dataCompraInicio?: string): Promise<CompraPreco[]> => {
    const url = new URL(`${base}/modulo-pesquisa-preco/1_consultarMaterial`)
    url.searchParams.set('tipo', 'codigoItemCatalogo')
    url.searchParams.set('codigo', String(codigoItem))
    url.searchParams.set('pagina', '1')
    url.searchParams.set('tamanhoPagina', '500')
    if (dataCompraInicio) url.searchParams.set('dataCompraInicio', dataCompraInicio)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return []

    const payload = await response.json().catch(() => null)
    const resultado = Array.isArray(payload?.resultado) ? payload.resultado : []
    return resultado.map((compra: Record<string, unknown>) => ({
      precoUnitario: Number(compra.precoUnitario),
      dataCompra: typeof compra.dataCompra === 'string' ? compra.dataCompra : null,
    }))
  }

  try {
    // Prioriza os últimos 12 meses (referência da IN 65/2021); amplia se não houver dados recentes
    const umAnoAtras = new Date()
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)
    const recentes = await consultar(umAnoAtras.toISOString().slice(0, 10))
    if (recentes.length) return recentes
    return await consultar()
  } catch {
    return []
  }
}

// Fonte primária: cache local (CompraItem). Fallback: API de dados abertos ao vivo.
export async function metricasDoItem(codigoItem: number) {
  let compras = await comprasDoBanco(codigoItem)
  let origem: 'banco-local' | 'api-governo' = 'banco-local'

  if (!compras.length) {
    compras = await comprasDoGoverno(codigoItem)
    origem = 'api-governo'
  }

  return { ...calcularMetricas(compras), origem, fonte: FONTE_PRECOS }
}
