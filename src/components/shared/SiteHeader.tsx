import Link from 'next/link'
import { FavoritosLink } from './FavoritosLink'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-white">Consulta<span className="text-cyan-400">CATMAT</span></span>
        </Link>
        <nav aria-label="Menu principal" className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="rounded-md px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Busca
          </Link>
          <Link href="/grupos" className="rounded-md px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Grupos
          </Link>
          <FavoritosLink />
        </nav>
      </div>
    </header>
  )
}
