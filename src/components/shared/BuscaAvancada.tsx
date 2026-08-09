'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Copy, Download, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoritoButton } from '@/components/shared/FavoritoButton'
import { useBuscaItens, type BuscaItem } from '@/hooks/useBuscaItens'

const badgeClasses = {
  exato: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  alta: 'bg-sky-600/20 text-sky-300 border-sky-500/40',
  similar: 'bg-slate-600/20 text-slate-300 border-slate-500/40',
}

interface BuscaAvancadaProps {
  initialResults?: unknown
}

interface GradeUnidade {
  sigla: string
  nome: string
  capacidade: number | null
  quantidadeCompras: number
}

type GradeItem = Record<string, unknown> & {
  codigoItem: number
  descricaoItem: string
  criterioPreco?: string
  precoPersonalizado?: number | null
  precoUnitario?: number | null
  quantidadeCompras?: number
  periodoInicio?: string | null
  periodoFim?: string | null
  fonte?: string
  unidade?: string | null
  unidades?: GradeUnidade[]
  metricas?: Record<string, number | string | null | undefined>
}

export function BuscaAvancada({ initialResults }: BuscaAvancadaProps) {
  const [termo, setTermo] = useState('')
  const [codigoGrupo, setCodigoGrupo] = useState('')
  const [codigoClasse, setCodigoClasse] = useState('')
  const [codigoPdm, setCodigoPdm] = useState('')
  const [aplicaMargem, setAplicaMargem] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [gradeItens, setGradeItens] = useState<GradeItem[]>([])
  const [gradeNome, setGradeNome] = useState('principal')
  const [grades, setGrades] = useState<string[]>(['principal'])
  const [gradeAtiva, setGradeAtiva] = useState('principal')
  const [novoNomeGrade, setNovoNomeGrade] = useState('')
  const [copiadoCodigo, setCopiadoCodigo] = useState<number | null>(null)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [filtroFaixa, setFiltroFaixa] = useState<'todos' | 'exato' | 'alta' | 'similar'>('todos')
  const { data, isLoading, error, mutate } = useBuscaItens(initialResults as any)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sincronizarUrl = (nextTermo: string, nextGrupo: string, nextClasse: string, nextPdm: string, nextPagina: number) => {
    const params = new URLSearchParams()
    const termoLimpo = nextTermo.trim()
    if (termoLimpo) params.set('q', termoLimpo)
    if (nextGrupo) params.set('grupo', nextGrupo)
    if (nextClasse) params.set('classe', nextClasse)
    if (nextPdm) params.set('pdm', nextPdm)
    if (nextPagina > 1) params.set('pagina', String(nextPagina))

    const target = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(target, { scroll: false })
  }

  const carregarBusca = async (novaPagina = 1, overrides?: { termo?: string; grupo?: string; classe?: string; pdm?: string }) => {
    const proximoTermo = overrides?.termo ?? termo
    const proximoGrupo = overrides?.grupo ?? codigoGrupo
    const proximoClasse = overrides?.classe ?? codigoClasse
    const proximoPdm = overrides?.pdm ?? codigoPdm

    await mutate({
      termo: proximoTermo,
      pagina: novaPagina,
      limite: 12,
      filtros: {
        codigoGrupo: proximoGrupo ? [Number(proximoGrupo)] : undefined,
        codigoClasse: proximoClasse ? [Number(proximoClasse)] : undefined,
        codigoPdm: proximoPdm ? [Number(proximoPdm)] : undefined,
        aplicaMargemPreferencia: aplicaMargem === '' ? undefined : aplicaMargem === 'true',
      },
    })
    setPagina(novaPagina)
    sincronizarUrl(proximoTermo, proximoGrupo, proximoClasse, proximoPdm, novaPagina)
  }

  useEffect(() => {
    const qParam = searchParams?.get('q') || ''
    const grupoParam = searchParams?.get('grupo') || ''
    const classeParam = searchParams?.get('classe') || ''
    const pdmParam = searchParams?.get('pdm') || ''
    const paginaParam = Number(searchParams?.get('pagina') || 1)

    if (!qParam && !grupoParam && !classeParam && !pdmParam && paginaParam === 1) {
      setTermo('')
      setCodigoGrupo('')
      setCodigoClasse('')
      setCodigoPdm('')
      setPagina(1)
      return
    }

    setTermo(qParam)
    setCodigoGrupo(grupoParam)
    setCodigoClasse(classeParam)
    setCodigoPdm(pdmParam)
    setPagina(paginaParam)
  }, [searchParams])

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
      void fetch(`/api/catmat/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : [])
        .then((result) => {
          if (!controller.signal.aborted) {
            setSugestoes(Array.isArray(result) ? result : [])
            // Só abre o dropdown se o termo veio de digitação do usuário
            // (termo preenchido pela URL no carregamento não deve abrir)
            setMostrarSugestoes(digitouRef.current)
          }
        })
        .catch(() => {
          setSugestoes([])
          setMostrarSugestoes(false)
        })
    }, 150)

    return () => {
      controller.abort()
    }
  }, [termo])

  const adicionarItemGrade = async (item: BuscaItem) => {
    if (typeof window === 'undefined') return

    const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    const gradeSelecionada = Array.isArray(storage[gradeAtiva]) ? storage[gradeAtiva] : []
    const existe = gradeSelecionada.some((i: GradeItem) => i.codigoItem === item.codigoItem)

    if (existe) return

    let metricas: Record<string, number | string | null | undefined> | undefined
    let unidades: GradeUnidade[] = []
    let unidadeEscolhida: string | null = null
    try {
      const response = await fetch(`/api/catmat/precos?codigoItem=${item.codigoItem}`)
      const payload = await response.json()
      metricas = payload?.metricas
      unidades = Array.isArray(payload?.metricas?.unidades) ? payload.metricas.unidades : []

      // Sugestão automática: unidade mais frequente nas compras; com mais de uma
      // unidade, refaz as métricas só com ela (misturar unidades distorce a média)
      if (unidades.length) {
        unidadeEscolhida = unidades[0].sigla
        if (unidades.length > 1) {
          const detalhe = await fetch(`/api/catmat/precos?codigoItem=${item.codigoItem}&unidade=${encodeURIComponent(unidadeEscolhida)}`)
          const payloadDetalhe = await detalhe.json()
          if (payloadDetalhe?.metricas) metricas = payloadDetalhe.metricas
        }
      }
    } catch {
      metricas = undefined
    }

    const media = typeof metricas?.media === 'number' ? metricas.media : null
    const novoItem: GradeItem = {
      ...item,
      unidade: unidadeEscolhida,
      unidades,
      precoReferencia: media,
      criterioPreco: 'media',
      precoPersonalizado: null,
      precoUnitario: media,
      quantidadeCompras: typeof metricas?.quantidadeCompras === 'number' ? metricas.quantidadeCompras : 0,
      periodoInicio: typeof metricas?.periodoInicio === 'string' ? metricas.periodoInicio : null,
      periodoFim: typeof metricas?.periodoFim === 'string' ? metricas.periodoFim : null,
      fonte: typeof metricas?.fonte === 'string' ? metricas.fonte : 'Compras.gov.br / PNCP',
      metricas,
    }

    const novaGrade = [...gradeSelecionada, novoItem]
    storage[gradeAtiva] = novaGrade
    localStorage.setItem('catmat:grades', JSON.stringify(storage))
    setGradeItens(novaGrade)
    window.dispatchEvent(new Event('gradeAtualizada'))
  }

  const copiarCodigo = async (codigo: number) => {
    try {
      await navigator.clipboard.writeText(String(codigo))
      setCopiadoCodigo(codigo)
      window.setTimeout(() => setCopiadoCodigo(null), 1200)
    } catch {
      // noop
    }
  }

  const resumoGrade = useMemo(() => gradeItens.length, [gradeItens])

  const formatarMoeda = (valor: number | null | undefined) => {
    if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const calcularPrecoSelecionado = (item: GradeItem) => {
    const metricas = item.metricas ?? {}
    const criterio = item.criterioPreco || 'media'

    if (criterio === 'personalizado') {
      return typeof item.precoPersonalizado === 'number' ? item.precoPersonalizado : 0
    }

    const base = typeof metricas[criterio] === 'number' ? metricas[criterio] : metricas.media
    return typeof base === 'number' ? Number(base.toFixed(2)) : 0
  }

  const alterarUnidadeGrade = async (index: number, sigla: string) => {
    const item = gradeItens[index]
    if (!item) return
    try {
      const url = sigla
        ? `/api/catmat/precos?codigoItem=${item.codigoItem}&unidade=${encodeURIComponent(sigla)}`
        : `/api/catmat/precos?codigoItem=${item.codigoItem}`
      const response = await fetch(url)
      const payload = await response.json()
      const metricas = payload?.metricas
      const media = typeof metricas?.media === 'number' ? metricas.media : null
      atualizarItemGrade(index, {
        unidade: sigla || null,
        metricas,
        precoUnitario: media,
        quantidadeCompras: typeof metricas?.quantidadeCompras === 'number' ? metricas.quantidadeCompras : 0,
      })
    } catch {
      atualizarItemGrade(index, { unidade: sigla || null })
    }
  }

  const atualizarItemGrade = (index: number, atualizacao: Partial<GradeItem>) => {
    if (typeof window === 'undefined') return
    const proxGrade = gradeItens.map((item, itemIndex) => itemIndex === index ? { ...item, ...atualizacao } : item)
    setGradeItens(proxGrade)
    const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    storage[gradeAtiva] = proxGrade
    localStorage.setItem('catmat:grades', JSON.stringify(storage))
    window.dispatchEvent(new Event('gradeAtualizada'))
  }

  const criarGrade = () => {
    if (typeof window === 'undefined') return
    const nome = novoNomeGrade.trim() || `grade-${Date.now()}`
    const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    if (!storage[nome]) storage[nome] = []
    const nomes = Object.keys(storage)
    setGrades(nomes)
    setGradeAtiva(nome)
    setGradeNome(nome)
    setGradeItens(storage[nome])
    setNovoNomeGrade('')
    localStorage.setItem('catmat:grades', JSON.stringify(storage))
  }

  const renomearGrade = () => {
    if (typeof window === 'undefined' || gradeAtiva === 'principal') return
    const nome = novoNomeGrade.trim()
    if (!nome || nome === gradeAtiva) return
    const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    if (storage[nome]) return
    storage[nome] = storage[gradeAtiva] || []
    delete storage[gradeAtiva]
    setGrades(Object.keys(storage))
    setGradeAtiva(nome)
    setGradeNome(nome)
    setGradeItens(storage[nome])
    setNovoNomeGrade('')
    localStorage.setItem('catmat:grades', JSON.stringify(storage))
    window.dispatchEvent(new Event('gradeAtualizada'))
  }

  const removerGrade = () => {
    if (typeof window === 'undefined' || gradeAtiva === 'principal') return
    const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    delete storage[gradeAtiva]
    const nomes = Object.keys(storage)
    const proxima = nomes[0] || 'principal'
    setGrades(nomes)
    setGradeAtiva(proxima)
    setGradeNome(proxima)
    setGradeItens(Array.isArray(storage[proxima]) ? storage[proxima] : [])
    localStorage.setItem('catmat:grades', JSON.stringify(storage))
    window.dispatchEvent(new Event('gradeAtualizada'))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const gradeAtual = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    const nomes = Object.keys(gradeAtual).length ? Object.keys(gradeAtual) : ['principal']
    if (!gradeAtual.principal) gradeAtual.principal = []
    if (!gradeAtual[gradeAtiva] && gradeAtual.principal) {
      gradeAtual[gradeAtiva] = []
    }
    setGrades(nomes)
    setGradeItens(Array.isArray(gradeAtual[gradeAtiva]) ? gradeAtual[gradeAtiva] : [])
    localStorage.setItem('catmat:grades', JSON.stringify(gradeAtual))
  }, [])

  const exportarCsv = () => {
    if (!gradeItens.length) return

    const linhas = [
      ['codigoItem', 'descricaoItem', 'unidade', 'criterioPreco', 'precoUnitario', 'quantidadeCompras', 'periodoInicio', 'periodoFim', 'fonte'],
      ...gradeItens.map((item) => {
        const criterio = item.criterioPreco || 'media'
        const valorSelecionado = calcularPrecoSelecionado(item)
        const valor = criterio === 'personalizado' && typeof item.precoPersonalizado === 'number' ? item.precoPersonalizado : valorSelecionado
        return [
          String(item.codigoItem || ''),
          String(item.descricaoItem || ''),
          String(item.unidade || ''),
          criterio,
          String(valor ?? ''),
          String(item.quantidadeCompras ?? ''),
          String(item.periodoInicio || ''),
          String(item.periodoFim || ''),
          String(item.fonte || 'Compras.gov.br / PNCP'),
        ]
      }),
    ]

    const csv = linhas.map((linha) => linha.map((campo) => `${campo}`.includes(',') || `${campo}`.includes('"') ? `"${`${campo}`.replace(/"/g, '""')}"` : `${campo}`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'grade-catmat.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const resultadosVisiveis = useMemo(() => {
    if (!data?.items?.length) return []
    if (filtroFaixa === 'todos') return data.items
    return data.items.filter((item) => item.faixa === filtroFaixa)
  }, [data?.items, filtroFaixa])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrarSugestoes || !sugestoes.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSugestaoAtiva((value) => (value + 1) % sugestoes.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSugestaoAtiva((value) => (value - 1 + sugestoes.length) % sugestoes.length)
    } else if (event.key === 'Enter' && sugestaoAtiva >= 0) {
      event.preventDefault()
      const sugestaoSelecionada = sugestoes[sugestaoAtiva]
      setTermo(sugestaoSelecionada)
      setMostrarSugestoes(false)
      void carregarBusca(1, { termo: sugestaoSelecionada })
    } else if (event.key === 'Escape') {
      setMostrarSugestoes(false)
      setSugestaoAtiva(-1)
    }
  }

  const aplicarSugestao = (sugestao: string) => {
    digitouRef.current = false
    setTermo(sugestao)
    setMostrarSugestoes(false)
    void carregarBusca(1, { termo: sugestao })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            digitouRef.current = false
            setMostrarSugestoes(false)
            void carregarBusca(1)
          }}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Buscar itens CATMAT/CATSER</CardTitle>
              <CardDescription>
                Consulte descrições, grupos, classes, PDM e filtre por margem de preferência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Input
                    aria-label="Buscar no catálogo CATMAT"
                    placeholder="Ex: papel couche, notebook, software"
                    value={termo}
                    onChange={(event) => {
                      digitouRef.current = true
                      setTermo(event.target.value)
                    }}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-expanded={mostrarSugestoes && !!sugestoes.length}
                    aria-controls="sugestoes-busca"
                    aria-autocomplete="list"
                    aria-activedescendant={sugestaoAtiva >= 0 ? `sugestao-${sugestaoAtiva}` : undefined}
                  />
                  {mostrarSugestoes && sugestoes.length > 0 && (
                    <ul id="sugestoes-busca" role="listbox" className="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                      {sugestoes.map((sugestao, index) => (
                        <li
                          key={sugestao}
                          id={`sugestao-${index}`}
                          role="option"
                          aria-selected={index === sugestaoAtiva}
                          className={`cursor-pointer px-3 py-2 text-sm ${index === sugestaoAtiva ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
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

              {filtrosAbertos && (
                <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-4">
                  {data?.filtrosSugeridos?.grupos?.length ? (
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Grupo</label>
                      <Select value={codigoGrupo} onChange={(event) => setCodigoGrupo(event.target.value)}>
                        <option value="">Todos</option>
                        {data?.filtrosSugeridos?.grupos?.map((grupo) => (
                          <option key={grupo.codigo} value={grupo.codigo}>{grupo.codigo} - {grupo.nome || 'Grupo'}</option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {data?.filtrosSugeridos?.classes?.length ? (
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Classe</label>
                      <Select value={codigoClasse} onChange={(event) => setCodigoClasse(event.target.value)}>
                        <option value="">Todas</option>
                        {data?.filtrosSugeridos?.classes?.map((classe) => (
                          <option key={classe.codigo} value={classe.codigo}>{classe.codigo} - {classe.nome || 'Classe'}</option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {data?.filtrosSugeridos?.pdms?.length ? (
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">PDM</label>
                      <Select value={codigoPdm} onChange={(event) => setCodigoPdm(event.target.value)}>
                        <option value="">Todos</option>
                        {data?.filtrosSugeridos?.pdms?.map((pdm) => (
                          <option key={pdm.codigo} value={pdm.codigo}>{pdm.codigo} - {pdm.nome || 'PDM'}</option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Margem de preferência</label>
                    <Select value={aplicaMargem} onChange={(event) => setAplicaMargem(event.target.value)}>
                      <option value="">Todas</option>
                      <option value="true">Com margem</option>
                      <option value="false">Sem margem</option>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        <div className="space-y-4" aria-live="polite">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-300">
                <p>{error}</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => void carregarBusca(1)}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : resultadosVisiveis.length ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-400">Encontrados {data?.total ?? 0} resultados</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'todos', label: `Todos (${data?.total ?? 0})` },
                    { key: 'exato', label: `Exato (${data?.contagens?.exato ?? 0})` },
                    { key: 'alta', label: `Alta (${data?.contagens?.alta ?? 0})` },
                    { key: 'similar', label: `Similar (${data?.contagens?.similar ?? 0})` },
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFiltroFaixa(chip.key as 'todos' | 'exato' | 'alta' | 'similar')}
                      className={`rounded-full border px-3 py-1 text-sm ${filtroFaixa === chip.key ? 'border-cyan-500 bg-cyan-600/20 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {resultadosVisiveis.map((item) => (
                <Card key={item.codigoItem}>
                  <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{item.codigoItem}</Badge>
                        <span className="text-sm text-slate-400">{item.codigoGrupo} - {item.nomeGrupo}</span>
                        <span className="text-sm text-slate-500">/</span>
                        <span className="text-sm text-slate-400">{item.codigoClasse} - {item.nomeClasse}</span>
                      </div>
                      <p className="font-medium text-white">{item.descricaoItem}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span>PDM: {item.codigoPdm}</span>
                        <span>NCM: {item.codigoNcm || '-'}</span>
                        {item.aplicaMargemPreferencia && <Badge variant="secondary">Margem preferência</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.compatibilidade !== undefined && (
                        <Badge className={badgeClasses[item.faixa ?? 'similar']}>
                          {item.compatibilidade}% · {item.faixa === 'exato' ? 'Resultado exato' : item.faixa === 'alta' ? 'Alta similaridade' : 'Similar'}
                        </Badge>
                      )}
                      <Link href={`/material/${item.codigoItem}`} className="inline-flex items-center rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300">
                        Ver detalhes →
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => adicionarItemGrade(item)}>
                        Adicionar à grade
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copiarCodigo(item.codigoItem)}>
                        {copiadoCodigo === item.codigoItem ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copiadoCodigo === item.codigoItem ? 'Copiado!' : 'Copiar código'}
                      </Button>
                      <FavoritoButton item={{ codigoItem: item.codigoItem, descricaoItem: item.descricaoItem, nomePdm: item.nomePdm }} />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" disabled={pagina <= 1} onClick={() => void carregarBusca(pagina - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-slate-400">Página {data?.pagina ?? 1} de {data?.totalPaginas ?? 1}</span>
                <Button variant="outline" disabled={(data?.pagina ?? 1) >= (data?.totalPaginas ?? 1)} onClick={() => void carregarBusca((data?.pagina ?? 1) + 1)}>
                  Próxima
                </Button>
              </div>
            </>
          ) : !data ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-400">
                <p>Digite um termo acima para pesquisar no catálogo CATMAT — por descrição, grupo, classe ou PDM.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-slate-400">
                <p>Nenhum resultado encontrado para o termo informado.</p>
                {termo.trim() && sugestoes[0] && (
                  <p className="mt-3 text-sm text-cyan-300">
                    Você quis dizer{' '}
                    <button type="button" className="font-semibold underline" onClick={() => aplicarSugestao(sugestoes[0])}>
                      {sugestoes[0]}
                    </button>
                    ?
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Grade de seleção</CardTitle>
            <CardDescription>Itens adicionados para posterior escolha de unidade e preço.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              <p className="font-medium text-white">{resumoGrade} itens na grade</p>
              <p className="mt-2">A seleção fica salva no navegador e pode ser organizada por grade.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              <label className="block text-sm text-slate-300">Grade ativa</label>
              <Select value={gradeAtiva} onChange={(event) => {
                const nome = event.target.value
                const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
                setGradeAtiva(nome)
                setGradeNome(nome)
                setGradeItens(Array.isArray(storage[nome]) ? storage[nome] : [])
              }}>
                {grades.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
              </Select>
              <div className="flex gap-2">
                <Input value={novoNomeGrade} onChange={(event) => setNovoNomeGrade(event.target.value)} placeholder="Novo nome da grade" />
                <Button type="button" variant="outline" onClick={criarGrade}>Criar</Button>
              </div>
              {gradeAtiva !== 'principal' && (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={renomearGrade} disabled={!novoNomeGrade.trim()}>Renomear</Button>
                  <Button type="button" variant="ghost" onClick={removerGrade}>Excluir grade</Button>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              {gradeItens.length ? gradeItens.map((item, index) => (
                <div key={`${item.codigoItem}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="font-medium text-white">{item.descricaoItem}</div>
                  <div className="mt-2 text-xs text-slate-500">CATMAT {item.codigoItem}</div>
                  {Array.isArray(item.unidades) && item.unidades.length > 0 && (
                    <>
                      <label className="mt-2 block text-xs text-slate-400">Unidade de fornecimento</label>
                      <Select
                        value={item.unidade || ''}
                        onChange={(event) => void alterarUnidadeGrade(index, event.target.value)}
                      >
                        <option value="">Todas as unidades</option>
                        {item.unidades.map((unidade) => (
                          <option key={unidade.sigla} value={unidade.sigla}>
                            {unidade.sigla} — {unidade.nome}{unidade.capacidade ? ` (${unidade.capacidade})` : ''} · {unidade.quantidadeCompras} compras
                          </option>
                        ))}
                      </Select>
                    </>
                  )}
                  <Select
                    value={item.criterioPreco || 'media'}
                    onChange={(event) => atualizarItemGrade(index, { criterioPreco: event.target.value, precoUnitario: calcularPrecoSelecionado({ ...item, criterioPreco: event.target.value }) })}
                    className="mt-2"
                  >
                    <option value="menor">Menor</option>
                    <option value="media">Média</option>
                    <option value="mediana">Mediana</option>
                    <option value="maior">Maior</option>
                    <option value="personalizado">Personalizado</option>
                  </Select>
                  {item.criterioPreco === 'personalizado' && (
                    <Input
                      className="mt-2"
                      placeholder="Valor personalizado"
                      value={item.precoPersonalizado ?? ''}
                      onChange={(event) => atualizarItemGrade(index, { precoPersonalizado: Number(event.target.value) || 0 })}
                    />
                  )}
                  <div className="mt-2 text-xs text-slate-400">
                    Preço: {formatarMoeda(calcularPrecoSelecionado(item))}
                    {typeof item.metricas?.amostras === 'number' && item.metricas.amostras > 0 && (
                      <span className="text-slate-500"> · {item.metricas.amostras} compras consideradas</span>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Adicione itens para construir a grade.</p>}
              <Button type="button" variant="outline" className="w-full" onClick={exportarCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}