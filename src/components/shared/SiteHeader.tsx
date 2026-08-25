import Link from 'next/link'
import { FavoritosLink } from './FavoritosLink'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">Consulta<span className="text-cyan-600 dark:text-cyan-400">CATMAT</span></span>
        </Link>
        <nav aria-label="Menu principal" data-tour="navegacao" className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            CATMAT
          </Link>
          <Link href="/catser" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            CATSER
          </Link>
          <Link href="/grupos" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            Grupos
          </Link>
          <Link href="/nfe" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            NF-e
          </Link>
          <Link href="/bps" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            BPS
          </Link>
          <Link href="/salarios" className="rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
            Salários
          </Link>
          <FavoritosLink />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
