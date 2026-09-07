import type { Metadata } from 'next'
import { CnpjSearch } from '@/components/cnpj/CnpjSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Consulta CNPJ',
  description: 'Consulte e enriqueça dados cadastrais de fornecedores pelo CNPJ.',
}

export default function CnpjPage() {
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto max-w-7xl space-y-6"><ModuleHeader module="Módulo CNPJ" title="Consulta CNPJ" description="Consulte dados cadastrais e enriqueça as informações dos fornecedores encontrados no módulo ARP." icon={Building2} /><CnpjSearch /></div></main>
}
