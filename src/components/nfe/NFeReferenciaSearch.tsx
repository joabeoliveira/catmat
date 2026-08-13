'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSearch, Filter, Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DanfeViewer } from '@/components/nfe/DanfeViewer'
import type { NFeResposta } from '@/features/nfe/nfe.service'

interface NfeReferenciaItem {
  id: number
  chaveAcesso: string
  serie: string | null
  numero: string | null
  naturezaOperacao: string | null
  dataEmissao: string | null
  razaoSocialEmitente: string | null
  ufEmitente: string | null
  municipioEmitente: string | null
  orgaoDestinatario: string | null
  nomeDestinatario: string | null
  ufDestinatario: string | null
  numeroProduto: string | null
  descricaoProdutoServico: string
  codigoNcmSh: string | null
  ncmSh: string | null
  cfop: string | null
  quantidade: number | null
  unidade: string | null
  valorUnitario: number | null
  valorTotal: number | null
  compatibilidade: number
}

interface BuscaResponse {
  items: NfeReferenciaItem[]
  total: number
  pagina: number
  totalPaginas: number
  metricas: {
    quantidade: number
    menor: number | null
    media: number | null
    mediana: number | null
    maior: number | null
    valorTotal: number | null
  } | null
  filtrosSugeridos: {
    ufsEmitente: Array<{ valor: string; quantidade: number }>
    municipiosEmitente: Array<{ valor: string; quantidade: number }>
    ufsDestinatario: Array<{ valor: string; quantidade: number }>
    ncms: Array<{ valor: string; quantidade: number }>
    cfops: Array<{ valor: string; quantidade: number }>
  }
}

function moeda(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numero(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

function data(value: string | null | undefined) {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR')
}

export function NFeReferenciaSearch() {
  const [termo, setTermo] = useState('')
  const [refinamento, setRefinamento] = useState('')
  const [pagina, setPagina] = useState(1)
  const [ufEmitente, setUfEmitente] = useState('')
  const [municipioEmitente, setMunicipioEmitente] = useState('')
  const [ufDestinatario, setUfDestinatario] = useState('')
  const [ncm, setNcm] = useState('')
  const [cfop, setCfop] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [resultado, setResultado] = useState<BuscaResponse | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [danfe, setDanfe] = useState<NFeResposta | null>(null)
  const [danfeCarregando, setDanfeCarregando] = useState<string | null>(null)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const digitouRef = useRef(false)
  const debounceRef = useRef<number | null>(null)
  const sugestoesAbortRef = useRef<AbortController | null>(null)

  const temFiltros = useMemo(
    () => Boolean(ufEmitente || municipioEmitente || ufDestinatario || ncm || cfop || fornecedor || destinatario || dataInicio || dataFim || valorMin || valorMax),
    [cfop, dataFim, dataInicio, destinatario, fornecedor, municipioEmitente, ncm, ufDestinatario, ufEmitente, valorMax, valorMin],
  )

  useEffect(() => {
    const q = termo.trim()
    if (q.length < 2) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const controller = new AbortController()
    sugestoesAbortRef.current?.abort()
    sugestoesAbortRef.current = controller

    debounceRef.current = window.setTimeout(() => {
      void fetch(`/api/nfe/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : [])
        .then((payload) => {
          if (!controller.signal.aborted) {
            setSugestoes(Array.isArray(payload) ? payload : [])
            setMostrarSugestoes(digitouRef.current)
            setSugestaoAtiva(-1)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSugestoes([])
            setMostrarSugestoes(false)
          }
        })
    }, 150)

    return () => controller.abort()
  }, [termo])

  async function buscar(nextPagina = 1, termoOverride?: string, refinamentoOverride?: string) {
    const termoBase = termoOverride ?? termo
    const refinoBase = refinamentoOverride ?? refinamento
    const q = [termoBase, refinoBase].map((value) => value.trim()).filter(Boolean).join(' ')
    if (q.length < 2) {
      setErro('Digite pelo menos 2 caracteres para pesquisar.')
      return
    }

    const params = new URLSearchParams({
      q,
      pagina: String(nextPagina),
      limite: '12',
    })

    if (ufEmitente) params.set('ufEmitente', ufEmitente)
    if (municipioEmitente) params.set('municipioEmitente', municipioEmitente)
    if (ufDestinatario) params.set('ufDestinatario', ufDestinatario)
    if (ncm) params.set('ncm', ncm)
    if (cfop) params.set('cfop', cfop)
    if (fornecedor.trim()) params.set('fornecedor', fornecedor.trim())
    if (destinatario.trim()) params.set('destinatario', destinatario.trim())
    if (dataInicio) params.set('dataInicio', dataInicio)
    if (dataFim) params.set('dataFim', dataFim)
    if (valorMin) params.set('valorMin', valorMin)
    if (valorMax) params.set('valorMax', valorMax)

    setCarregando(true)
    setErro('')
    setDanfe(null)
    try {
      const response = await fetch(`/api/nfe/referencias?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.erro || 'Falha ao buscar referências.')
      setResultado(payload)
      setPagina(nextPagina)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao buscar referências.')
    } finally {
      setCarregando(false)
    }
  }

  async function gerarDanfe(chaveAcesso: string) {
    setErro('')
    setDanfe(null)
    setDanfeCarregando(chaveAcesso)
    try {
      const response = await fetch(`/api/nfe/${chaveAcesso}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Falha ao gerar DANFE.')
      setDanfe(payload)
      window.setTimeout(() => document.querySelector('.danfe-print-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao gerar DANFE.')
    } finally {
      setDanfeCarregando(null)
    }
  }

  function limparFiltros() {
    setUfEmitente('')
    setMunicipioEmitente('')
    setUfDestinatario('')
    setNcm('')
    setCfop('')
    setFornecedor('')
    setDestinatario('')
    setDataInicio('')
    setDataFim('')
    setValorMin('')
    setValorMax('')
  }

  function aplicarSugestao(sugestao: string) {
    digitouRef.current = false
    setTermo(sugestao)
    setMostrarSugestoes(false)
    setSugestaoAtiva(-1)
    void buscar(1, sugestao)
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

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Referência de preços por NF-e
          </CardTitle>
          <CardDescription>
            Pesquise descrições de produtos e serviços em itens de notas fiscais importadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void buscar(1)
            }}
          >
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Input
                  aria-label="Buscar produtos ou serviços em NF-e"
                  placeholder="Ex: carimbo automático, pneu 265/70R17, armário aço"
                  value={termo}
                  onChange={(event) => {
                    digitouRef.current = true
                    setTermo(event.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  role="combobox"
                  aria-expanded={mostrarSugestoes && !!sugestoes.length}
                  aria-controls="sugestoes-nfe"
                  aria-autocomplete="list"
                  aria-activedescendant={sugestaoAtiva >= 0 ? `sugestao-nfe-${sugestaoAtiva}` : undefined}
                />
                {mostrarSugestoes && sugestoes.length > 0 ? (
                  <ul id="sugestoes-nfe" role="listbox" className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {sugestoes.map((sugestao, index) => (
                      <li
                        key={`${sugestao}-${index}`}
                        id={`sugestao-nfe-${index}`}
                        role="option"
                        aria-selected={index === sugestaoAtiva}
                        className={`cursor-pointer px-3 py-2 text-sm ${index === sugestaoAtiva ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        onMouseDown={() => aplicarSugestao(sugestao)}
                      >
                        {sugestao}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Button type="submit" disabled={carregando} className="md:w-40">
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
              </Button>
              <Button type="button" variant="outline" onClick={() => setFiltrosAbertos((value) => !value)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>

            {filtrosAbertos ? (
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">UF emitente</label>
                  <Select value={ufEmitente} onChange={(event) => setUfEmitente(event.target.value)}>
                    <option value="">Todas</option>
                    {resultado?.filtrosSugeridos.ufsEmitente.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Município emitente</label>
                  <Input value={municipioEmitente} onChange={(event) => setMunicipioEmitente(event.target.value)} placeholder="Ex: Palmas" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">UF destinatário</label>
                  <Select value={ufDestinatario} onChange={(event) => setUfDestinatario(event.target.value)}>
                    <option value="">Todas</option>
                    {resultado?.filtrosSugeridos.ufsDestinatario.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">NCM/SH</label>
                  <Select value={ncm} onChange={(event) => setNcm(event.target.value)}>
                    <option value="">Todos</option>
                    {resultado?.filtrosSugeridos.ncms.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">CFOP</label>
                  <Select value={cfop} onChange={(event) => setCfop(event.target.value)}>
                    <option value="">Todos</option>
                    {resultado?.filtrosSugeridos.cfops.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Fornecedor</label>
                  <Input value={fornecedor} onChange={(event) => setFornecedor(event.target.value)} placeholder="Razão social" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Destinatário/órgão</label>
                  <Input value={destinatario} onChange={(event) => setDestinatario(event.target.value)} placeholder="Órgão ou destinatário" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Data inicial</label>
                  <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Data final</label>
                  <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Valor mínimo</label>
                  <Input inputMode="decimal" value={valorMin} onChange={(event) => setValorMin(event.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Valor máximo</label>
                  <Input inputMode="decimal" value={valorMax} onChange={(event) => setValorMax(event.target.value)} placeholder="0,00" />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={carregando} className="flex-1">Aplicar</Button>
                  <Button type="button" variant="ghost" onClick={limparFiltros} disabled={!temFiltros}>Limpar</Button>
                </div>
              </div>
            ) : null}
          </form>

          {erro ? (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {erro}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {resultado?.metricas ? (
        <div className="grid gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Menor', moeda(resultado.metricas.menor)],
            ['Média', moeda(resultado.metricas.media)],
            ['Mediana', moeda(resultado.metricas.mediana)],
            ['Maior', moeda(resultado.metricas.maior)],
            ['Amostras', resultado.metricas.quantidade.toLocaleString('pt-BR')],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-xs uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {resultado ? (
        <div className="space-y-4 print:hidden">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center">
              <div className="flex-1">
                <Input
                  aria-label="Refinar referências de NF-e"
                  placeholder="Refinar resultados: ex. preto, 30ml, metal"
                  value={refinamento}
                  onChange={(event) => setRefinamento(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void buscar(1)
                    }
                  }}
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void buscar(1)}>
                Refinar
              </Button>
              {refinamento.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRefinamento('')
                    void buscar(1, undefined, '')
                  }}
                >
                  Limpar
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {resultado.total.toLocaleString('pt-BR')} referências encontradas
            </p>
          </div>

          {resultado.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{item.compatibilidade}% compatível</Badge>
                      {item.codigoNcmSh ? <Badge variant="secondary">NCM {item.codigoNcmSh}</Badge> : null}
                      {item.cfop ? <Badge variant="secondary">CFOP {item.cfop}</Badge> : null}
                      <span className="text-xs text-slate-500">{data(item.dataEmissao)}</span>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.descricaoProdutoServico}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {item.razaoSocialEmitente || 'Fornecedor não informado'} · {item.municipioEmitente || '-'} / {item.ufEmitente || '-'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Destinatário: {item.nomeDestinatario || item.orgaoDestinatario || '-'} {item.ufDestinatario ? `/${item.ufDestinatario}` : ''}
                    </p>
                  </div>
                  <div className="min-w-48 text-left md:text-right">
                    <p className="text-xs uppercase text-slate-500">Valor unitário</p>
                    <p className="text-xl font-semibold text-cyan-700 dark:text-cyan-300">{moeda(item.valorUnitario)}</p>
                    <p className="text-xs text-slate-500">
                      Qtd. {numero(item.quantidade)} {item.unidade || ''} · Total {moeda(item.valorTotal)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <span className="break-all font-mono">Chave: {item.chaveAcesso}</span>
                  <Button type="button" size="sm" onClick={() => void gerarDanfe(item.chaveAcesso)} disabled={danfeCarregando === item.chaveAcesso}>
                    {danfeCarregando === item.chaveAcesso ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
                    Gerar DANFE
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {resultado.totalPaginas > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" disabled={pagina <= 1 || carregando} onClick={() => void buscar(pagina - 1)}>Anterior</Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">Página {resultado.pagina} de {resultado.totalPaginas}</span>
              <Button variant="outline" disabled={pagina >= resultado.totalPaginas || carregando} onClick={() => void buscar(pagina + 1)}>Próxima</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {danfe ? <DanfeViewer dados={danfe} /> : null}
    </div>
  )
}
