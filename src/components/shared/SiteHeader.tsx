 'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FavoritosLink } from './FavoritosLink'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAberto(false)
    }

    window.addEventListener('keydown', fecharComEscape)
    return () => window.removeEventListener('keydown', fecharComEscape)
  }, [])

  const links = [
    ['/', 'CATMAT'],
    ['/catser', 'CATSER'],
    ['/grupos', 'Grupos'],
    ['/nfe', 'NF-e'],
    ['/bps', 'BPS'],
    ['/salarios', 'Salários'],
    ['/tce-pr', 'TCE-PR'],
  ] as const

  return (
    <header className="relative sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="whitespace-nowrap text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Consulta<span className="text-cyan-600 dark:text-cyan-400">CATMAT</span></span>
        </Link>
        <button
          type="button"
          aria-label={menuAberto ? 'Fechar menu principal' : 'Abrir menu principal'}
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-800 dark:text-slate-300 dark:hover:text-cyan-400 md:hidden"
        >
          {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <nav id="menu-principal" aria-label="Menu principal" data-tour="navegacao" className={`${menuAberto ? 'flex' : 'hidden'} absolute left-0 right-0 top-full flex-col gap-1 border-b border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:md:bg-transparent`}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenuAberto(false)} className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white md:min-h-0 md:py-1.5">
              {label}
            </Link>
          ))}
          <div className="flex items-center gap-2 border-t border-slate-200 pt-2 dark:border-slate-800 md:border-0 md:pt-0">
            <FavoritosLink />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  )
}
