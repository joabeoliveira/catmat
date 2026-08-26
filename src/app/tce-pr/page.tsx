import type { Metadata } from 'next'
import { TcePrSearch } from '@/components/tcepr/TcePrSearch'

export const metadata: Metadata = {
  title: {
    absolute: 'Pesquisa de preços TCE-PR',
  },
  description:
    'Consulte preços de itens de licitações municipais homologadas no TCE-PR (Paraná) para formar referência de preços.',
}

export default function TcePrPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-black/20 print:hidden dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">
            TCE-PR
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
            Pesquisa de preços de licitações homologadas
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Pesquise por item licitado, município, modalidade ou fornecedor nas licitações municipais
            homologadas no Tribunal de Contas do Estado do Paraná. Use a ordenação por preço para
            formar sua referência de preços (IN 65/2021).
          </p>
        </section>

        <TcePrSearch />
      </div>
    </main>
  )
}
