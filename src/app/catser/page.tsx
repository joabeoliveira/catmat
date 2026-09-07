import type { Metadata } from 'next'
import { CatserSearch } from '@/components/catser/CatserSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = {
  title: 'Consulta CATSER',
  description: 'Busque serviços públicos e consulte preços por referência (CATSER).',
}

export default function CatserPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ModuleHeader module="Módulo CATSER" title="Consulta de serviços públicos" description="Pesquise serviços por descrição, visualize métricas de preços e acesse histórico de compras." />

        <CatserSearch />
      </div>
    </main>
  )
}
