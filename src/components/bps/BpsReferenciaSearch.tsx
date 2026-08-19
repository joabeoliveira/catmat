'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Loader2, Pill, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface BpsReferenciaItem {
  id: number
  codigoCompra: string
  codigoCatmat: string | null
  descricaoCatmat: string
  unidadeFornecimento: string | null
  dataHomologacao: string | null
  modalidadeCompra: string | null
  cnpjFabricante: string | null
  fabricante: string | null
  cnpjFornecedor: string | null
  fornecedor: string | null
  cnpjComprador: string | null
  nomeInstituicao: string | null
  uf: string | null
  nomeMunicipio: string | null
  valorItemCompra: number | null
  quantidadeItemCompra: number | null
  valorTotalCompra: number | null
  observacoes: string | null
  seqCompraItem: string
  compatibilidade: number
}

interface BuscaResponse {
  items: BpsReferenciaItem[]
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
    ufs: Array<{ valor: string; quantidade: number }>
    municipios: Array<{ valor: string; quantidade: number }>
    catmats: Array<{ valor: string; quantidade: number }>
    modalidades: Array<{ valor: string; quantidade: number }>
    fabricantes: Array<{ valor: string; quantidade: number }>
    fornecedores: Array<{ valor: string; quantidade: number }>
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

export function BpsReferenciaSearch() {
  const [termo, setTermo] = useState('')
  const [refinamento, setRefinamento] = useState('')
  const [pagina, setPagina] = useState(1)
  const [uf, setUf] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [codigoCatmat, setCodigoCatmat] = useState('')
  const [modalidade, setModalidade] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [comprador, setComprador] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [resultado, setResultado] = useState<BuscaResponse | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const digitouRef = useRef(false)
  const debounceRef = useRef<number | null>(null)
  const sugestoesAbortRef = useRef<AbortController | null>(null)

  const temFiltros = useMemo(
    () => Boolean(uf || municipio || codigoCatmat || modalidade || fabricante || fornecedor || comprador || dataInicio || dataFim || valorMin || valorMax),
    [codigoCatmat, comprador, dataFim, dataInicio, fabricante, fornecedor, modalidade, municipio, uf, valorMax, valorMin],
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
      void fetch(`/api/bps/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
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

    const params = new URLSearchParams({ q, pagina: String(nextPagina), limite: '12' })
    if (uf) params.set('uf', uf)
    if (municipio.trim()) params.set('municipio', municipio.trim())
    if (codigoCatmat) params.set('codigoCatmat', codigoCatmat)
    if (modalidade) params.set('modalidade', modalidade)
    if (fabricante.trim()) params.set('fabricante', fabricante.trim())
    if (fornecedor.trim()) params.set('fornecedor', fornecedor.trim())
    if (comprador.trim()) params.set('comprador', comprador.trim())
    if (dataInicio) params.set('dataInicio', dataInicio)
    if (dataFim) params.set('dataFim', dataFim)
    if (valorMin) params.set('valorMin', valorMin)
    if (valorMax) params.set('valorMax', valorMax)

    setCarregando(true)
    setErro('')
    try {
      const response = await fetch(`/api/bps/referencias?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.erro || 'Falha ao buscar referências BPS.')
      setResultado(payload)
      setPagina(nextPagina)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao buscar referências BPS.')
    } finally {
      setCarregando(false)
    }
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

  function limparFiltros() {
    setUf('')
    setMunicipio('')
    setCodigoCatmat('')
    setModalidade('')
    setFabricante('')
    setFornecedor('')
    setComprador('')
    setDataInicio('')
    setDataFim('')
    setValorMin('')
    setValorMax('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Referência de preços BPS
          </CardTitle>
          <CardDescription>
            Consulte medicamentos, materiais e insumos de saúde por descritivo, com filtros por localidade e fornecedor.
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
                  aria-label="Buscar item de saúde no BPS"
                  placeholder="Ex: dipirona, luva procedimento, seringa descartável"
                  value={termo}
                  onChange={(event) => {
                    digitouRef.current = true
                    setTermo(event.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                  role="combobox"
                  aria-expanded={mostrarSugestoes && !!sugestoes.length}
                  aria-controls="sugestoes-bps"
                  aria-autocomplete="list"
                  aria-activedescendant={sugestaoAtiva >= 0 ? `sugestao-bps-${sugestaoAtiva}` : undefined}
                />
                {mostrarSugestoes && sugestoes.length > 0 ? (
                  <ul id="sugestoes-bps" role="listbox" className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {sugestoes.map((sugestao, index) => (
                      <li
                        key={`${sugestao}-${index}`}
                        id={`sugestao-bps-${index}`}
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
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">UF</label>
                  <Select value={uf} onChange={(event) => setUf(event.target.value)}>
                    <option value="">Todas</option>
                    {resultado?.filtrosSugeridos.ufs.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Município</label>
                  <Input value={municipio} onChange={(event) => setMunicipio(event.target.value)} placeholder="Ex: Curitiba" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">CATMAT</label>
                  <Select value={codigoCatmat} onChange={(event) => setCodigoCatmat(event.target.value)}>
                    <option value="">Todos</option>
                    {resultado?.filtrosSugeridos.catmats.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Modalidade</label>
                  <Select value={modalidade} onChange={(event) => setModalidade(event.target.value)}>
                    <option value="">Todas</option>
                    {resultado?.filtrosSugeridos.modalidades.map((item) => <option key={item.valor} value={item.valor}>{item.valor} ({item.quantidade})</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Fabricante</label>
                  <Input value={fabricante} onChange={(event) => setFabricante(event.target.value)} placeholder="Fabricante" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Fornecedor</label>
                  <Input value={fornecedor} onChange={(event) => setFornecedor(event.target.value)} placeholder="Fornecedor" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Comprador</label>
                  <Input value={comprador} onChange={(event) => setComprador(event.target.value)} placeholder="Instituição compradora" />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center">
              <div className="flex-1">
                <Input
                  aria-label="Refinar referências BPS"
                  placeholder="Refinar resultados: ex. 500mg, ampola, descartável"
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
              <Button type="button" variant="outline" onClick={() => void buscar(1)}>Refinar</Button>
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

          <p className="text-sm text-slate-600 dark:text-slate-400">
            {resultado.total.toLocaleString('pt-BR')} referências encontradas
          </p>

          {resultado.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{item.compatibilidade}% compatível</Badge>
                      {item.codigoCatmat ? <Badge variant="secondary">CATMAT {item.codigoCatmat}</Badge> : null}
                      {item.modalidadeCompra ? <Badge variant="secondary">{item.modalidadeCompra}</Badge> : null}
                      <span className="text-xs text-slate-500">{data(item.dataHomologacao)}</span>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.descricaoCatmat}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {item.fornecedor || 'Fornecedor não informado'} · {item.nomeMunicipio || '-'} / {item.uf || '-'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Comprador: {item.nomeInstituicao || '-'} · Fabricante: {item.fabricante || '-'}
                    </p>
                    {item.observacoes && item.observacoes !== '-' ? (
                      <p className="text-xs text-slate-500 line-clamp-2">{item.observacoes}</p>
                    ) : null}
                  </div>
                  <div className="min-w-48 text-left md:text-right">
                    <p className="text-xs uppercase text-slate-500">Valor item</p>
                    <p className="text-xl font-semibold text-cyan-700 dark:text-cyan-300">{moeda(item.valorItemCompra)}</p>
                    <p className="text-xs text-slate-500">
                      Qtd. {numero(item.quantidadeItemCompra)} · Total {moeda(item.valorTotalCompra)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <span>Compra {item.codigoCompra}</span>
                  <span>Seq. {item.seqCompraItem}</span>
                  <span>{item.unidadeFornecimento || 'Unidade não informada'}</span>
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
    </div>
  )
}
