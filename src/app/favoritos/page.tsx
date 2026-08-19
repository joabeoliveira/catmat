'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Heart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { alternarFavorito, listarFavoritos, EVENTO_FAVORITOS, type ItemFavorito } from '@/lib/favoritos'

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<ItemFavorito[]>([])
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    const sincronizar = () => setFavoritos(listarFavoritos())
    sincronizar()
    setCarregado(true)
    window.addEventListener(EVENTO_FAVORITOS, sincronizar)
    return () => window.removeEventListener(EVENTO_FAVORITOS, sincronizar)
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Sua lista</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-slate-900 dark:text-white">
            <Heart className="h-7 w-7 text-rose-600 dark:text-rose-400" fill="currentColor" />
            Favoritos
          </h1>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Itens salvos neste navegador para consulta rápida. Use o coração nos resultados de busca ou na página do
            material para adicionar.
          </p>
        </div>

        {carregado && favoritos.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
              Nenhum favorito ainda. <Link href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">Busque um material</Link>{' '}
              e clique no coração para salvá-lo aqui.
            </CardContent>
          </Card>
        )}

        {favoritos.map((item) => (
          <Card key={item.codigoItem}>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-500">CATMAT {item.codigoItem} · {item.nomePdm}</div>
                <div className="mt-1 font-medium text-slate-900 dark:text-white">{item.descricaoItem}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/material/${item.codigoItem}`}
                  className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 transition hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300"
                >
                  Ver detalhes →
                </Link>
                <Button variant="ghost" size="sm" onClick={() => alternarFavorito(item)} aria-label="Remover dos favoritos">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
