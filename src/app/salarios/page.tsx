import type { Metadata } from 'next'
import { SalariosSearch } from '@/components/salarios/SalariosSearch'

export const metadata: Metadata = {
  title: 'Pesquisa Salarial (CBO/INPC)',
  description: 'Pesquise salários por ocupação (CBO), visualize estatísticas por estado e atualize os valores pelo INPC.',
}

export default function SalariosPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-black/20 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">SALÁRIOS</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">Pesquisa salarial por CBO</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Pesquise salários por ocupação (CBO), visualize estatísticas nacionais por estado e atualize os valores pela
            correção do INPC até o mês atual.
          </p>
        </section>

        <SalariosSearch />
      </div>
    </main>
  )
}
