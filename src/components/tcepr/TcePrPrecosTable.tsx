'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { TcePrItem, TcePrMetricas } from '@/features/tcepr/tcepr.types'

interface Props {
  items: TcePrItem[]
  metricas: TcePrMetricas | null
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

function resumir(texto: string, maximo: number) {
  if (!texto) return ''
  return texto.length > maximo ? `${texto.slice(0, maximo).trimEnd()}…` : texto
}

export function TcePrPrecosTable({ items, metricas }: Props) {
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({})
  const [copiadoId, setCopiadoId] = useState<number | null>(null)

  function alternarItem(index: number) {
    setExpandidos((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  async function copiarId(idLicitacao: number) {
    try {
      await navigator.clipboard.writeText(String(idLicitacao))
      setCopiadoId(idLicitacao)
      window.setTimeout(() => setCopiadoId(null), 1200)
    } catch {
      // noop
    }
  }

  const cards = [
    { label: 'Registros', valor: String(metricas?.quantidade ?? items.length) },
    { label: 'Menor preço', valor: formatarMoeda(metricas?.menor) },
    { label: 'Preço médio', valor: formatarMoeda(metricas?.media) },
    { label: 'Preço mediano', valor: formatarMoeda(metricas?.mediana) },
    { label: 'Maior preço', valor: formatarMoeda(metricas?.maior) },
  ]

  return (
    <section className="min-w-0 space-y-4">
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

      {/* Mobile: cards — foco no item */}
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => {
          const expandido = !!expandidos[index]
          return (
            <article
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Item</p>
                  <p className="mt-1 text-base font-semibold leading-snug text-slate-900 dark:text-white">
                    {expandido ? item.dsItem : resumir(item.dsItem, 240)}
                  </p>
                  {item.dsItem.length > 240 ? (
                    <button
                      type="button"
                      onClick={() => alternarItem(index)}
                      className="mt-1 min-h-11 text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      {expandido ? 'Mostrar menos' : 'Ler mais'}
                    </button>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-slate-500">Valor homologado</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(item.vlLicitacaoVencedor)}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Homologação</dt>
                  <dd>{formatarData(item.dtHomologacao)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Quantidade</dt>
                  <dd>
                    {item.nrQuantidade ?? '—'} {item.dsUnidadeMedida || ''}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-slate-500">Órgão</dt>
                  <dd className="break-words">{item.nmEntidade}</dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-slate-500">Fornecedor</dt>
                  <dd className="break-words">{item.nmPessoa}</dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs text-slate-500">Id da licitação</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">
                    {item.idLicitacao}
                    <button
                      type="button"
                      onClick={() => void copiarId(item.idLicitacao)}
                      title="Copiar id da licitação"
                      aria-label="Copiar id da licitação"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      {copiadoId === item.idLicitacao ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      {/* Desktop: tabela — foco no item */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Homologação</th>
              <th className="px-3 py-2">Qtd</th>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Valor unitário homologado</th>
              <th className="px-3 py-2">Órgão</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Id licitação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item, index) => {
              const expandido = !!expandidos[index]
              return (
                <tr key={item.id} className="bg-white dark:bg-slate-950/40">
                  <td className="max-w-[360px] px-3 py-2">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {expandido ? item.dsItem : resumir(item.dsItem, 160)}
                      </div>
                      {item.dsItem.length > 160 ? (
                        <button
                          type="button"
                          onClick={() => alternarItem(index)}
                          className="mt-1 text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
                        >
                          {expandido ? 'Mostrar menos' : 'Ler mais'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatarData(item.dtHomologacao)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{item.nrQuantidade ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{item.dsUnidadeMedida || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(item.vlLicitacaoVencedor)}
                  </td>
                  <td className="max-w-[220px] px-3 py-2">
                    <div className="truncate" title={item.nmEntidade}>
                      {item.nmEntidade}
                    </div>
                  </td>
                  <td className="max-w-[200px] px-3 py-2">
                    <div className="truncate" title={item.nmPessoa}>
                      {item.nmPessoa}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{item.idLicitacao}</span>
                      <button
                        type="button"
                        onClick={() => void copiarId(item.idLicitacao)}
                        title="Copiar id da licitação"
                        aria-label="Copiar id da licitação"
                        className="rounded p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                      >
                        {copiadoId === item.idLicitacao ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
