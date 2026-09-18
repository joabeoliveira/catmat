import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import { AnpImportStatus } from '@/components/anp/AnpImportStatus'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = {
  title: 'Administração ANP',
  description: 'Acompanhe as importações semanais de dados da ANP.',
}

export default function AnpAdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ModuleHeader
          module="Módulo ANP"
          title="Administração ANP"
          description="Acompanhe o status das importações semanais, os registros persistidos e eventuais erros de processamento."
          icon={ShieldCheck}
        />
        <AnpImportStatus />
      </div>
    </main>
  )
}
