import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-600 dark:text-slate-400">Consulta CATMAT</span>
          <span>·</span>
          <Link href="/" className="hover:text-cyan-600 dark:hover:text-cyan-400">Busca</Link>
          <span>·</span>
          <Link href="/grupos" className="hover:text-cyan-600 dark:hover:text-cyan-400">Grupos</Link>
          <span>·</span>
          <Link href="/favoritos" className="hover:text-cyan-600 dark:hover:text-cyan-400">Favoritos</Link>
        </div>
        <div>Dados oficiais: Compras.gov.br / PNCP 🇧🇷</div>
      </div>
    </footer>
  )
}
