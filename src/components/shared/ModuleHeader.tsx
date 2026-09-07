import type { LucideIcon } from 'lucide-react'
import { Layers3 } from 'lucide-react'

export function ModuleHeader({ module, title, description, icon: Icon = Layers3, action }: { module: string; title: string; description: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm dark:border-cyan-900 dark:from-cyan-950/60 dark:to-slate-900 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex min-w-0 items-start gap-3"><div className="shrink-0 rounded-xl bg-cyan-600 p-2.5 text-white"><Icon className="h-6 w-6" /></div><div className="min-w-0"><p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">{module}</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">{description}</p></div></div>{action ? <div className="shrink-0">{action}</div> : null}</div></section>
}
