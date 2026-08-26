'use client'

import { useState } from 'react'
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
  const [filtros, setFiltros] = useState<TcePrFiltros>({})
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [ordenar, setOrdenar] = useState<OrdenacaoTcePr>('relevancia')
  const [data, setData] = useState<TcePrBuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)

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
              void carregarBusca(1)
            }}
            className="space-y-3"
          >
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1">
                <Input
                  aria-label="Buscar itens"
                  placeholder="Ex: motobomba, concreto, caneta, cadeira..."
                  value={termo}
                  onChange={(event) => setTermo(event.target.value)}
                />
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
