import type { Metadata } from 'next'
import { NFeSearch } from '@/components/nfe/NFeSearch'

export const metadata: Metadata = {
  title: 'Consulta NF-e por chave',
  description: 'Consulte uma nota fiscal eletrônica pela chave de acesso no Portal da Transparência.',
}

export default function NFePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/20 dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">NF-e</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Consulta por chave de acesso</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Cole a chave de acesso da nota fiscal eletrônica para recuperar os dados e visualizar o DANFE.
          </p>
        </section>

        <NFeSearch />
      </div>
    </main>
  )
}
