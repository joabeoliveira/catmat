'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TcePrFiltros as PainelFiltros } from '@/components/tcepr/TcePrFiltros'
import { TcePrResults } from '@/components/tcepr/TcePrResults'
import type { OrdenacaoTcePr, TcePrBuscaResponse, TcePrFiltros } from '@/features/tcepr/tcepr.types'

const LIMITE = 20

const ORDENACOES: Array<{ valor: OrdenacaoTcePr; rotulo: string }> = [
  { valor: 'relevancia', rotulo: 'Relevância' },
  { valor: 'preco_asc', rotulo: 'Preço (menor → maior)' },
  { valor: 'preco_desc', rotulo: 'Preço (maior → menor)' },
  { valor: 'data_desc', rotulo: 'Homologação (mais recente)' },
  { valor: 'data_asc', rotulo: 'Homologação (mais antiga)' },
  { valor: 'municipio', rotulo: 'Município (A–Z)' },
]

export function TcePrSearch() {
  const [termo, setTermo] = useState('')
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [filtros, setFiltros] = useState<TcePrFiltros>({})
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [ordenar, setOrdenar] = useState<OrdenacaoTcePr>('relevancia')
  const [data, setData] = useState<TcePrBuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const refinarDebounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  // Autocomplete com debounce — mesmo padrão do CATMAT/CATSER
  useEffect(() => {
    const q = termo.trim()
    if (q.length < 2) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    debounceRef.current = window.setTimeout(() => {
      void fetch(`/api/tce-pr/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : []))
        .then((result) => {
          if (!controller.signal.aborted) {
            setSugestoes(Array.isArray(result) ? result : [])
            setMostrarSugestoes(digitouRef.current)
          }
        })
        .catch(() => {
          setSugestoes([])
          setMostrarSugestoes(false)
        })
    }, 150)

    return () => controller.abort()
  }, [termo])

  async function carregarBusca(
    novaPagina = 1,
    termoOverride?: string,
    filtrosOverride?: TcePrFiltros,
    ordenarOverride?: OrdenacaoTcePr,
  ) {
    const q = (termoOverride ?? termo).trim()
    const flt = filtrosOverride ?? filtros
    const ord = ordenarOverride ?? ordenar

    setError(null)
    setIsLoading(true)
    const params = new URLSearchParams({ q, pagina: String(novaPagina), limite: String(LIMITE), ordenar: ord })
    if (flt.cdIbge) params.set('cdIbge', flt.cdIbge)
    if (flt.municipio) params.set('municipio', flt.municipio)
    if (flt.refinar) params.set('refinar', flt.refinar)
    if (flt.modalidade) params.set('modalidade', flt.modalidade)
    if (flt.anoLicitacao) params.set('anoLicitacao', String(flt.anoLicitacao))
    if (flt.dtHomologacaoInicio) params.set('dtHomologacaoInicio', flt.dtHomologacaoInicio)
    if (flt.dtHomologacaoFim) params.set('dtHomologacaoFim', flt.dtHomologacaoFim)
    if (flt.fornecedor) params.set('fornecedor', flt.fornecedor)
    if (flt.nrDocumento) params.set('nrDocumento', flt.nrDocumento)
    if (flt.apenasVencedores === false) params.set('apenasVencedores', 'false')
    if (typeof flt.valorMin === 'number') params.set('valorMin', String(flt.valorMin))
    if (typeof flt.valorMax === 'number') params.set('valorMax', String(flt.valorMax))

    try {
      const resp = await fetch(`/api/tce-pr/buscar?${params.toString()}`)
      if (!resp.ok) throw new Error('Falha ao buscar licitações TCE-PR.')
      const payload = await resp.json()
      setData(payload)
      setPagina(novaPagina)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao buscar licitações TCE-PR.')
    } finally {
      setIsLoading(false)
    }
  }

  function aplicarSugestao(sugestao: string) {
    digitouRef.current = false
    setTermo(sugestao)
    setMostrarSugestoes(false)
    setSugestaoAtiva(-1)
    void carregarBusca(1, sugestao)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostrarSugestoes || !sugestoes.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSugestaoAtiva((value) => (value + 1) % sugestoes.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSugestaoAtiva((value) => (value - 1 + sugestoes.length) % sugestoes.length)
    } else if (event.key === 'Enter' && sugestaoAtiva >= 0) {
      event.preventDefault()
      aplicarSugestao(sugestoes[sugestaoAtiva])
    } else if (event.key === 'Escape') {
      setMostrarSugestoes(false)
      setSugestaoAtiva(-1)
    }
  }

  function alterarFiltro(chave: keyof TcePrFiltros, valor: string | boolean | number | undefined) {
    const proximo: TcePrFiltros = { ...filtros, [chave]: valor === '' ? undefined : valor }
    setFiltros(proximo)
    void carregarBusca(1, termo, proximo, ordenar)
  }

  function alterarOrdenacao(valor: string) {
    const ord = valor as OrdenacaoTcePr
    setOrdenar(ord)
    void carregarBusca(1, termo, filtros, ord)
  }

  // Refinamento com debounce: cada palavra adicionada restringe os resultados (E-lógico)
  function alterarRefinamento(valor: string) {
    const proximo: TcePrFiltros = { ...filtros, refinar: valor.trim() || undefined }
    setFiltros(proximo)
    if (refinarDebounceRef.current) window.clearTimeout(refinarDebounceRef.current)
    refinarDebounceRef.current = window.setTimeout(
      () => void carregarBusca(1, termo, proximo, ordenar),
      400,
    )
  }

  async function exportar() {
    setExportando(true)
    try {
      const resp = await fetch('/api/tce-pr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo: termo.trim(), filtros, limite: 500 }),
      })
      if (!resp.ok) throw new Error('Falha ao gerar a planilha.')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tce-pr-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Buscar itens homologados (TCE-PR)
          </CardTitle>
          <CardDescription>
            Pesquise por item, município, modalidade ou fornecedor. Por padrão são exibidos apenas os
            vencedores (1º classificado); desative o filtro para ver todas as propostas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              digitouRef.current = false
              setMostrarSugestoes(false)
              setSugestaoAtiva(-1)
              void carregarBusca(1)
            }}
            className="space-y-3"
          >
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Input
                  aria-label="Buscar itens"
                  placeholder="Ex: motobomba, concreto, caneta, cadeira..."
                  value={termo}
                  onChange={(event) => {
                    digitouRef.current = true
                    setTermo(event.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  role="combobox"
                  aria-expanded={mostrarSugestoes && !!sugestoes.length}
                  aria-controls="sugestoes-tcepr"
                  aria-autocomplete="list"
                  aria-activedescendant={sugestaoAtiva >= 0 ? `sugestao-tcepr-${sugestaoAtiva}` : undefined}
                />
                {mostrarSugestoes && sugestoes.length > 0 ? (
                  <ul
                    id="sugestoes-tcepr"
                    role="listbox"
                    className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    {sugestoes.map((sugestao, index) => (
                      <li
                        key={`${sugestao}-${index}`}
                        id={`sugestao-tcepr-${index}`}
                        role="option"
                        aria-selected={index === sugestaoAtiva}
                        className={`cursor-pointer truncate px-3 py-2 text-sm ${
                          index === sugestaoAtiva
                            ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                        title={sugestao}
                        onMouseDown={() => aplicarSugestao(sugestao)}
                      >
                        {sugestao}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Button type="submit" disabled={isLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFiltrosAbertos((value) => !value)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button type="button" variant="outline" onClick={() => void exportar()} disabled={exportando || !data?.items.length}>
                <Download className="mr-2 h-4 w-4" />
                {exportando ? 'Exportando...' : 'Exportar XLSX'}
              </Button>
            </div>

            <div>
              <label htmlFor="tcepr-refinar" className="mb-1 block text-sm text-slate-700 dark:text-slate-300">
                Refinar resultados
              </label>
              <Input
                id="tcepr-refinar"
                placeholder="Palavras que devem aparecer no item (ex: 220v, submersível, inox)"
                value={filtros.refinar || ''}
                onChange={(event) => alterarRefinamento(event.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Separe por vírgula ou espaço. Todas as palavras precisam estar presentes no descritivo do item.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-sm text-slate-700 dark:text-slate-300">Ordenar por</label>
              <Select
                aria-label="Ordenar resultados"
                className="sm:w-72"
                value={ordenar}
                onChange={(event) => alterarOrdenacao(event.target.value)}
              >
                {ORDENACOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </Select>
            </div>

            {filtrosAbertos && data?.filtrosSugeridos ? (
              <PainelFiltros
                filtros={filtros}
                sugeridos={data.filtrosSugeridos}
                onAlterar={alterarFiltro}
              />
            ) : null}
          </form>
        </CardContent>
      </Card>

      <TcePrResults
        data={data}
        isLoading={isLoading}
        error={error}
        pagina={pagina}
        onPagina={(novaPagina) => void carregarBusca(novaPagina)}
        onTentarNovamente={() => void carregarBusca(1)}
      />
    </div>
  )
}
