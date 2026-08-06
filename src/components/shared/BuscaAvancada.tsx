'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuscaItens, type BuscaItem } from '@/hooks/useBuscaItens'

const badgeClasses = {
  exato: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  alta: 'bg-sky-600/20 text-sky-300 border-sky-500/40',
  similar: 'bg-slate-600/20 text-slate-300 border-slate-500/40',
}

interface BuscaAvancadaProps {
  initialResults?: unknown
}

export function BuscaAvancada({ initialResults }: BuscaAvancadaProps) {
  const [termo, setTermo] = useState('')
  const [codigoGrupo, setCodigoGrupo] = useState('')
  const [codigoClasse, setCodigoClasse] = useState('')
  const [aplicaMargem, setAplicaMargem] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [criterioPreco, setCriterioPreco] = useState('media')
  const [precoCustomizado, setPrecoCustomizado] = useState('')
  const [gradeItens, setGradeItens] = useState<Array<Record<string, unknown>>>([])
  const [copiadoCodigo, setCopiadoCodigo] = useState<number | null>(null)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [filtroFaixa, setFiltroFaixa] = useState<'todos' | 'exato' | 'alta' | 'similar'>('todos')
  const { data, isLoading, error, mutate } = useBuscaItens()
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const carregarBusca = async (novaPagina = 1) => {
    await mutate({
      termo,
      pagina: novaPagina,
      limite: 4,
      filtros: {
        codigoGrupo: codigoGrupo ? [Number(codigoGrupo)] : undefined,
        codigoClasse: codigoClasse ? [Number(codigoClasse)] : undefined,
        aplicaMargemPreferencia: aplicaMargem === '' ? undefined : aplicaMargem === 'true',
      },
    })
    setPagina(novaPagina)
  }

  useEffect(() => {
    void carregarBusca(1)
  }, [])

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
            setMostrarSugestoes(true)
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

  const adicionarItemGrade = (item: BuscaItem) => {
    if (typeof window === 'undefined') return
    const gradeAtual = JSON.parse(sessionStorage.getItem('grade_itens') || '[]') as Array<Record<string, unknown>>
    const existe = gradeAtual.some((i) => i.codigoItem === item.codigoItem)

    if (!existe) {
      const storage = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
      const principal = Array.isArray(storage.principal) ? storage.principal : []
      const novaGrade = [...principal, { ...item, unidade: null, precoReferencia: null }]
      storage.principal = novaGrade
      localStorage.setItem('catmat:grades', JSON.stringify(storage))
      setGradeItens(novaGrade)
      window.dispatchEvent(new Event('gradeAtualizada'))
    }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const gradeAtual = JSON.parse(localStorage.getItem('catmat:grades') || '{}')
    const principal = Array.isArray(gradeAtual?.principal) ? gradeAtual.principal : []
    setGradeItens(principal)
  }, [])

  const exportarCsv = () => {
    if (!gradeItens.length) return

    const linhas = [
      ['codigoItem', 'descricaoItem', 'criterioPreco', 'precoSelecionado', 'observacao'],
      ...gradeItens.map((item) => {
        const valor = precoCustomizado && criterioPreco === 'personalizado' ? precoCustomizado : '0'
        return [String(item.codigoItem || ''), String(item.descricaoItem || ''), criterioPreco, valor, '']
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
      setTermo(sugestoes[sugestaoAtiva])
      setMostrarSugestoes(false)
      void carregarBusca(1)
    } else if (event.key === 'Escape') {
      setMostrarSugestoes(false)
      setSugestaoAtiva(-1)
    }
  }

  const aplicarSugestao = (sugestao: string) => {
    setTermo(sugestao)
    setMostrarSugestoes(false)
    void carregarBusca(1)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <form
          onSubmit={(event) => {
            event.preventDefault()
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
                    onChange={(event) => setTermo(event.target.value)}
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
                <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Grupo</label>
                    <Select value={codigoGrupo} onChange={(event) => setCodigoGrupo(event.target.value)}>
                      <option value="">Todos</option>
                      {data?.filtrosSugeridos?.grupos?.map((grupo) => (
                        <option key={grupo.codigo} value={grupo.codigo}>{grupo.codigo} - {grupo.nome || 'Grupo'}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Classe</label>
                    <Select value={codigoClasse} onChange={(event) => setCodigoClasse(event.target.value)}>
                      <option value="">Todas</option>
                      {data?.filtrosSugeridos?.classes?.map((classe) => (
                        <option key={classe.codigo} value={classe.codigo}>{classe.codigo} - {classe.nome || 'Classe'}</option>
                      ))}
                    </Select>
                  </div>
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
                      <Button variant="outline" size="sm" onClick={() => adicionarItemGrade(item)}>
                        Adicionar à grade
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copiarCodigo(item.codigoItem)}>
                        {copiadoCodigo === item.codigoItem ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copiadoCodigo === item.codigoItem ? 'Copiado!' : 'Copiar código'}
                      </Button>
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
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-slate-400">
                Nenhum resultado encontrado para o termo informado.
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
              <p className="mt-2">A seleção ficará salva no navegador até o fechamento da aba.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              <p className="font-medium text-white">Próximos passos</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Escolher unidade de medida via API do governo.</li>
                <li>Aplicar critérios de preço: menor, média, mediana ou personalizado.</li>
                <li>Espurgar outliers para alinhar ao mercado.</li>
              </ul>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              <label className="block text-sm text-slate-300">Critério de preço</label>
              <Select value={criterioPreco} onChange={(event) => setCriterioPreco(event.target.value)}>
                <option value="menor">Menor</option>
                <option value="media">Média</option>
                <option value="mediana">Mediana</option>
                <option value="maior">Maior</option>
                <option value="personalizado">Personalizado</option>
              </Select>
              {criterioPreco === 'personalizado' && (
                <Input
                  placeholder="Valor personalizado"
                  value={precoCustomizado}
                  onChange={(event) => setPrecoCustomizado(event.target.value)}
                />
              )}
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