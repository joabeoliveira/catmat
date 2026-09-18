import type { Metadata } from 'next'

import { AnpSearch } from '@/components/anp/AnpSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = {
  title: 'Preços ANP',
  description: 'Consulte preços semanais de combustíveis divulgados pela ANP.',
}

export default function AnpPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ModuleHeader
          module="Módulo ANP"
          title="Preços ANP"
          description="Consulte preços semanais de combustíveis divulgados pela Agência Nacional do Petróleo, Gás Natural e Biocombustíveis."
        />
        <AnpSearch />
      </div>
    </main>
  )
}
