'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import type { CatserPrecosResponse } from '@/features/catser/catser.types'

const URL_PNCP = 'https://pncp.gov.br/app/compras'

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
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({})
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  function alternarObjeto(index: number) {
    setExpandidos((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  async function copiarId(idCompra: string) {
    try {
      await navigator.clipboard.writeText(idCompra)
      setCopiadoId(idCompra)
      window.setTimeout(() => setCopiadoId(null), 1200)
    } catch {
      // noop
    }
  }

  function resumir(texto: string | null | undefined, maximo: number) {
    if (!texto) return ''
    return texto.length > maximo ? `${texto.slice(0, maximo).trimEnd()}…` : texto
  }

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
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Data compra</th>
                <th className="px-3 py-2">ID Compra</th>
                <th className="px-3 py-2">Órgão (UASG)</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Objeto</th>
                <th className="px-3 py-2">Preço unitário</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Poder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.itens.map((item, index) => {
                const objeto = item.objetoCompra || item.descricaoItem || ''
                const expandido = !!expandidos[index]
                const objetoResumo = resumir(objeto, 90)
                return (
                  <tr key={`${item.idCompra}-${index}`} className="bg-white dark:bg-slate-950/40">
                    <td className="whitespace-nowrap px-3 py-2">{formatarData(item.dataCompra)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {item.idCompra ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{item.idCompra}</span>
                          <button
                            type="button"
                            onClick={() => void copiarId(item.idCompra!)}
                            title="Copiar ID da compra"
                            aria-label="Copiar ID da compra"
                            className="rounded p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                          >
                            {copiadoId === item.idCompra ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <a
                            href={item.linkPncp ?? `${URL_PNCP}?busca=${encodeURIComponent(item.idCompra)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver compra no PNCP (Compras.gov.br)"
                            aria-label="Ver compra no PNCP"
                            className="rounded p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[220px] px-3 py-2">
                      <div className="truncate" title={item.nomeUasg || ''}>
                        {item.nomeUasg || '—'}
                      </div>
                      {item.codigoUasg ? (
                        <div className="text-xs text-slate-500">UASG {item.codigoUasg}</div>
                      ) : null}
                    </td>
                    <td className="max-w-[180px] px-3 py-2">
                      <div className="truncate" title={item.nomeFornecedor || ''}>
                        {item.nomeFornecedor || '—'}
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-2">
                      {objeto ? (
                        <div>
                          <div>{expandido ? objeto : objetoResumo}</div>
                          {objeto.length > 90 ? (
                            <button
                              type="button"
                              onClick={() => alternarObjeto(index)}
                              className="mt-1 text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
                            >
                              {expandido ? 'Mostrar menos' : 'Ler mais'}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-700 dark:text-emerald-300">
                      {formatarMoeda(item.precoUnitario)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{item.quantidade ?? '—'}</td>
                    <td className="px-3 py-2">
                      {[item.siglaUnidadeMedida, item.nomeUnidadeMedida].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {item.municipio ? `${item.municipio}${item.estado ? `/${item.estado}` : ''}` : item.estado || '—'}
                    </td>
                    <td className="px-3 py-2">{item.poder || '—'}</td>
                  </tr>
                )
              })}
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
