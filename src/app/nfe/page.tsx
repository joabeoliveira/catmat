import type { Metadata } from 'next'
import { NFeReferenciaSearch } from '@/components/nfe/NFeReferenciaSearch'
import { NFeSearch } from '@/components/nfe/NFeSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = { title: { absolute: 'Consulta NF-e por chave' }, description: 'Consulte uma nota fiscal eletrônica pela chave de acesso no Portal da Transparência.' }

export default function NFePage() {
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6"><div className="print:hidden"><ModuleHeader module="Módulo NF-e" title="Consulta por chave de acesso" description="Pesquise itens de NF-e por descrição para formar referência de preços. Quando precisar, gere o documento auxiliar pela chave de acesso." /></div><NFeReferenciaSearch /><NFeSearch /></div></main>
}
