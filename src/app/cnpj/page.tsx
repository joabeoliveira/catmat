import type { Metadata } from 'next'
import { CnpjSearch } from '@/components/cnpj/CnpjSearch'

export const metadata: Metadata = {
  title: 'Consulta CNPJ',
  description: 'Consulte e enriqueça dados cadastrais de fornecedores pelo CNPJ.',
}

export default function CnpjPage() {
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto max-w-7xl space-y-6"><section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/60 dark:to-slate-900 sm:p-7"><p className="text-sm font-medium uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-300">FORNECEDORES</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Consulta CNPJ</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">Consulte dados cadastrais e enriqueça as informações dos fornecedores encontrados no módulo ARP.</p></section><CnpjSearch /></div></main>
}
