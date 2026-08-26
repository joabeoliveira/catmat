'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Check, ChevronDown, Download, Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  SalarioBuscaResponse,
  SalarioCard,
  SalarioGradeItem,
  SalarioHierarquiaOpcao,
  SalarioSugestao,
  SalarioUf,
  ReferenciaSalarial,
  OrdenacaoSalarios,
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

function CardSalario({ item, aplicarInpc, adicionar, comparar, selecionado }: { item: SalarioCard; aplicarInpc: boolean; adicionar: (item: SalarioCard) => void; comparar: (item: SalarioCard) => void; selecionado: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{item.cbo}</Badge>
          <Badge variant="secondary">
            {item.ufCount} UF{item.ufCount === 1 ? '' : 's'}
          </Badge>
          {item.qualidade ? <Badge variant="secondary">Confiança {item.qualidade.confianca}</Badge> : null}
          {item.correspondencia ? <Badge variant="outline">Aderência {item.correspondencia.aderencia}%</Badge> : null}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-white">{item.titulo}</p>
            {item.tituloOficial ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Título oficial CBO: {item.tituloOficial}</p> : null}
            {item.hierarquia?.familia || item.hierarquia?.grandeGrupo ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{[item.hierarquia.grandeGrupo, item.hierarquia.subgrupoPrincipal, item.hierarquia.familia].filter(Boolean).join(' · ')}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={selecionado ? 'default' : 'outline'} onClick={() => comparar(item)}>{selecionado ? <Check className="mr-1 h-4 w-4" /> : <ArrowLeftRight className="mr-1 h-4 w-4" />}{selecionado ? 'Selecionado' : 'Comparar'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => adicionar(item)}><Plus className="mr-1 h-4 w-4" />Adicionar à grade</Button>
          </div>
        </div>
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
        {item.percentis ? <p className="text-xs text-slate-500 dark:text-slate-400">Faixa inferior (P25): {formatarMoeda(item.percentis.p25)} · valor central (mediana/P50): {formatarMoeda(item.percentis.p50)} · faixa superior (P75): {formatarMoeda(item.percentis.p75)}</p> : null}
        {item.correspondencia ? <p className="text-xs text-cyan-700 dark:text-cyan-300">{item.correspondencia.descricao}{item.correspondencia.termoEncontrado ? `: “${item.correspondencia.termoEncontrado}”` : ''}</p> : null}
        {item.qualidade?.amplitudePercentual != null ? <p className="text-xs text-slate-500 dark:text-slate-400">Variação entre menor e maior salário: {(item.qualidade.amplitudePercentual * 100).toFixed(0)}% da mediana.</p> : null}
        {item.sinonimos?.length ? <p className="text-xs text-cyan-700 dark:text-cyan-300">Sinônimos: {item.sinonimos.slice(0, 3).join(', ')}</p> : null}
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
  const [hierarquia, setHierarquia] = useState<SalarioHierarquiaOpcao[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [grandeGrupo, setGrandeGrupo] = useState('')
  const [subgrupoPrincipal, setSubgrupoPrincipal] = useState('')
  const [familia, setFamilia] = useState('')
  const [palavrasObrigatorias, setPalavrasObrigatorias] = useState('')
  const [palavrasExcluidas, setPalavrasExcluidas] = useState('')
  const [salarioMinimo, setSalarioMinimo] = useState('')
  const [salarioMaximo, setSalarioMaximo] = useState('')
  const [minimoUfs, setMinimoUfs] = useState('')
  const [referencia, setReferencia] = useState<ReferenciaSalarial>('mediana')
  const [ordenar, setOrdenar] = useState<OrdenacaoSalarios>('relevancia')
  const [data, setData] = useState<SalarioBuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)
  const [grade, setGrade] = useState<SalarioGradeItem[]>([])
  const [comparacao, setComparacao] = useState<SalarioCard[]>([])
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('catmat:grade-salarios')
      if (saved) {
        const linhas = JSON.parse(saved) as Array<Partial<SalarioGradeItem> & SalarioCard>
        setGrade(linhas.map((linha) => ({
          ...linha,
          quantidade: Math.max(1, Number(linha.quantidade) || 1),
          criterioReferencia: linha.criterioReferencia || 'mediana',
          salarioReferencia: typeof linha.salarioReferencia === 'number'
            ? linha.salarioReferencia
            : linha.estatisticas.mediana,
        })))
      }
    } catch { /* ignora armazenamento indisponível */ }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('catmat:grade-salarios', JSON.stringify(grade))
  }, [grade])

  function adicionarNaGrade(item: SalarioCard) {
    setGrade((atual) => atual.some((linha) => linha.cbo === item.cbo) ? atual : [...atual, {
      ...item,
      quantidade: 1,
      criterioReferencia: referencia,
      salarioReferencia: referencia === 'p25' ? item.percentis?.p25 ?? null : referencia === 'p75' ? item.percentis?.p75 ?? null : referencia === 'media' ? item.estatisticas.media : item.estatisticas.mediana,
    }])
  }

  function alternarComparacao(item: SalarioCard) {
    setComparacao((atual) => {
      if (atual.some((linha) => linha.cbo === item.cbo)) return atual.filter((linha) => linha.cbo !== item.cbo)
      if (atual.length >= 5) {
        setError('Você pode comparar até cinco ocupações por vez.')
        return atual
      }
      setError(null)
      return [...atual, item]
    })
  }

  function removerDaGrade(cbo: number) {
    setGrade((atual) => atual.filter((linha) => linha.cbo !== cbo))
  }

  function atualizarGrade(cbo: number, alteracoes: Partial<SalarioGradeItem>) {
    setGrade((atual) => atual.map((linha) => linha.cbo === cbo ? { ...linha, ...alteracoes } : linha))
  }

  function valorDoCriterio(linha: SalarioGradeItem, criterio: SalarioGradeItem['criterioReferencia']) {
    if (criterio === 'p25') return linha.percentis?.p25 ?? null
    if (criterio === 'p75') return linha.percentis?.p75 ?? null
    if (criterio === 'media') return linha.estatisticas.media
    return linha.estatisticas.mediana
  }

  useEffect(() => {
    void fetch('/api/salarios/ufs')
      .then((response) => (response.ok ? response.json() : []))
      .then((lista) => setUfs(Array.isArray(lista) ? lista : []))
      .catch(() => setUfs([]))
    void fetch('/api/salarios/filtros')
      .then((response) => (response.ok ? response.json() : []))
      .then((lista) => setHierarquia(Array.isArray(lista) ? lista : []))
      .catch(() => setHierarquia([]))
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
    override?: { termo?: string; uf?: string; ano?: number; inpc?: boolean; ordenar?: OrdenacaoSalarios },
  ) {
    const q = (override?.termo ?? termo).trim()
    const ufAtual = override?.uf ?? uf
    const anoAtual = override?.ano ?? ano
    const inpcAtual = override?.inpc ?? aplicarInpc
    const ordenarAtual = override?.ordenar ?? ordenar

    setError(null)
    setIsLoading(true)
    const params = new URLSearchParams({
      q,
      pagina: String(novaPagina),
      limite: String(LIMITE),
      ano: String(anoAtual),
      referencia,
      ordenar: ordenarAtual,
    })
    if (ufAtual) params.set('uf', ufAtual)
    if (inpcAtual) params.set('aplicarInpc', 'true')
    if (grandeGrupo) params.set('grandeGrupo', grandeGrupo)
    if (subgrupoPrincipal) params.set('subgrupoPrincipal', subgrupoPrincipal)
    if (familia) params.set('familia', familia)
    if (palavrasObrigatorias.trim()) params.set('incluir', palavrasObrigatorias.trim())
    if (palavrasExcluidas.trim()) params.set('excluir', palavrasExcluidas.trim())
    if (salarioMinimo) params.set('salarioMinimo', salarioMinimo)
    if (salarioMaximo) params.set('salarioMaximo', salarioMaximo)
    if (minimoUfs) params.set('minimoUfs', minimoUfs)

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
        body: JSON.stringify({ termo, uf, ano, aplicarInpc, fatorInpc: data?.fatorInpc ?? 1, limite: 500, grade, grandeGrupo, subgrupoPrincipal, familia, palavrasObrigatorias, palavrasExcluidas, salarioMinimo: salarioMinimo ? Number(salarioMinimo) : undefined, salarioMaximo: salarioMaximo ? Number(salarioMaximo) : undefined, minimoUfs: minimoUfs ? Number(minimoUfs) : undefined, referenciaSalarial: referencia, ordenarPor: ordenar }),
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

  const grandesGrupos = Array.from(new Map(hierarquia.map((item) => [item.grandeGrupo, item])).values()).sort((a, b) => a.grandeGrupo.localeCompare(b.grandeGrupo, 'pt-BR'))
  const subgrupos = Array.from(new Map(hierarquia.filter((item) => !grandeGrupo || item.grandeGrupo === grandeGrupo).map((item) => [item.subgrupoPrincipal, item])).values()).sort((a, b) => a.subgrupoPrincipal.localeCompare(b.subgrupoPrincipal, 'pt-BR'))
  const familias = Array.from(new Map(hierarquia.filter((item) => (!grandeGrupo || item.grandeGrupo === grandeGrupo) && (!subgrupoPrincipal || item.subgrupoPrincipal === subgrupoPrincipal)).map((item) => [item.familia, item])).values()).sort((a, b) => a.familia.localeCompare(b.familia, 'pt-BR'))
  const filtrosAtivos = [grandeGrupo, subgrupoPrincipal, familia, palavrasObrigatorias, palavrasExcluidas, salarioMinimo, salarioMaximo, minimoUfs].filter(Boolean).length

  function limparFiltrosAvancados() {
    setGrandeGrupo('')
    setSubgrupoPrincipal('')
    setFamilia('')
    setPalavrasObrigatorias('')
    setPalavrasExcluidas('')
    setSalarioMinimo('')
    setSalarioMaximo('')
    setMinimoUfs('')
  }

  const linhasComparacao: Array<[string, (item: SalarioCard) => number | null | undefined]> = [
    ['Faixa inferior (P25)', (item) => item.percentis?.p25],
    ['Valor central (mediana/P50)', (item) => item.percentis?.p50 ?? item.estatisticas.mediana],
    ['Média observada', (item) => item.estatisticas.media],
    ['Faixa superior (P75)', (item) => item.percentis?.p75],
    ['UFs consideradas', (item) => item.ufCount],
  ]

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
            <div className="space-y-3">
              <div className="relative w-full">
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
                <Button type="button" variant="outline" onClick={() => setMostrarFiltros((valor) => !valor)} aria-expanded={mostrarFiltros}>
                  <Filter className="mr-2 h-4 w-4" />Filtros avançados{filtrosAtivos ? ` (${filtrosAtivos})` : ''}<ChevronDown className={`ml-2 h-4 w-4 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
                </Button>
                <Button type="button" variant="outline" onClick={exportar} disabled={exportando}>
                  <Download className="mr-2 h-4 w-4" />
                  {exportando ? 'Gerando...' : 'Exportar XLSX'}
                </Button>
              </div>
            </div>
            {mostrarFiltros ? <div className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium text-slate-900 dark:text-white">Refine a escolha da ocupação</p><p className="text-xs text-slate-600 dark:text-slate-400">Use os campos abaixo e clique em Buscar para atualizar os resultados.</p></div>
                <Button type="button" size="sm" variant="ghost" onClick={limparFiltrosAvancados}><X className="mr-1 h-4 w-4" />Limpar filtros</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm text-slate-700 dark:text-slate-300">Grande grupo
                  <select value={grandeGrupo} onChange={(event) => { setGrandeGrupo(event.target.value); setSubgrupoPrincipal(''); setFamilia('') }} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todos</option>{grandesGrupos.map((item) => <option key={item.grandeGrupo} value={item.grandeGrupo}>{item.grandeGrupoCodigo ? `${item.grandeGrupoCodigo} — ` : ''}{item.grandeGrupo}</option>)}</select>
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Subgrupo principal
                  <select value={subgrupoPrincipal} onChange={(event) => { setSubgrupoPrincipal(event.target.value); setFamilia('') }} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todos</option>{subgrupos.map((item) => <option key={item.subgrupoPrincipal} value={item.subgrupoPrincipal}>{item.subgrupoPrincipalCodigo ? `${item.subgrupoPrincipalCodigo} — ` : ''}{item.subgrupoPrincipal}</option>)}</select>
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Família ocupacional (4 dígitos)
                  <select value={familia} onChange={(event) => setFamilia(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todas</option>{familias.map((item) => <option key={item.familia} value={item.familiaCodigo || item.familia}>{item.familiaCodigo ? `${item.familiaCodigo} — ` : ''}{item.familia}</option>)}</select>
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Palavras que devem aparecer
                  <Input value={palavrasObrigatorias} onChange={(event) => setPalavrasObrigatorias(event.target.value)} placeholder="ex.: aeroporto, limpeza" className="mt-1" />
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Palavras para excluir
                  <Input value={palavrasExcluidas} onChange={(event) => setPalavrasExcluidas(event.target.value)} placeholder="ex.: motorista" className="mt-1" />
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Mínimo de UFs com salário
                  <Input type="number" min={1} max={27} value={minimoUfs} onChange={(event) => setMinimoUfs(event.target.value)} placeholder="ex.: 10" className="mt-1" />
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Salário de referência para filtrar
                  <select value={referencia} onChange={(event) => setReferencia(event.target.value as ReferenciaSalarial)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="mediana">Valor central (mediana/P50)</option><option value="p25">Faixa inferior (P25)</option><option value="media">Média observada</option><option value="p75">Faixa superior (P75)</option></select>
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Salário mínimo
                  <Input type="number" min={0} step="0.01" value={salarioMinimo} onChange={(event) => setSalarioMinimo(event.target.value)} placeholder="R$" className="mt-1" />
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-300">Salário máximo
                  <Input type="number" min={0} step="0.01" value={salarioMaximo} onChange={(event) => setSalarioMaximo(event.target.value)} placeholder="R$" className="mt-1" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-cyan-200 pt-3 dark:border-cyan-900">
                <label className="text-sm text-slate-700 dark:text-slate-300">Ordenar resultados
                  <select value={ordenar} onChange={(event) => setOrdenar(event.target.value as OrdenacaoSalarios)} className="ml-2 min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="relevancia">Maior aderência ao termo</option><option value="salario_asc">Menor salário de referência</option><option value="salario_desc">Maior salário de referência</option><option value="ufs_desc">Mais UFs disponíveis</option><option value="amplitude_asc">Menor variação salarial</option><option value="titulo">Título em ordem alfabética</option></select>
                </label>
              </div>
            </div> : null}
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

          {comparacao.length > 0 ? <Card className="border-cyan-300 dark:border-cyan-800">
            <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Comparação de ocupações ({comparacao.length}/5)</CardTitle><CardDescription>Compare as referências antes de decidir qual posto vai para a grade.</CardDescription></div><Button type="button" size="sm" variant="ghost" onClick={() => setComparacao([])}><X className="mr-1 h-4 w-4" />Limpar</Button></CardHeader>
            <CardContent className="overflow-x-auto"><div className="min-w-[760px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full text-sm"><thead className="bg-slate-100 dark:bg-slate-900"><tr><th className="p-3 text-left">Critério</th>{comparacao.map((item) => <th key={item.cbo} className="min-w-[180px] p-3 text-left">{item.cbo} — {item.titulo}</th>)}</tr></thead><tbody>{linhasComparacao.map(([label, valor]) => <tr key={label} className="border-t border-slate-200 dark:border-slate-800"><th className="whitespace-nowrap p-3 text-left font-medium">{label}</th>{comparacao.map((item) => <td key={item.cbo} className="p-3">{label === 'UFs consideradas' ? `${valor(item)} UFs` : formatarMoeda(valor(item) as number | null)}</td>)}</tr>)}<tr className="border-t border-slate-200 dark:border-slate-800"><th className="p-3 text-left font-medium">Ação</th>{comparacao.map((item) => <td key={item.cbo} className="p-3"><Button type="button" size="sm" onClick={() => adicionarNaGrade(item)}><Plus className="mr-1 h-4 w-4" />Adicionar</Button></td>)}</tr></tbody></table></div></CardContent>
          </Card> : null}

          {data.items.map((item) => (
            <CardSalario key={item.cbo} item={item} aplicarInpc={aplicarInpc} adicionar={adicionarNaGrade} comparar={alternarComparacao} selecionado={comparacao.some((linha) => linha.cbo === item.cbo)} />
          ))}

          {grade.length ? <Card>
            <CardHeader><CardTitle>Grade de postos ({grade.length} funções · {grade.reduce((total, linha) => total + linha.quantidade, 0)} postos)</CardTitle><CardDescription>Defina a quantidade e o salário mensal que será usado como referência na formação de preços.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {grade.map((linha) => <div key={linha.cbo} className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 lg:grid-cols-[minmax(0,1fr)_110px_230px_180px_44px] lg:items-end">
                <div className="min-w-0"><strong>{linha.cbo}</strong> · {linha.titulo}<div className="text-xs text-slate-500">Faixa inferior (P25): {formatarMoeda(linha.percentis?.p25 ?? null)} · valor central (mediana): {formatarMoeda(linha.estatisticas.mediana)} · faixa superior (P75): {formatarMoeda(linha.percentis?.p75 ?? null)}</div></div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Quantidade
                  <Input type="number" min={1} max={9999} value={linha.quantidade} onChange={(event) => atualizarGrade(linha.cbo, { quantidade: Math.max(1, Number(event.target.value) || 1) })} className="mt-1" />
                </label>
                <label className="text-xs text-slate-600 dark:text-slate-300">Referência salarial
                  <select value={linha.criterioReferencia} onChange={(event) => {
                    const criterio = event.target.value as SalarioGradeItem['criterioReferencia']
                    atualizarGrade(linha.cbo, { criterioReferencia: criterio, salarioReferencia: valorDoCriterio(linha, criterio) })
                  }} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <option value="p25">Faixa inferior (P25)</option>
                    <option value="mediana">Valor central (mediana/P50)</option>
                    <option value="media">Média observada</option>
                    <option value="p75">Faixa superior (P75)</option>
                    <option value="personalizado">Valor personalizado</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600 dark:text-slate-300">Salário mensal adotado
                  <Input type="number" min={0} step="0.01" value={linha.salarioReferencia ?? ''} onChange={(event) => atualizarGrade(linha.cbo, { criterioReferencia: 'personalizado', salarioReferencia: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1" />
                </label>
                <button type="button" aria-label={`Remover ${linha.titulo} da grade`} onClick={() => removerDaGrade(linha.cbo)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>)}
              <div className="flex justify-end pt-2"><Button type="button" onClick={exportar} disabled={exportando}><Download className="mr-2 h-4 w-4" />{exportando ? 'Gerando...' : 'Exportar grade para formação de preços'}</Button></div>
            </CardContent>
          </Card> : null}

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
