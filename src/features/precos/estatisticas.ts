import { prisma } from '@/lib/db'
import { linkBuscaPncp, montarLinkPncp } from '@/lib/pncp'

export const FONTE_PRECOS = 'Compras.gov.br / PNCP'

export interface CompraPreco {
  precoUnitario: number
  dataCompra: string | Date | null
  unidadeSigla?: string | null
  unidadeNome?: string | null
  unidadeCapacidade?: number | null
  quantidade?: number | null
  orgao?: string | null
  uasg?: string | null
  fornecedor?: string | null
  municipio?: string | null
  estado?: string | null
  marca?: string | null
  /** Identificador da compra (usado para montar o link de auditoria no PNCP). */
  idCompra?: number | string | null
}

export interface CompraDetalhe {
  precoUnitario: number
  dataCompra: string | null
  unidade: string | null
  quantidade: number | null
  orgao: string | null
  uasg: string | null
  fornecedor: string | null
  municipio: string | null
  estado: string | null
  marca: string | null
  idCompra?: number | string | null
  /** Link de auditoria da compra no PNCP (resolução oficial) ou fallback. */
  link_evidencia?: string | null
}

export interface UnidadeDisponivel {
  sigla: string
  nome: string
  capacidade: number | null
  quantidadeCompras: number
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
  limiteInferior: number | null
  limiteSuperior: number | null
}

export interface PontoPreco {
  data: string
  preco: number
  outlier: boolean
  unidade: string | null
  orgao: string | null
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
    limiteInferior: null,
    limiteSuperior: null,
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
    limiteInferior: Number(limiteInferior.toFixed(4)),
    limiteSuperior: Number(limiteSuperior.toFixed(4)),
  }
}

export function extrairUnidades(compras: CompraPreco[]): UnidadeDisponivel[] {
  const unidades = new Map<string, UnidadeDisponivel>()
  for (const compra of compras) {
    const sigla = (compra.unidadeSigla || '').trim().toUpperCase()
    if (!sigla) continue
    const atual = unidades.get(sigla)
    if (atual) {
      atual.quantidadeCompras += 1
    } else {
      unidades.set(sigla, {
        sigla,
        nome: (compra.unidadeNome || sigla).trim(),
        capacidade: typeof compra.unidadeCapacidade === 'number' ? compra.unidadeCapacidade : null,
        quantidadeCompras: 1,
      })
    }
  }
  return [...unidades.values()].sort((a, b) => b.quantidadeCompras - a.quantidadeCompras)
}

async function comprasDoBanco(codigoItem: number): Promise<CompraPreco[]> {
  try {
    const rows = await prisma.compraItem.findMany({
      where: { codigoItemCatalogo: codigoItem },
      select: {
        idCompra: true,
        precoUnitario: true,
        dataCompra: true,
        siglaUnidadeFornecimento: true,
        nomeUnidadeFornecimento: true,
        capacidadeUnidadeFornecimento: true,
        quantidade: true,
        nomeOrgao: true,
        nomeUasg: true,
        nomeFornecedor: true,
        municipio: true,
        estado: true,
        marca: true,
      },
    })
    return rows.map((row) => ({
      idCompra: row.idCompra,
      precoUnitario: row.precoUnitario,
      dataCompra: row.dataCompra,
      unidadeSigla: row.siglaUnidadeFornecimento,
      unidadeNome: row.nomeUnidadeFornecimento,
      unidadeCapacidade: row.capacidadeUnidadeFornecimento,
      quantidade: row.quantidade,
      orgao: row.nomeOrgao,
      uasg: row.nomeUasg,
      fornecedor: row.nomeFornecedor,
      municipio: row.municipio,
      estado: row.estado,
      marca: row.marca,
    }))
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
    const texto = (valor: unknown) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null)
    return resultado.map((compra: Record<string, unknown>) => ({
      idCompra: typeof compra.idCompra === 'number' ? compra.idCompra : texto(compra.idCompra),
      precoUnitario: Number(compra.precoUnitario),
      dataCompra: texto(compra.dataCompra),
      unidadeSigla: texto(compra.siglaUnidadeFornecimento),
      unidadeNome: texto(compra.nomeUnidadeFornecimento),
      unidadeCapacidade: typeof compra.capacidadeUnidadeFornecimento === 'number' ? compra.capacidadeUnidadeFornecimento : null,
      quantidade: typeof compra.quantidade === 'number' ? compra.quantidade : null,
      orgao: texto(compra.nomeOrgao),
      uasg: texto(compra.nomeUasg),
      fornecedor: texto(compra.nomeFornecedor),
      municipio: texto(compra.municipio),
      estado: texto(compra.estado),
      marca: texto(compra.marca),
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

// Grava o resumo de atividade do item (fire-and-forget) — alimenta o selo
// "tem histórico de preços" na busca. Erro aqui nunca afeta a resposta.
function registrarResumo(codigoItem: number, compras: CompraPreco[]) {
  const datas = compras
    .map((compra) => (compra.dataCompra ? new Date(compra.dataCompra).getTime() : NaN))
    .filter((tempo) => Number.isFinite(tempo))
    .sort((a, b) => a - b)

  void prisma.precoResumo.upsert({
    where: { codigoItem },
    create: {
      codigoItem,
      quantidadeCompras: compras.length,
      periodoInicio: datas.length ? new Date(datas[0]) : null,
      periodoFim: datas.length ? new Date(datas[datas.length - 1]) : null,
    },
    update: {
      quantidadeCompras: compras.length,
      periodoInicio: datas.length ? new Date(datas[0]) : null,
      periodoFim: datas.length ? new Date(datas[datas.length - 1]) : null,
    },
  }).catch(() => {
    // tabela ausente ou banco indisponível: ignora silenciosamente
  })
}

// Fonte primária: cache local (CompraItem). Fallback: API de dados abertos ao vivo.
// Com `unidadeSigla`, as métricas consideram apenas compras naquela unidade de
// fornecimento — misturar unidades (ex.: comprimido vs. ampola) distorce a média.
export async function metricasDoItem(codigoItem: number, unidadeSigla?: string) {
  let compras = await comprasDoBanco(codigoItem)
  let origem: 'banco-local' | 'api-governo' = 'banco-local'

  if (!compras.length) {
    compras = await comprasDoGoverno(codigoItem)
    origem = 'api-governo'
  }

  registrarResumo(codigoItem, compras)

  const unidades = extrairUnidades(compras)
  const siglaNormalizada = (unidadeSigla || '').trim().toUpperCase()
  const consideradas = siglaNormalizada
    ? compras.filter((compra) => (compra.unidadeSigla || '').trim().toUpperCase() === siglaNormalizada)
    : compras

  const metricas = calcularMetricas(consideradas)

  // Série para o gráfico de dispersão: até 200 compras com data válida,
  // cada uma marcada como outlier ou não pelos limites do IQR
  const seriePrecos: PontoPreco[] = consideradas
    .filter((compra) => compra.dataCompra && Number.isFinite(Number(compra.precoUnitario)) && Number(compra.precoUnitario) > 0)
    .sort((a, b) => new Date(a.dataCompra as string | Date).getTime() - new Date(b.dataCompra as string | Date).getTime())
    .slice(-200)
    .map((compra) => {
      const preco = Number(compra.precoUnitario)
      const outlier = metricas.limiteInferior !== null && metricas.limiteSuperior !== null
        ? preco < metricas.limiteInferior || preco > metricas.limiteSuperior
        : false
      return {
        data: new Date(compra.dataCompra as string | Date).toISOString(),
        preco,
        outlier,
        unidade: compra.unidadeNome || compra.unidadeSigla || null,
        orgao: compra.orgao ?? null,
      }
    })

  const comprasRecentes: CompraDetalhe[] = await Promise.all(
    [...consideradas]
      .sort((a, b) => new Date(b.dataCompra ?? 0).getTime() - new Date(a.dataCompra ?? 0).getTime())
      .slice(0, 10)
      .map(async (compra) => {
        let link_evidencia: string | null = null
        if (compra.idCompra != null) {
          const id = String(compra.idCompra)
          link_evidencia = (await montarLinkPncp(id).catch(() => null)) ?? linkBuscaPncp(id)
        }
        return {
          precoUnitario: Number(compra.precoUnitario),
          dataCompra: compra.dataCompra ? new Date(compra.dataCompra).toISOString() : null,
          unidade: compra.unidadeNome || compra.unidadeSigla || null,
          quantidade: compra.quantidade ?? null,
          orgao: compra.orgao ?? null,
          uasg: compra.uasg ?? null,
          fornecedor: compra.fornecedor ?? null,
          municipio: compra.municipio ?? null,
          estado: compra.estado ?? null,
          marca: compra.marca ?? null,
          idCompra: compra.idCompra ?? null,
          link_evidencia,
        }
      }),
  )

  return {
    ...metricas,
    origem,
    fonte: FONTE_PRECOS,
    unidades,
    unidadeSelecionada: siglaNormalizada || null,
    comprasRecentes,
    seriePrecos,
  }
}
