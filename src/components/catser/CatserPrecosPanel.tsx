'use client'

import { useEffect, useState } from 'react'
import { Filter, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CatserPrecosTable } from '@/components/catser/CatserPrecosTable'
import type { CatserPrecosResponse } from '@/features/catser/catser.types'

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
  codigoServico: number
}

interface FiltrosAplicados {
  uf?: string
  poder?: string
  esfera?: string
  dataInicio?: string
  dataFim?: string
}

export function CatserPrecosPanel({ codigoServico }: Props) {
  const [uf, setUf] = useState('')
  const [poder, setPoder] = useState('')
  const [esfera, setEsfera] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [data, setData] = useState<CatserPrecosResponse | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  async function consultar(overrides?: FiltrosAplicados) {
    const flt: FiltrosAplicados = {
      uf: overrides?.uf ?? uf,
      poder: overrides?.poder ?? poder,
      esfera: overrides?.esfera ?? esfera,
      dataInicio: overrides?.dataInicio ?? dataInicio,
      dataFim: overrides?.dataFim ?? dataFim,
    }

    setCarregando(true)
    setErro(null)
    const params = new URLSearchParams({ tamanhoPagina: '10' })
    if (flt.uf) params.set('uf', flt.uf)
    if (flt.poder) params.set('poder', flt.poder)
    if (flt.esfera) params.set('esfera', flt.esfera)
    if (flt.dataInicio) params.set('dataCompraInicio', flt.dataInicio)
    if (flt.dataFim) params.set('dataCompraFim', flt.dataFim)

    try {
      const resp = await fetch(`/api/catser/${codigoServico}/precos?${params.toString()}`)
      const payload = await resp.json()
      if (!resp.ok) throw new Error(payload?.error || 'Falha ao consultar preços.')
      setData(payload)
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
    setPoder('')
    setEsfera('')
    setDataInicio('')
    setDataFim('')
    void consultar({ uf: '', poder: '', esfera: '', dataInicio: '', dataFim: '' })
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
        <CatserPrecosTable data={data} />
      ) : null}
    </section>
  )
}
