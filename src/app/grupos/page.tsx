import type { Metadata } from 'next'
import { CatmatService } from '@/features/catmar/catmat.service'
import { ListaGrupos } from '@/components/shared/ListaGrupos'

// Dinâmico: no build não há banco (renderizaria o mock e o ISR congelaria isso)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Grupos de Materiais CATMAT',
  description:
    'Navegue pelos grupos do Catálogo de Materiais do Governo Federal (CATMAT): equipamentos, medicamentos, papéis, informática e muito mais.',
}

export default async function GruposPage() {
  const service = new CatmatService()
  const grupos = await service.listarGrupos()
  const totalItens = grupos.reduce((total, grupo) => total + grupo.quantidade, 0)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Navegação por categoria</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Grupos de materiais</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            O catálogo CATMAT organiza {totalItens.toLocaleString('pt-BR')} materiais em {grupos.length} grupos.
            Escolha um grupo para ver os itens e refinar por classe e PDM.
          </p>
        </div>

        <ListaGrupos grupos={grupos} />
      </div>
    </main>
  )
}
