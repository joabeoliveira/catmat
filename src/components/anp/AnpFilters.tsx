'use client'

import { Select } from '@/components/ui/select'
import type { AnpFiltros } from '@/features/anp/anp.types'

type SemanaOpcao = {
  id: string
  dataInicio: string
  dataFim: string
}

export type AnpOpcoes = {
  semanas: SemanaOpcao[]
  produtos: string[]
  unidades: string[]
  abrangencias: string[]
  estados: string[]
  regioes: string[]
  municipios: string[]
}

type AnpFiltersProps = {
  filtros: AnpFiltros
  onChange: (filtrosParciais: Partial<AnpFiltros>) => void
  opcoes: AnpOpcoes
  carregandoOpcoes: boolean
}

function formatarData(data: string): string {
  const valor = new Date(data)
  if (Number.isNaN(valor.getTime())) return data
  return valor.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatarOpcao(valor: string): string {
  return valor
    .toLocaleLowerCase('pt-BR')
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

function Campo({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  )
}

export function AnpFilters({ filtros, onChange, opcoes, carregandoOpcoes }: AnpFiltersProps) {
  return (
    <section
      aria-busy={carregandoOpcoes}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Campo label="Semana" htmlFor="anp-semana">
        <Select
          id="anp-semana"
          value={filtros.semanaId || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ semanaId: event.target.value || undefined })}
        >
          <option value="">Semana mais recente</option>
          {opcoes.semanas.map((semana) => (
            <option key={semana.id} value={semana.id}>
              {formatarData(semana.dataInicio)} a {formatarData(semana.dataFim)}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Abrangência" htmlFor="anp-abrangencia">
        <Select
          id="anp-abrangencia"
          value={filtros.abrangencia || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ abrangencia: event.target.value as AnpFiltros['abrangencia'] || undefined })}
        >
          <option value="">Todas</option>
          {opcoes.abrangencias.map((abrangencia) => (
            <option key={abrangencia} value={abrangencia}>
              {formatarOpcao(abrangencia)}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Produto" htmlFor="anp-produto">
        <Select
          id="anp-produto"
          value={filtros.produto || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ produto: event.target.value as AnpFiltros['produto'] || undefined })}
        >
          <option value="">Todos</option>
          {opcoes.produtos.map((produto) => (
            <option key={produto} value={produto}>
              {formatarOpcao(produto)}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Unidade" htmlFor="anp-unidade">
        <Select
          id="anp-unidade"
          value={filtros.unidade || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ unidade: event.target.value as AnpFiltros['unidade'] || undefined })}
        >
          <option value="">Todas</option>
          {opcoes.unidades.map((unidade) => (
            <option key={unidade} value={unidade}>
              {formatarOpcao(unidade)}
            </option>
          ))}
        </Select>
      </Campo>

      <Campo label="Estado" htmlFor="anp-estado">
        <Select
          id="anp-estado"
          value={filtros.estado || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ estado: event.target.value || undefined, municipio: undefined })}
        >
          <option value="">Todos</option>
          {opcoes.estados.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </Select>
      </Campo>

      <Campo label="Região" htmlFor="anp-regiao">
        <Select
          id="anp-regiao"
          value={filtros.regiao || ''}
          disabled={carregandoOpcoes}
          onChange={(event) => onChange({ regiao: event.target.value || undefined })}
        >
          <option value="">Todas</option>
          {opcoes.regioes.map((regiao) => (
            <option key={regiao} value={regiao}>{regiao}</option>
          ))}
        </Select>
      </Campo>

      <Campo label="Município" htmlFor="anp-municipio">
        <Select
          id="anp-municipio"
          value={filtros.municipio || ''}
          disabled={!filtros.estado || carregandoOpcoes}
          onChange={(event) => onChange({ municipio: event.target.value || undefined })}
        >
          <option value="">{filtros.estado ? 'Todos' : 'Selecione um estado'}</option>
          {filtros.estado
            ? opcoes.municipios.map((municipio) => (
                <option key={municipio} value={municipio}>{municipio}</option>
              ))
            : null}
        </Select>
      </Campo>
    </section>
  )
}
