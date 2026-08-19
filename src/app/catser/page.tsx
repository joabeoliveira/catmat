import type { Metadata } from 'next'
import { CatserSearch } from '@/components/catser/CatserSearch'

export const metadata: Metadata = {
  title: 'Consulta CATSER',
  description: 'Busque serviços públicos e consulte preços por referência (CATSER).',
}

export default function CatserPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/20 dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">CATSER</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Consulta de serviços públicos</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Pesquise serviços por descrição, visualize métricas de preços e acesse histórico de compras.
          </p>
        </section>

        <CatserSearch />
      </div>
    </main>
  )
}
