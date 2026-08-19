'use client'

import { Select } from '@/components/ui/select'
import type { CatserBuscaResponse } from '@/features/catser/catser.types'

interface Props {
  filtros: { codigoGrupo?: string; codigoClasse?: string }
  sugeridos: CatserBuscaResponse['filtrosSugeridos']
  onAlterar: (chave: 'codigoGrupo' | 'codigoClasse', valor: string) => void
}

export function CatserFiltros({ filtros, sugeridos, onAlterar }: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-100/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Grupo</label>
        <Select
          value={filtros.codigoGrupo || ''}
          onChange={(event) => onAlterar('codigoGrupo', event.target.value)}
        >
          <option value="">Todos</option>
          {sugeridos.grupos.map((grupo) => (
            <option key={String(grupo.codigo)} value={String(grupo.codigo)}>
              {grupo.codigo} - {grupo.nome} ({grupo.quantidade})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Classe</label>
        <Select
          value={filtros.codigoClasse || ''}
          onChange={(event) => onAlterar('codigoClasse', event.target.value)}
        >
          <option value="">Todas</option>
          {sugeridos.classes.map((classe) => (
            <option key={String(classe.codigo)} value={String(classe.codigo)}>
              {classe.codigo} - {classe.nome} ({classe.quantidade})
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
