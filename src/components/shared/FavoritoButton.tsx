'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { alternarFavorito, ehFavorito, EVENTO_FAVORITOS, type ItemFavorito } from '@/lib/favoritos'

interface FavoritoButtonProps {
  item: ItemFavorito
  comTexto?: boolean
}

export function FavoritoButton({ item, comTexto = false }: FavoritoButtonProps) {
  const [favorito, setFavorito] = useState(false)

  useEffect(() => {
    const sincronizar = () => setFavorito(ehFavorito(item.codigoItem))
    sincronizar()
    window.addEventListener(EVENTO_FAVORITOS, sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener(EVENTO_FAVORITOS, sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [item.codigoItem])

  return (
    <button
      type="button"
      onClick={() => setFavorito(alternarFavorito(item))}
      aria-pressed={favorito}
      aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition ${
        favorito
          ? 'border-rose-500/50 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400'
      }`}
    >
      <Heart className="h-4 w-4" fill={favorito ? 'currentColor' : 'none'} />
      {comTexto && (favorito ? 'Favoritado' : 'Favoritar')}
    </button>
  )
}
