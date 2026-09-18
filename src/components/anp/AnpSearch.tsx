'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { AnpFilters, type AnpOpcoes } from '@/components/anp/AnpFilters'
import { AnpResults } from '@/components/anp/AnpResults'
import { AnpSummary } from '@/components/anp/AnpSummary'
import { Button } from '@/components/ui/button'
import type { AnpFiltros, AnpLinhaNormalizada } from '@/features/anp/anp.types'

const LIMITE = 50

type AnpSemana = {
  id: string
  dataInicio: string
  dataFim: string
}

type AnpResumo = {
  produtos: Array<{
    produto: string
    unidade: string
    precoMedio: number
    precoMinimo: number
    precoMaximo: number
  }>
  totalLocalidades: number
  totalProdutos: number
}

const opcoesVazias: AnpOpcoes = {
  semanas: [],
  produtos: [],
  unidades: [],
  abrangencias: [],
  estados: [],
  regioes: [],
  municipios: [],
}

function mensagemDaResposta(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error
    if (typeof error === 'string' && error) return error
  }
  return fallback
}

export function AnpSearch() {
  const [filtros, setFiltros] = useState<AnpFiltros>({ pagina: 1, limite: LIMITE })
  const [opcoes, setOpcoes] = useState<AnpOpcoes>(opcoesVazias)
  const [items, setItems] = useState<AnpLinhaNormalizada[]>([])
  const [total, setTotal] = useState(0)
  const [semana, setSemana] = useState<AnpSemana | null>(null)
  const [resumo, setResumo] = useState<AnpResumo | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  async function carregarOpcoes(estado?: string) {
    setCarregandoOpcoes(true)
    try {
      const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
      const response = await fetch(`/api/anp/filtros${query}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(mensagemDaResposta(payload, 'Falha ao carregar filtros da ANP.'))
      setOpcoes(payload)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar filtros da ANP.')
    } finally {
      setCarregandoOpcoes(false)
    }
  }

  async function carregarDados(proximosFiltros: AnpFiltros) {
    setCarregando(true)
    setErro(null)

    const params = new URLSearchParams()
    for (const [chave, valor] of Object.entries(proximosFiltros)) {
      if (valor !== undefined && valor !== '') params.set(chave, String(valor))
    }
    params.set('pagina', String(proximosFiltros.pagina || 1))
    params.set('limite', String(LIMITE))

    try {
      const response = await fetch(`/api/anp?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(mensagemDaResposta(payload, 'Falha ao consultar preços da ANP.'))

      setItems(Array.isArray(payload.items) ? payload.items : [])
      setTotal(typeof payload.total === 'number' ? payload.total : 0)
      setSemana(payload.semana || null)

      if (payload.semana?.id) {
        const resumoResponse = await fetch(`/api/anp/semanas/${encodeURIComponent(payload.semana.id)}`)
        const resumoPayload = await resumoResponse.json()
        if (!resumoResponse.ok) throw new Error(mensagemDaResposta(resumoPayload, 'Falha ao carregar resumo da ANP.'))
        setResumo(resumoPayload.resumo || null)
      } else {
        setResumo(null)
      }

      setFiltros(proximosFiltros)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao consultar preços da ANP.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregarOpcoes()
    void carregarDados({ pagina: 1, limite: LIMITE })
  }, [])

  function alterarFiltros(filtrosParciais: Partial<AnpFiltros>) {
    const proximosFiltros: AnpFiltros = {
      ...filtros,
      ...filtrosParciais,
      pagina: 1,
      limite: LIMITE,
    }

    setFiltros(proximosFiltros)
    if (Object.prototype.hasOwnProperty.call(filtrosParciais, 'estado')) {
      void carregarOpcoes(proximosFiltros.estado)
    }
    void carregarDados(proximosFiltros)
  }

  function alterarPagina(pagina: number) {
    if (pagina < 1 || pagina > totalPaginas) return
    void carregarDados({ ...filtros, pagina, limite: LIMITE })
  }

  async function exportarExcel() {
    setExportando(true)
    setErro(null)

    try {
      const params = new URLSearchParams()
      for (const [chave, valor] of Object.entries(filtros)) {
        if (chave !== 'pagina' && chave !== 'limite' && valor !== undefined && valor !== '') {
          params.set(chave, String(valor))
        }
      }

      const response = await fetch(`/api/anp/exportar?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(mensagemDaResposta(payload, 'Falha ao exportar os preços da ANP.'))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `precos-anp-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao exportar os preços da ANP.')
    } finally {
      setExportando(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE))
  const paginaAtual = filtros.pagina || 1

  return (
    <div aria-busy={carregando} className="space-y-6">
      <AnpSummary semana={semana} resumo={resumo} />
      <AnpFilters
        filtros={filtros}
        onChange={alterarFiltros}
        opcoes={opcoes}
        carregandoOpcoes={carregandoOpcoes}
      />
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/20 sm:flex-row sm:items-center">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">Use os filtros e exporte sua referência</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">O Excel inclui os preços, a fonte oficial, o hash do arquivo original e a metodologia.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void exportarExcel()} disabled={exportando || carregando || total === 0}>
          <Download className="mr-2 h-4 w-4" />
          {exportando ? 'Gerando Excel...' : 'Exportar Excel'}
        </Button>
      </div>
      <AnpResults items={items} carregando={carregando} erro={erro} />

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400 sm:flex-row">
        <span aria-live="polite">Página {paginaAtual} de {totalPaginas}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
            disabled={carregando || paginaAtual <= 1}
            onClick={() => alterarPagina(paginaAtual - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
            disabled={carregando || paginaAtual >= totalPaginas}
            onClick={() => alterarPagina(paginaAtual + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
