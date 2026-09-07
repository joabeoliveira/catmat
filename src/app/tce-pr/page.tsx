import type { Metadata } from 'next'
import { TcePrSearch } from '@/components/tcepr/TcePrSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

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
        <div className="print:hidden"><ModuleHeader module="Módulo TCE-PR" title="Pesquisa de preços de licitações homologadas" description="Pesquise por item licitado, município, modalidade ou fornecedor nas licitações municipais homologadas no Tribunal de Contas do Estado do Paraná. Use a ordenação por preço para formar sua referência de preços (IN 65/2021)." /></div>

        <TcePrSearch />
      </div>
    </main>
  )
}
