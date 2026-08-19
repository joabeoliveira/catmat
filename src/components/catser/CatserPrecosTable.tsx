'use client'

import type { CatserPrecosResponse } from '@/features/catser/catser.types'

interface Props {
  data: CatserPrecosResponse
}

function formatarMoeda(valor: number | null | undefined) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleDateString('pt-BR')
}

export function CatserPrecosTable({ data }: Props) {
  const { metricas } = data
  const cards = [
    { label: 'Compras', valor: String(metricas.quantidade ?? 0) },
    { label: 'Menor preço', valor: formatarMoeda(metricas.menor) },
    { label: 'Preço médio', valor: formatarMoeda(metricas.media) },
    { label: 'Preço mediano', valor: formatarMoeda(metricas.mediana) },
    { label: 'Maior preço', valor: formatarMoeda(metricas.maior) },
  ]

  return (
    <section className="space-y-4 px-6 py-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Histórico de preços</h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{card.valor}</div>
          </div>
        ))}
      </div>

      {data.itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          Sem registros de preço para este serviço.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Data compra</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Preço unitário</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Poder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.itens.map((item, index) => (
                <tr key={`${item.idCompra}-${index}`} className="bg-white dark:bg-slate-950/40">
                  <td className="px-3 py-2">{formatarData(item.dataCompra)}</td>
                  <td className="px-3 py-2">{item.nomeFornecedor || '—'}</td>
                  <td className="px-3 py-2 font-medium text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(item.precoUnitario)}
                  </td>
                  <td className="px-3 py-2">{item.quantidade ?? '—'}</td>
                  <td className="px-3 py-2">{item.siglaUnidadeMedida || item.nomeUnidadeMedida || '—'}</td>
                  <td className="px-3 py-2">
                    {item.municipio ? `${item.municipio}${item.estado ? `/${item.estado}` : ''}` : item.estado || '—'}
                  </td>
                  <td className="px-3 py-2">{item.poder || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalRegistros > data.itens.length ? (
        <p className="text-xs text-slate-500">
          Mostrando os primeiros {data.itens.length} de {data.totalRegistros} registros.
        </p>
      ) : null}
    </section>
  )
}
