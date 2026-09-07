import type { Metadata } from 'next'
import { MedicamentosSearch } from '@/components/medicamentos/MedicamentosSearch'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const metadata: Metadata = { title: 'Consulta de Medicamentos', description: 'Pesquise medicamentos CATMAT por descrição, concentração e apresentação.' }

export default function MedicamentosPage() {
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6"><ModuleHeader module="Módulo Medicamentos" title="Consulta de medicamentos CATMAT" description="Pesquise medicamentos por princípio ativo, concentração, forma farmacêutica, código BR ou código CATMAT." /><MedicamentosSearch /></div></main>
}
