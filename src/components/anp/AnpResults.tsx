'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { AnpLinhaNormalizada } from '@/features/anp/anp.types'

type AnpResultsProps = {
  items: AnpLinhaNormalizada[]
  carregando: boolean
  erro: string | null
}

const numero = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatarNome(valor: string): string {
  return valor
    .toLocaleLowerCase('pt-BR')
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

function sufixoUnidade(unidade: AnpLinhaNormalizada['unidade']): string {
  if (unidade === 'LITRO') return ' / L'
  if (unidade === 'TREZE_KG') return ' / 13kg'
  return ' / m³'
}

function formatarPreco(valor: number, unidade: AnpLinhaNormalizada['unidade']): string {
  return `${moeda.format(valor)}${sufixoUnidade(unidade)}`
}

function formatarNumero(valor: number | null): string {
  return valor === null || !Number.isFinite(valor) ? '—' : numero.format(valor)
}

function formatarLocalidade(item: AnpLinhaNormalizada): string {
  if (item.localidade) return item.localidade
  return [item.municipio, item.estado].filter(Boolean).join(' - ') || '—'
}

function CabecalhoTabela() {
  return (
    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <tr>
        <th className="whitespace-nowrap px-4 py-3">Abrangência</th>
        <th className="whitespace-nowrap px-4 py-3">Localidade</th>
        <th className="whitespace-nowrap px-4 py-3">Produto</th>
        <th className="whitespace-nowrap px-4 py-3">Unidade</th>
        <th className="whitespace-nowrap px-4 py-3">Preço médio</th>
        <th className="whitespace-nowrap px-4 py-3">Preço mínimo</th>
        <th className="whitespace-nowrap px-4 py-3">Preço máximo</th>
        <th className="whitespace-nowrap px-4 py-3">Desvio padrão</th>
        <th className="whitespace-nowrap px-4 py-3">Coef. variação</th>
        <th className="whitespace-nowrap px-4 py-3">Postos pesquisados</th>
      </tr>
    </thead>
  )
}

export function AnpResults({ items, carregando, erro }: AnpResultsProps) {
  if (carregando) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (erro) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        {erro}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        Nenhum resultado
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
      <table className="min-w-[1100px] w-full text-sm">
        <CabecalhoTabela />
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={`${item.abrangencia}-${item.localidade}-${item.produto}-${item.unidade}`} className="text-slate-700 dark:text-slate-300">
              <td className="whitespace-nowrap px-4 py-3">{formatarNome(item.abrangencia)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">{formatarLocalidade(item)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarNome(item.produto)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarNome(item.unidade)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium">{formatarPreco(item.precoMedio, item.unidade)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarPreco(item.precoMinimo, item.unidade)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarPreco(item.precoMaximo, item.unidade)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarNumero(item.desvioPadrao)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatarNumero(item.coefVariacao)}</td>
              <td className="whitespace-nowrap px-4 py-3">{numero.format(item.postosPesquisados)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
