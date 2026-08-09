'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { listarFavoritos, EVENTO_FAVORITOS } from '@/lib/favoritos'

export function FavoritosLink() {
  const [quantidade, setQuantidade] = useState(0)

  useEffect(() => {
    const sincronizar = () => setQuantidade(listarFavoritos().length)
    sincronizar()
    window.addEventListener(EVENTO_FAVORITOS, sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener(EVENTO_FAVORITOS, sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [])

  return (
    <Link
      href="/favoritos"
      className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 transition hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400"
      aria-label={`Favoritos (${quantidade})`}
    >
      <Heart className="h-4 w-4" />
      <span className="hidden sm:inline">Favoritos</span>
      {quantidade > 0 && (
        <span className="rounded-full bg-rose-100 dark:bg-rose-500/20 px-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">{quantidade}</span>
      )}
    </Link>
  )
}
