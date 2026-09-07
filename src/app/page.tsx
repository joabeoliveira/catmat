import type { Metadata } from 'next'
import { BuscaAvancada } from '@/components/shared/BuscaAvancada'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { TourGuiado } from '@/components/shared/TourGuiado'
import { CatmatService } from '@/features/catmar/catmat.service'
import { getSiteUrl } from '@/lib/site-config'

interface HomePageProps { searchParams?: { q?: string; refinar?: string; grupo?: string; classe?: string; pdm?: string; pagina?: string } }

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const q = searchParams?.q?.trim()
  return q ? { title: `Resultados para "${q}" — CATMAT`, description: `Resultados de busca para ${q} no catálogo CATMAT.` } : { title: 'Consulta CATMAT — Catálogo de Materiais e Preços Públicos', description: 'Pesquise materiais CATMAT com compatibilidade, grade de cotação e filtros públicos.' }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const service = new CatmatService(); const q = searchParams?.q?.trim() || ''; const refinar = searchParams?.refinar?.trim() || ''; const temFiltros = Boolean(searchParams?.grupo || searchParams?.classe || searchParams?.pdm)
  const initialResults = (q || temFiltros) ? await service.buscarItens({ termo: [q, refinar].filter(Boolean).join(' '), pagina: Number(searchParams?.pagina || 1), limite: 12, filtros: { codigoGrupo: searchParams?.grupo ? [Number(searchParams.grupo)] : undefined, codigoClasse: searchParams?.classe ? [Number(searchParams.classe)] : undefined, codigoPdm: searchParams?.pdm ? [Number(searchParams.pdm)] : undefined } }) : null
  const siteUrl = getSiteUrl(); const jsonLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Consulta CATMAT', url: siteUrl, potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }
  return <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><div className="mx-auto flex max-w-7xl flex-col gap-6"><ModuleHeader module="Módulo CATMAT" title="Consulta avançada para grade padronizada" description="Busque itens por descrição, grupo, classe, PDM e margem de preferência, organize uma grade de seleção e exporte os resultados para uso posterior." /><BuscaAvancada initialResults={initialResults} /></div><TourGuiado /></main>
}
