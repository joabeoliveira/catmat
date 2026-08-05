import { apiClient } from '@/lib/api-client'
import type { CompraItem, MetricasPreco, FiltrosPreco, PrecoItemCompleto, EspurgoResultado } from './precos.types'

export class PrecosService {
  async pesquisarPrecosMaterial(
    codigoItem: number,
    filtros?: FiltrosPreco
  ): Promise<PrecoItemCompleto> {
    const params: Record<string, unknown> = {
      codigoItemCatalogo: codigoItem,
      dataResultado: true,
      tamanhoPagina: 500,
    }

    if (filtros?.dataCompraInicio) params.dataCompraInicio = filtros.dataCompraInicio
    if (filtros?.dataCompraFim) params.dataCompraFim = filtros.dataCompraFim
    if (filtros?.codigoUasg) params.codigoUasg = filtros.codigoUasg

    const baseUrl = process.env.PRECO_API_BASE_URL || 'https://dadosabertos.compras.gov.br'
    const response = await apiClient.get<{ resultado?: CompraItem[] }>(
      `${baseUrl}/modulo-pesquisa-preco/1_consultarMaterial`,
      { params },
    )

    const compras = response.data?.resultado ?? []

    return {
      compras,
      metricas: this.calcularMetricas(compras),
      unidadesDisponiveis: this.extrairUnidades(compras),
    }
  }

  calcularMetricas(compras: CompraItem[]): MetricasPreco {
    const precos = compras.map((c) => Number(c.precoUnitario)).filter((p) => Number.isFinite(p) && p > 0)

    if (precos.length === 0) {
      return { media: 0, mediana: 0, menor: 0, maior: 0, amostras: 0 }
    }

    const sorted = [...precos].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)

    return {
      media: Number((sum / sorted.length).toFixed(2)),
      mediana: sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)],
      menor: sorted[0],
      maior: sorted[sorted.length - 1],
      amostras: sorted.length,
      desvioPadrao: this.calcularDesvioPadrao(sorted, sum),
    }
  }

  extrairUnidades(compras: CompraItem[]): { sigla: string; nome: string; capacidade?: number }[] {
    const unidadesMap = new Map<string, { sigla: string; nome: string; capacidade?: number }>()

    for (const compra of compras) {
      const sigla = compra.siglaUnidadeFornecimento
      if (sigla && !unidadesMap.has(sigla)) {
        unidadesMap.set(sigla, {
          sigla,
          nome: compra.nomeUnidadeFornecimento || sigla,
          capacidade: compra.capacidadeUnidadeFornecimento,
        })
      }
    }

    return Array.from(unidadesMap.values())
  }

  calcularDesvioPadrao(precos: number[], sum: number): number {
    if (!precos.length) return 0
    const media = sum / precos.length
    const squareDiffs = precos.map((p) => Math.pow(p - media, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / precos.length
    return Number(Math.sqrt(avgSquareDiff).toFixed(2))
  }

  async espurgarPrecos(
    precos: number[],
    metodo: 'desvio_padrao' | 'iqr' = 'desvio_padrao',
    limiar: number = 2
  ): Promise<EspurgoResultado> {
    if (precos.length === 0) {
      return { precosFiltrados: [], outliers: [], precoSugerido: 0, novaMedia: 0, novoDesvioPadrao: 0 }
    }

    const sorted = [...precos].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const media = sum / sorted.length
    const desvio = this.calcularDesvioPadrao(sorted, sum)

    let precosFiltrados: number[]
    let outliers: number[]

    if (metodo === 'desvio_padrao') {
      const limiteInferior = media - (limiar * desvio)
      const limiteSuperior = media + (limiar * desvio)
      precosFiltrados = sorted.filter((p) => p >= limiteInferior && p <= limiteSuperior)
      outliers = sorted.filter((p) => p < limiteInferior || p > limiteSuperior)
    } else {
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const q3 = sorted[Math.floor(sorted.length * 0.75)]
      const iqr = q3 - q1
      const limiteInferior = q1 - 1.5 * iqr
      const limiteSuperior = q3 + 1.5 * iqr
      precosFiltrados = sorted.filter((p) => p >= limiteInferior && p <= limiteSuperior)
      outliers = sorted.filter((p) => p < limiteInferior || p > limiteSuperior)
    }

    const novaSoma = precosFiltrados.reduce((a, b) => a + b, 0)
    const novaMedia = precosFiltrados.length ? novaSoma / precosFiltrados.length : 0

    return {
      precosFiltrados,
      outliers,
      precoSugerido: Number(novaMedia.toFixed(2)),
      novaMedia: Number(novaMedia.toFixed(2)),
      novoDesvioPadrao: this.calcularDesvioPadrao(precosFiltrados, novaSoma),
    }
  }
}

export type { CompraItem, MetricasPreco, FiltrosPreco, PrecoItemCompleto, EspurgoResultado }