import type { Metadata } from 'next'
import { SalariosSearch } from '@/components/salarios/SalariosSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = {
  title: 'Pesquisa Salarial (CBO/INPC)',
  description: 'Pesquise salários por ocupação (CBO), visualize estatísticas por estado e atualize os valores pelo INPC.',
}

export default function SalariosPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ModuleHeader module="Módulo Salários" title="Pesquisa salarial por CBO" description="Pesquise salários por ocupação (CBO), visualize estatísticas nacionais por estado e atualize os valores pela correção do INPC até o mês atual." />

        <SalariosSearch />
      </div>
    </main>
  )
}
