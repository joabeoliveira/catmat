'use client'

import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Filter, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CatserPrecosTable } from '@/components/catser/CatserPrecosTable'
import type { CatserItem, CatserPrecosResponse } from '@/features/catser/catser.types'
import type { FiltrosPesquisa, IdentificacaoPesquisa } from '@/features/pesquisa/pesquisa-precos.excel'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

const PODERES = [
  { valor: 'E', nome: 'Executivo' },
  { valor: 'L', nome: 'Legislativo' },
  { valor: 'J', nome: 'Judiciário' },
]

const ESFERAS = [
  { valor: 'F', nome: 'Federal' },
  { valor: 'E', nome: 'Estadual' },
  { valor: 'M', nome: 'Municipal' },
]

interface Props {
  servico: CatserItem
}

interface FiltrosAplicados {
  uf?: string
  uasg?: string
  poder?: string
  esfera?: string
  dataInicio?: string
  dataFim?: string
}

export function CatserPrecosPanel({ servico }: Props) {
  const codigoServico = servico.codigoServico
  const [uf, setUf] = useState('')
  const [uasg, setUasg] = useState('')
  const [poder, setPoder] = useState('')
  const [esfera, setEsfera] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosPesquisa>({})
  const [data, setData] = useState<CatserPrecosResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Identificação para o documento formal
  const [pesquisaAberta, setPesquisaAberta] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [orgao, setOrgao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [processo, setProcesso] = useState('')
  const [observacoes, setObservacoes] = useState('')

  async function consultar(overrides?: FiltrosAplicados) {
    const flt: FiltrosAplicados = {
      uf: overrides?.uf ?? uf,
      uasg: overrides?.uasg ?? uasg,
      poder: overrides?.poder ?? poder,
      esfera: overrides?.esfera ?? esfera,
      dataInicio: overrides?.dataInicio ?? dataInicio,
      dataFim: overrides?.dataFim ?? dataFim,
    }

    setCarregando(true)
    setErro(null)
    const params = new URLSearchParams({ tamanhoPagina: '10' })
    if (flt.uf) params.set('uf', flt.uf)
    if (flt.uasg) params.set('codigoUasg', flt.uasg)
    if (flt.poder) params.set('poder', flt.poder)
    if (flt.esfera) params.set('esfera', flt.esfera)
    if (flt.dataInicio) params.set('dataCompraInicio', flt.dataInicio)
    if (flt.dataFim) params.set('dataCompraFim', flt.dataFim)

    try {
      const resp = await fetch(`/api/catser/${codigoServico}/precos?${params.toString()}`)
      const payload = await resp.json()
      if (!resp.ok) throw new Error(payload?.error || 'Falha ao consultar preços.')
      setData(payload)
      setFiltrosAplicados({
        uf: flt.uf || undefined,
        uasg: flt.uasg || undefined,
        poder: flt.poder || undefined,
        esfera: flt.esfera || undefined,
        dataInicio: flt.dataInicio || undefined,
        dataFim: flt.dataFim || undefined,
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao consultar preços.')
      setData(null)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoServico])

  function limpar() {
    setUf('')
    setUasg('')
    setPoder('')
    setEsfera('')
    setDataInicio('')
    setDataFim('')
    void consultar({ uf: '', uasg: '', poder: '', esfera: '', dataInicio: '', dataFim: '' })
  }

  async function baixarExcel() {
    if (!data) return
    setGerando(true)
    try {
      const identificacao: IdentificacaoPesquisa = { orgao, responsavel, processo, observacoes }
      const resp = await fetch('/api/catser/pesquisa/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificacao,
          filtros: filtrosAplicados,
          servico: {
            codigoServico: servico.codigoServico,
            nomeServico: servico.nomeServico,
            nomeGrupo: servico.nomeGrupo,
            nomeClasse: servico.nomeClasse,
          },
          data,
        }),
      })

      if (!resp.ok) {
        const payload = await resp.json().catch(() => null)
        throw new Error(payload?.error || 'Falha ao gerar a planilha.')
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pesquisa-precos-catser-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao gerar a planilha.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <section className="space-y-4 px-6 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 lg:flex-row lg:flex-wrap lg:items-end">
        <div>
          <label className="mb-1 block text-xs text-slate-500">UF (região)</label>
          <Select value={uf} onChange={(event) => setUf(event.target.value)} className="w-32">
            <option value="">Todas</option>
            {UFS.map((sigla) => (
              <option key={sigla} value={sigla}>{sigla}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">UASG (órgão)</label>
          <Input
            aria-label="Código UASG"
            inputMode="numeric"
            maxLength={6}
            placeholder="Ex: 200001"
            value={uasg}
            onChange={(event) => setUasg(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Poder</label>
          <Select value={poder} onChange={(event) => setPoder(event.target.value)} className="w-40">
            <option value="">Todos</option>
            {PODERES.map((p) => (
              <option key={p.valor} value={p.valor}>{p.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Esfera</label>
          <Select value={esfera} onChange={(event) => setEsfera(event.target.value)} className="w-40">
            <option value="">Todas</option>
            {ESFERAS.map((e) => (
              <option key={e.valor} value={e.valor}>{e.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">De</label>
          <Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Até</label>
          <Input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} className="w-40" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void consultar()}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
            Aplicar
          </Button>
          <Button size="sm" variant="outline" onClick={limpar}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      {erro ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {erro}
        </div>
      ) : null}

      {carregando ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      ) : data ? (
        <>
          <CatserPrecosTable data={data} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Gerar pesquisa de preços (IN 65/2021)
              </h4>
              <p className="text-xs text-slate-500">
                Monte um documento formal com os preços e filtros atuais e baixe em Excel para anexar ao processo.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPesquisaAberta((value) => !value)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {pesquisaAberta ? 'Fechar' : 'Montar pesquisa'}
            </Button>
          </div>

          {pesquisaAberta ? (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Órgão solicitante</label>
                <Input
                  aria-label="Órgão solicitante"
                  placeholder="Ex: Prefeitura Municipal de ..."
                  value={orgao}
                  onChange={(event) => setOrgao(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Responsável pela pesquisa</label>
                <Input
                  aria-label="Responsável pela pesquisa"
                  placeholder="Nome do servidor responsável"
                  value={responsavel}
                  onChange={(event) => setResponsavel(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Nº do processo</label>
                <Input
                  aria-label="Número do processo"
                  placeholder="Ex: 2026.000.000000-0"
                  value={processo}
                  onChange={(event) => setProcesso(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Observações</label>
                <Input
                  aria-label="Observações"
                  placeholder="Informações complementares (opcional)"
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                />
              </div>
              <div className="flex items-end justify-end md:col-span-2">
                <Button size="sm" onClick={() => void baixarExcel()} disabled={gerando}>
                  {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Baixar Excel
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
