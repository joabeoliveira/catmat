'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { TcePrBuscaResponse, TcePrFiltros } from '@/features/tcepr/tcepr.types'

interface Props {
  filtros: TcePrFiltros
  sugeridos: TcePrBuscaResponse['filtrosSugeridos']
  onAlterar: (chave: keyof TcePrFiltros, valor: string | boolean | number | undefined) => void
}

export function TcePrFiltros({ filtros, sugeridos, onAlterar }: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-100/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-3">
      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Município</label>
        <Select
          value={filtros.municipio || ''}
          onChange={(event) => onAlterar('municipio', event.target.value)}
        >
          <option value="">Todos</option>
          {sugeridos.municipios.map((municipio) => (
            <option key={municipio.valor} value={municipio.valor}>
              {municipio.valor} ({municipio.quantidade})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Modalidade</label>
        <Select
          value={filtros.modalidade || ''}
          onChange={(event) => onAlterar('modalidade', event.target.value)}
        >
          <option value="">Todas</option>
          {sugeridos.modalidades.map((modalidade) => (
            <option key={modalidade.valor} value={modalidade.valor}>
              {modalidade.valor} ({modalidade.quantidade})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Ano da licitação</label>
        <Select
          value={filtros.anoLicitacao ? String(filtros.anoLicitacao) : ''}
          onChange={(event) => onAlterar('anoLicitacao', event.target.value ? Number(event.target.value) : undefined)}
        >
          <option value="">Todos</option>
          {sugeridos.anos.map((ano) => (
            <option key={ano.valor} value={ano.valor}>
              {ano.valor} ({ano.quantidade})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Homologação de</label>
        <Input
          type="date"
          value={filtros.dtHomologacaoInicio || ''}
          onChange={(event) => onAlterar('dtHomologacaoInicio', event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Homologação até</label>
        <Input
          type="date"
          value={filtros.dtHomologacaoFim || ''}
          onChange={(event) => onAlterar('dtHomologacaoFim', event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Fornecedor</label>
        <Input
          placeholder="Nome ou razão social"
          value={filtros.fornecedor || ''}
          onChange={(event) => onAlterar('fornecedor', event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Preço mínimo (R$)</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={filtros.valorMin ?? ''}
          onChange={(event) =>
            onAlterar('valorMin', event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-700 dark:text-slate-300">Preço máximo (R$)</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={filtros.valorMax ?? ''}
          onChange={(event) =>
            onAlterar('valorMax', event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      </div>

      <div className="flex items-end">
        <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={filtros.apenasVencedores !== false}
            onChange={(event) => onAlterar('apenasVencedores', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          Apenas vencedores (1º classificado)
        </label>
      </div>
    </div>
  )
}
