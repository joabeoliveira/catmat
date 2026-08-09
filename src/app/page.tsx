import type { Metadata } from 'next'
import { BuscaAvancada } from '@/components/shared/BuscaAvancada'
import { CatmatService } from '@/features/catmar/catmat.service'
import { getSiteUrl } from '@/lib/site-config'

interface HomePageProps {
  searchParams?: { q?: string; grupo?: string; classe?: string; pdm?: string; pagina?: string }
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const q = searchParams?.q?.trim()
  if (!q) {
    return {
      title: 'Consulta CATMAT — Catálogo de Materiais e Preços Públicos',
      description: 'Pesquise materiais CATMAT com compatibilidade, grade de cotação e filtros públicos.',
    }
  }

  return {
    title: `Resultados para "${q}" — CATMAT`,
    description: `Resultados de busca para ${q} no catálogo CATMAT.`,
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const service = new CatmatService()
  const q = searchParams?.q?.trim() || ''
  const temFiltros = Boolean(searchParams?.grupo || searchParams?.classe || searchParams?.pdm)
  const initialResults = (q || temFiltros)
    ? await service.buscarItens({
        termo: q,
        pagina: Number(searchParams?.pagina || 1),
        limite: 12,
        filtros: {
          codigoGrupo: searchParams?.grupo ? [Number(searchParams.grupo)] : undefined,
          codigoClasse: searchParams?.classe ? [Number(searchParams.classe)] : undefined,
          codigoPdm: searchParams?.pdm ? [Number(searchParams.pdm)] : undefined,
        },
      })
    : null

  const siteUrl = getSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Consulta CATMAT',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10 text-slate-900 dark:text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">MVP CATMAT/CATSER</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Consulta avançada para grade padronizada</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Busque itens por descrição, grupo, classe, PDM e margem de preferência, organize uma grade de seleção e exporte os resultados para uso posterior.
          </p>
        </section>

        <BuscaAvancada initialResults={initialResults} />
      </div>
    </main>
  )
}
