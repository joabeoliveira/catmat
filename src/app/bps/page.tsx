import type { Metadata } from 'next'
import { BpsReferenciaSearch } from '@/components/bps/BpsReferenciaSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = {
  title: 'Consulta BPS',
  description: 'Consulte referências de preços de medicamentos, materiais e insumos de saúde pela base BPS.',
}

export default function BpsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ModuleHeader module="Módulo BPS" title="Referência de preços em saúde" description="Busque medicamentos, insumos hospitalares e materiais de saúde por descrição, com filtros por localidade, fornecedor, fabricante e período." />

        <BpsReferenciaSearch />
      </div>
    </main>
  )
}
