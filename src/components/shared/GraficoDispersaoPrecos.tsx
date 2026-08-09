'use client'

import { useMemo, useState } from 'react'

export interface PontoGrafico {
  data: string
  preco: number
  outlier: boolean
  unidade: string | null
  orgao: string | null
}

interface GraficoDispersaoPrecosProps {
  pontos: PontoGrafico[]
  mediana: number
  limiteSuperior?: number | null
}

// Paleta validada para superfície escura (dataviz: 6 checks OK):
// compras #0891b2 (ciano) · outliers #b45309 (âmbar) + forma distinta (losango)
const COR_COMPRA = '#0891b2'
const COR_OUTLIER = '#b45309'
const COR_SUPERFICIE = '#0f172a'
const COR_GRADE = '#1e293b'
const COR_TEXTO = '#64748b'

const LARGURA = 720
const ALTURA = 260
const MARGEM = { top: 20, right: 16, bottom: 30, left: 76 }

function formatarMoeda(valor: number) {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatarDataCurta(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit', timeZone: 'UTC' })
}

function formatarDataLonga(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

// Ticks "redondos" para o eixo Y (1/2/5 × 10^n)
function ticksY(maximo: number, quantidade = 4): number[] {
  if (maximo <= 0) return [0]
  const passoBruto = maximo / quantidade
  const expoente = Math.floor(Math.log10(passoBruto))
  const base = Math.pow(10, expoente)
  const passo = [1, 2, 5, 10].map((m) => m * base).find((valor) => valor >= passoBruto) ?? base * 10
  const ticks: number[] = []
  for (let valor = 0; valor <= maximo + passo * 0.001; valor += passo) {
    ticks.push(Number(valor.toFixed(6)))
  }
  return ticks
}

export function GraficoDispersaoPrecos({ pontos, mediana, limiteSuperior }: GraficoDispersaoPrecosProps) {
  const [ativo, setAtivo] = useState<{ ponto: PontoGrafico; x: number; y: number } | null>(null)

  const layout = useMemo(() => {
    const tempos = pontos.map((ponto) => new Date(ponto.data).getTime())
    const precos = pontos.map((ponto) => ponto.preco)
    const tMin = Math.min(...tempos)
    const tMax = Math.max(...tempos)

    // Teto da escala: faixa dos preços considerados (limite IQR), não o outlier
    // extremo — um lançamento errado de R$ 20.000 não pode esmagar os R$ 0,13
    // reais na linha de base. Outliers acima do teto são fixados no topo.
    const precoMax = Math.max(...precos, mediana)
    const teto = typeof limiteSuperior === 'number' && limiteSuperior > 0
      ? Math.min(precoMax, limiteSuperior * 1.35)
      : precoMax
    const yTicks = ticksY(teto * 1.05)
    const yMax = yTicks[yTicks.length - 1] || teto || 1

    const larguraUtil = LARGURA - MARGEM.left - MARGEM.right
    const alturaUtil = ALTURA - MARGEM.top - MARGEM.bottom
    const escalaX = (tempo: number) => tMax === tMin
      ? MARGEM.left + larguraUtil / 2
      : MARGEM.left + ((tempo - tMin) / (tMax - tMin)) * larguraUtil
    const escalaY = (preco: number) => MARGEM.top + alturaUtil - (preco / yMax) * alturaUtil

    // Ticks do eixo X: 4 datas distribuídas no período
    const xTicks = [0, 1 / 3, 2 / 3, 1].map((fracao) => tMin + fracao * (tMax - tMin))

    const posicoes = pontos.map((ponto, index) => {
      const foraDaEscala = ponto.preco > yMax
      return {
        ponto,
        x: escalaX(tempos[index]),
        y: foraDaEscala ? MARGEM.top + 2 : escalaY(ponto.preco),
        foraDaEscala,
      }
    })

    return { posicoes, yTicks, xTicks, escalaY, yMax, tMin, tMax }
  }, [pontos, mediana, limiteSuperior])

  const totalOutliers = pontos.filter((ponto) => ponto.outlier).length
  const yMediana = layout.escalaY(mediana)

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill={COR_COMPRA} /></svg>
          Compra considerada ({pontos.length - totalOutliers})
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="12" height="12" aria-hidden="true"><rect x="6" y="0.5" width="8" height="8" fill={COR_OUTLIER} transform="rotate(45 6 6)" /></svg>
          Fora do padrão — excluído das médias ({totalOutliers})
        </span>
      </div>

      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="w-full"
        role="img"
        aria-label={`Gráfico de dispersão de ${pontos.length} preços licitados ao longo do tempo; mediana ${formatarMoeda(mediana)}`}
      >
        {layout.yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={MARGEM.left}
              x2={LARGURA - MARGEM.right}
              y1={layout.escalaY(tick)}
              y2={layout.escalaY(tick)}
              stroke={COR_GRADE}
              strokeWidth="1"
            />
            <text x={MARGEM.left - 8} y={layout.escalaY(tick) + 3.5} textAnchor="end" fontSize="11" fill={COR_TEXTO}>
              {formatarMoeda(tick)}
            </text>
          </g>
        ))}

        {layout.xTicks.map((tempo, index) => (
          <text
            key={`x-${index}`}
            x={layout.posicoes.length ? MARGEM.left + (index / 3) * (LARGURA - MARGEM.left - MARGEM.right) : 0}
            y={ALTURA - 8}
            textAnchor="middle"
            fontSize="11"
            fill={COR_TEXTO}
          >
            {formatarDataCurta(new Date(tempo).toISOString())}
          </text>
        ))}

        <line
          x1={MARGEM.left}
          x2={LARGURA - MARGEM.right}
          y1={yMediana}
          y2={yMediana}
          stroke="#94a3b8"
          strokeWidth="1"
        />

        {layout.posicoes.map(({ ponto, x, y, foraDaEscala }, index) => (
          <g key={index}>
            {foraDaEscala ? (
              <path
                d={`M ${x} ${y} l 5.5 9 l -11 0 Z`}
                fill={COR_OUTLIER}
                stroke={COR_SUPERFICIE}
                strokeWidth="2"
              />
            ) : ponto.outlier ? (
              <rect
                x={x - 4.5}
                y={y - 4.5}
                width="9"
                height="9"
                transform={`rotate(45 ${x} ${y})`}
                fill={COR_OUTLIER}
                stroke={COR_SUPERFICIE}
                strokeWidth="2"
              />
            ) : (
              <circle cx={x} cy={y} r="4.5" fill={COR_COMPRA} stroke={COR_SUPERFICIE} strokeWidth="2" />
            )}
            <circle
              cx={x}
              cy={y}
              r="14"
              fill="transparent"
              tabIndex={0}
              aria-label={`${formatarMoeda(ponto.preco)} em ${formatarDataLonga(ponto.data)}`}
              onMouseEnter={() => setAtivo({ ponto, x, y })}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo({ ponto, x, y })}
              onBlur={() => setAtivo(null)}
              style={{ outline: 'none', cursor: 'pointer' }}
            />
          </g>
        ))}

        <text
          x={LARGURA - MARGEM.right}
          y={yMediana - 8}
          textAnchor="end"
          fontSize="11"
          fill="#cbd5e1"
          stroke={COR_SUPERFICIE}
          strokeWidth="4"
          paintOrder="stroke"
        >
          Mediana {formatarMoeda(mediana)}
        </text>
      </svg>

      {ativo && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl"
          style={{
            left: `${(ativo.x / LARGURA) * 100}%`,
            top: `${(ativo.y / ALTURA) * 100}%`,
            transform: `translate(${ativo.x > LARGURA * 0.7 ? '-105%' : '10px'}, -110%)`,
          }}
        >
          <div className="text-sm font-semibold text-white">{formatarMoeda(ativo.ponto.preco)}</div>
          <div className="mt-0.5 text-slate-400">
            {formatarDataLonga(ativo.ponto.data)}
            {ativo.ponto.unidade ? ` · ${ativo.ponto.unidade}` : ''}
          </div>
          {ativo.ponto.orgao && <div className="mt-0.5 max-w-[240px] truncate text-slate-500">{ativo.ponto.orgao}</div>}
          {ativo.ponto.outlier && <div className="mt-1 text-amber-500">Fora do padrão — excluído das médias</div>}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Cada ponto é um preço licitado na data da compra. Marcas em âmbar estão fora do intervalo
        interquartil (IQR × 1,5) e não entram no cálculo de média e mediana; triângulos no topo indicam
        valores acima da escala do gráfico (passe o mouse para ver o valor real).
      </p>
    </div>
  )
}
