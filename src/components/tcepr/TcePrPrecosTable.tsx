'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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

  function alternarItem(index: number) {
    setExpandidos((prev) => ({ ...prev, [index]: !prev[index] }))
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

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => {
          const expandido = !!expandidos[index]
          return (
            <article
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Badge variant="secondary">{item.nmMunicipio}</Badge>
                <div className="text-right font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatarMoeda(item.vlLicitacaoVencedor)}
                </div>
              </div>
              <div className="mt-3 break-words">{expandido ? item.dsItem : resumir(item.dsItem, 180)}</div>
              {item.dsItem.length > 180 ? (
                <button
                  type="button"
                  onClick={() => alternarItem(index)}
                  className="mt-2 min-h-11 text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  {expandido ? 'Mostrar menos' : 'Ler mais'}
                </button>
              ) : null}
              <dl className="mt-3 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">Fornecedor</dt>
                  <dd className="break-words">{item.nmPessoa}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">Entidade</dt>
                  <dd className="break-words">{item.nmEntidade}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Modalidade</dt>
                  <dd>{item.dsModalidadeLicitacao}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Homologação</dt>
                  <dd>{formatarData(item.dtHomologacao)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Quantidade / unidade</dt>
                  <dd>
                    {item.nrQuantidade ?? '—'} {item.dsUnidadeMedida || ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Classificação</dt>
                  <dd>{item.nrClassificacao}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Município</th>
              <th className="px-3 py-2">Entidade</th>
              <th className="px-3 py-2">Modalidade</th>
              <th className="px-3 py-2">Homologação</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">CNPJ/CPF</th>
              <th className="px-3 py-2">Qtd</th>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Preço homologado</th>
              <th className="px-3 py-2">Class.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item, index) => {
              const expandido = !!expandidos[index]
              return (
                <tr key={item.id} className="bg-white dark:bg-slate-950/40">
                  <td className="max-w-[320px] px-3 py-2">
                    <div>
                      <div>{expandido ? item.dsItem : resumir(item.dsItem, 120)}</div>
                      {item.dsItem.length > 120 ? (
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
                  <td className="whitespace-nowrap px-3 py-2">{item.nmMunicipio}</td>
                  <td className="max-w-[200px] px-3 py-2">
                    <div className="truncate" title={item.nmEntidade}>
                      {item.nmEntidade}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{item.dsModalidadeLicitacao}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatarData(item.dtHomologacao)}</td>
                  <td className="max-w-[200px] px-3 py-2">
                    <div className="truncate" title={item.nmPessoa}>
                      {item.nmPessoa}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{item.nrDocumento}</td>
                  <td className="whitespace-nowrap px-3 py-2">{item.nrQuantidade ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{item.dsUnidadeMedida || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(item.vlLicitacaoVencedor)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{item.nrClassificacao}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
