import { BuscaAvancada } from '@/components/shared/BuscaAvancada'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">MVP CATMAT/CATSER</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Consulta avançada para grade padronizada</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Busque itens por descrição, grupo, classe, PDM e margem de preferência, organize uma grade de seleção e exporte os resultados para uso posterior.
          </p>
        </section>

        <BuscaAvancada />
      </div>
    </main>
  )
}
