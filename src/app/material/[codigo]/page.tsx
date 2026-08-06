import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CatmatService } from '@/features/catmar/catmat.service'

interface MaterialPageProps {
  params: { codigo: string }
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const service = new CatmatService()
  const item = await service.obterItem(Number(params.codigo))

  if (!item) {
    return {
      title: 'Material não encontrado',
      description: 'O item solicitado não foi encontrado no catálogo CATMAT.',
    }
  }

  return {
    title: `${item.nomePdm} — CATMAT ${item.codigoItem}`,
    description: item.descricaoItem.slice(0, 155),
  }
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const service = new CatmatService()
  const item = await service.obterItem(Number(params.codigo))

  if (!item) {
    notFound()
  }

  const relacionados = (await service.buscarItens({ termo: item.nomePdm, pagina: 1, limite: 10 })).items.filter((candidate) => candidate.codigoItem !== item.codigoItem).slice(0, 10)

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Detalhes do material</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{item.nomePdm}</h1>
          <p className="mt-3 text-sm text-slate-300">{item.descricaoItem}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
            <span className="rounded-full border border-slate-700 px-3 py-1">CATMAT {item.codigoItem}</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Grupo {item.codigoGrupo}</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Classe {item.codigoClasse}</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">PDM {item.codigoPdm}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Hierarquia</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div>
                <span className="text-slate-400">Grupo:</span>{' '}
                <Link href={`/?grupo=${item.codigoGrupo}`} className="text-cyan-400 hover:underline">{item.codigoGrupo} — {item.nomeGrupo}</Link>
              </div>
              <div>
                <span className="text-slate-400">Classe:</span>{' '}
                <Link href={`/?classe=${item.codigoClasse}`} className="text-cyan-400 hover:underline">{item.codigoClasse} — {item.nomeClasse}</Link>
              </div>
              <div>
                <span className="text-slate-400">PDM:</span>{' '}
                <Link href={`/?grupo=${item.codigoGrupo}&classe=${item.codigoClasse}`} className="text-cyan-400 hover:underline">{item.codigoPdm} — {item.nomePdm}</Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Estatísticas de preço</h2>
            <p className="mt-3 text-sm text-slate-400">Sem histórico de compras registrado.</p>
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Itens do mesmo PDM</h2>
            <div className="mt-4 grid gap-3">
              {relacionados.map((candidate) => (
                <Link key={candidate.codigoItem} href={`/material/${candidate.codigoItem}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300 hover:border-cyan-500">
                  <div className="font-medium text-white">{candidate.descricaoItem}</div>
                  <div className="mt-1 text-slate-400">CATMAT {candidate.codigoItem}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
