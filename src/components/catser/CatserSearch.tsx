'use client'

import { useEffect, useRef, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CatserResults } from '@/components/catser/CatserResults'
import { CatserFiltros } from '@/components/catser/CatserFiltros'
import type { CatserBuscaResponse } from '@/features/catser/catser.types'

interface FiltrosCatser {
  codigoGrupo?: string
  codigoClasse?: string
}

export function CatserSearch() {
  const [termo, setTermo] = useState('')
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosCatser>({})
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [data, setData] = useState<CatserBuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  // Autocomplete com debounce — mesmo padrão do CATMAT
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
      void fetch(`/api/catser/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
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

  async function carregarBusca(novaPagina = 1, termoOverride?: string, filtrosOverride?: FiltrosCatser) {
    const q = (termoOverride ?? termo).trim()
    const flt = filtrosOverride ?? filtros
    if (q.length < 2) {
      setData(null)
      return
    }

    setError(null)
    setIsLoading(true)
    const params = new URLSearchParams({ q, pagina: String(novaPagina), limite: '20' })
    if (flt.codigoGrupo) params.set('codigoGrupo', flt.codigoGrupo)
    if (flt.codigoClasse) params.set('codigoClasse', flt.codigoClasse)

    try {
      const resp = await fetch(`/api/catser?${params.toString()}`)
      if (!resp.ok) throw new Error('Falha ao buscar serviços.')
      const payload = await resp.json()
      setData(payload)
      setPagina(novaPagina)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao buscar serviços.')
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

  function alterarFiltro(chave: keyof FiltrosCatser, valor: string) {
    const proximo = { ...filtros, [chave]: valor || undefined }
    setFiltros(proximo)
    void carregarBusca(1, termo, proximo)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Buscar serviços (CATSER)
          </CardTitle>
          <CardDescription>
            Pesquise por descrição do serviço. Use ↑/↓ para navegar nas sugestões e Enter para aplicar.
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
                  aria-label="Buscar serviços"
                  placeholder="Ex: manutenção elétrica, limpeza, vigilância"
                  value={termo}
                  onChange={(event) => {
                    digitouRef.current = true
                    setTermo(event.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  role="combobox"
                  aria-expanded={mostrarSugestoes && !!sugestoes.length}
                  aria-controls="sugestoes-catser"
                  aria-autocomplete="list"
                  aria-activedescendant={sugestaoAtiva >= 0 ? `sugestao-catser-${sugestaoAtiva}` : undefined}
                />
                {mostrarSugestoes && sugestoes.length > 0 && (
                  <ul
                    id="sugestoes-catser"
                    role="listbox"
                    className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    {sugestoes.map((sugestao, index) => (
                      <li
                        key={sugestao}
                        id={`sugestao-catser-${index}`}
                        role="option"
                        aria-selected={index === sugestaoAtiva}
                        className={`cursor-pointer px-3 py-2 text-sm ${
                          index === sugestaoAtiva
                            ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                        onMouseDown={() => aplicarSugestao(sugestao)}
                      >
                        {sugestao}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="submit" disabled={isLoading}>
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFiltrosAbertos((value) => !value)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>

            {filtrosAbertos && data?.filtrosSugeridos ? (
              <CatserFiltros filtros={filtros} sugeridos={data.filtrosSugeridos} onAlterar={alterarFiltro} />
            ) : null}
          </form>
        </CardContent>
      </Card>

      <CatserResults
        data={data}
        isLoading={isLoading}
        error={error}
        pagina={pagina}
        onPagina={(p) => void carregarBusca(p)}
        onTentarNovamente={() => void carregarBusca(pagina)}
      />
    </div>
  )
}
