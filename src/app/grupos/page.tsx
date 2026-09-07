import type { Metadata } from 'next'
import { CatmatService } from '@/features/catmar/catmat.service'
import { ListaGrupos } from '@/components/shared/ListaGrupos'
import { ModuleHeader } from '@/components/shared/ModuleHeader'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Grupos de Materiais CATMAT', description: 'Navegue pelos grupos do catálogo CATMAT.' }

export default async function GruposPage() {
  const grupos = await new CatmatService().listarGrupos()
  const totalItens = grupos.reduce((total, grupo) => total + grupo.quantidade, 0)
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6"><ModuleHeader module="Módulo Grupos" title="Grupos de materiais" description={`O catálogo CATMAT organiza ${totalItens.toLocaleString('pt-BR')} materiais em ${grupos.length} grupos. Escolha um grupo para ver os itens e refinar por classe e PDM.`} /><ListaGrupos grupos={grupos} /></div></main>
}
