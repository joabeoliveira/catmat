'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  SalarioBuscaResponse,
  SalarioCard,
  SalarioSugestao,
  SalarioUf,
} from '@/features/salarios/salarios.types'

const ANOS = [2023, 2024, 2025, 2026]
const LIMITE = 20

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })

function formatarMoeda(valor: number | null): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? moeda.format(valor) : '—'
}

function Stat({ label, value, destaque }: { label: string; value: number | null; destaque?: boolean }) {
  return (
    <div
      className={
        destaque
          ? 'rounded-lg bg-cyan-50 p-3 dark:bg-cyan-950/40'
          : 'rounded-lg bg-slate-50 p-3 dark:bg-slate-900'
      }
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`text-sm font-semibold ${
          destaque ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-900 dark:text-white'
        }`}
      >
        {formatarMoeda(value)}
      </p>
    </div>
  )
}

function CardSalario({ item, aplicarInpc }: { item: SalarioCard; aplicarInpc: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{item.cbo}</Badge>
          <Badge variant="secondary">
            {item.ufCount} UF{item.ufCount === 1 ? '' : 's'}
          </Badge>
        </div>
        <p className="font-medium text-slate-900 dark:text-white">{item.titulo}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Menor" value={item.estatisticas.menor} />
          <Stat label="Média" value={item.estatisticas.media} destaque />
          <Stat label="Mediana" value={item.estatisticas.mediana} destaque />
          <Stat label="Maior" value={item.estatisticas.maior} />
        </div>
        {aplicarInpc && item.estatisticasOriginal ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Original (sem INPC): média {formatarMoeda(item.estatisticasOriginal.media)} · mediana{' '}
            {formatarMoeda(item.estatisticasOriginal.mediana)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function SalariosSearch() {
  const [termo, setTermo] = useState('')
  const [sugestoes, setSugestoes] = useState<SalarioSugestao[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [uf, setUf] = useState('')
  const [ano, setAno] = useState(2026)
  const [aplicarInpc, setAplicarInpc] = useState(false)
  const [ufs, setUfs] = useState<SalarioUf[]>([])
  const [data, setData] = useState<SalarioBuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)

  useEffect(() => {
    void fetch('/api/salarios/ufs')
      .then((response) => (response.ok ? response.json() : []))
      .then((lista) => setUfs(Array.isArray(lista) ? lista : []))
      .catch(() => setUfs([]))
  }, [])

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
      void fetch(`/api/salarios/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
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
    override?: { termo?: string; uf?: string; ano?: number; inpc?: boolean },
  ) {
    const q = (override?.termo ?? termo).trim()
    const ufAtual = override?.uf ?? uf
    const anoAtual = override?.ano ?? ano
    const inpcAtual = override?.inpc ?? aplicarInpc

    setError(null)
    setIsLoading(true)
    const params = new URLSearchParams({
      q,
      pagina: String(novaPagina),
      limite: String(LIMITE),
      ano: String(anoAtual),
    })
    if (ufAtual) params.set('uf', ufAtual)
    if (inpcAtual) params.set('aplicarInpc', 'true')

    try {
      const resp = await fetch(`/api/salarios?${params.toString()}`)
      if (!resp.ok) throw new Error('Falha ao buscar salários.')
      const payload = await resp.json()
      setData(payload)
      setPagina(novaPagina)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao buscar salários.')
    } finally {
      setIsLoading(false)
    }
  }

  function aplicarSugestao(sugestao: SalarioSugestao) {
    digitouRef.current = false
    setTermo(sugestao.titulo)
    setMostrarSugestoes(false)
    setSugestaoAtiva(-1)
    void carregarBusca(1, { termo: sugestao.titulo })
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

  async function exportar() {
    setExportando(true)
    try {
      const resp = await fetch('/api/salarios/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo, uf, ano, aplicarInpc, limite: 200 }),
      })
      if (!resp.ok) throw new Error('Falha ao gerar a planilha.')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `salarios-cbo-${new Date().toISOString().slice(0, 10)}.xlsx`
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
            Pesquisar salários (CBO)
          </CardTitle>
          <CardDescription>
            Busque por ocupação ou código CBO, filtre por UF e ano e aplique a correção pelo INPC.
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
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Input
                  aria-label="Buscar ocupação ou CBO"
                  value={termo}
                  onChange={(event) => {
                    setTermo(event.target.value)
                    digitouRef.current = true
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (sugestoes.length) setMostrarSugestoes(true)
                  }}
                  onBlur={() => window.setTimeout(() => setMostrarSugestoes(false), 150)}
                  placeholder="Ex.: engenheiro, médico, 2251..."
                />
                {mostrarSugestoes && sugestoes.length ? (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {sugestoes.map((sugestao, index) => (
                      <li key={sugestao.cbo}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            aplicarSugestao(sugestao)
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                            index === sugestaoAtiva ? 'bg-slate-100 dark:bg-slate-800' : ''
                          }`}
                        >
                          <Badge variant="secondary">{sugestao.cbo}</Badge>
                          <span className="truncate">{sugestao.titulo}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="UF"
                  value={uf}
                  onChange={(event) => {
                    const valor = event.target.value
                    setUf(valor)
                    void carregarBusca(1, { uf: valor })
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Todos os estados</option>
                  {ufs.map((item) => (
                    <option key={item.uf} value={item.uf}>
                      {item.uf} — {item.estado}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Ano de referência"
                  value={ano}
                  onChange={(event) => {
                    const valor = Number(event.target.value)
                    setAno(valor)
                    void carregarBusca(1, { ano: valor })
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {ANOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={aplicarInpc}
                    onChange={(event) => {
                      const valor = event.target.checked
                      setAplicarInpc(valor)
                      void carregarBusca(1, { inpc: valor })
                    }}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  Corrigir pelo INPC
                </label>

                <Button type="submit">Buscar</Button>
                <Button type="button" variant="outline" onClick={exportar} disabled={exportando}>
                  <Download className="mr-2 h-4 w-4" />
                  {exportando ? 'Gerando...' : 'Exportar XLSX'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3" aria-live="polite">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-700 dark:text-slate-300">
            <p>{error}</p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => void carregarBusca()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
            <p>Digite um termo acima para pesquisar salários — por ocupação ou código CBO.</p>
          </CardContent>
        </Card>
      ) : !data.items.length ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
            <p>Nenhum resultado encontrado. Tente outro termo ou ajuste os filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Encontradas <strong>{data.total}</strong> ocupações · página {data.pagina} de {data.totalPaginas}
            </p>
            {aplicarInpc ? (
              <Badge variant="secondary" className="border-cyan-500/40 bg-cyan-100 text-cyan-700 dark:bg-cyan-600/20 dark:text-cyan-300">
                Fator INPC: {data.fatorInpc.toFixed(4)} ×
              </Badge>
            ) : null}
          </div>

          {data.items.map((item) => (
            <CardSalario key={item.cbo} item={item} aplicarInpc={aplicarInpc} />
          ))}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1 || isLoading}
              onClick={() => void carregarBusca(pagina - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {data.pagina} / {data.totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= data.totalPaginas || isLoading}
              onClick={() => void carregarBusca(pagina + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
