'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function VoltarButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        // Se chegou por link direto (sem histórico), volta para a busca
        if (window.history.length > 1) router.back()
        else router.push('/')
      }}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  )
}
