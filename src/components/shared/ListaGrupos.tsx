'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'

interface Grupo {
  codigo: number
  nome: string
  quantidade: number
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function ListaGrupos({ grupos }: { grupos: Grupo[] }) {
  const [filtro, setFiltro] = useState('')

  const visiveis = useMemo(() => {
    const q = normalizar(filtro.trim())
    if (!q) return grupos
    return grupos.filter((grupo) => normalizar(grupo.nome).includes(q) || String(grupo.codigo).includes(q))
  }, [grupos, filtro])

  return (
    <>
      <Input
        aria-label="Filtrar grupos por nome ou código"
        placeholder="Filtrar grupos… ex: medicamento, papel, 65"
        value={filtro}
        onChange={(event) => setFiltro(event.target.value)}
        className="max-w-md"
      />

      {visiveis.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum grupo corresponde a &quot;{filtro}&quot;.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((grupo) => (
          <Link
            key={grupo.codigo}
            href={`/?grupo=${grupo.codigo}`}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 transition hover:border-cyan-500"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">Grupo {grupo.codigo}</div>
            <div className="mt-2 font-medium leading-snug text-slate-900 dark:text-white">{grupo.nome}</div>
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">{grupo.quantidade.toLocaleString('pt-BR')} itens</div>
          </Link>
        ))}
      </div>
    </>
  )
}
