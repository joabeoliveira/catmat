'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Importacao = {
  id: string
  dataInicio: string
  dataFim: string
  status: 'PENDENTE' | 'PROCESSANDO' | 'SUCESSO' | 'ERRO'
  tamanhoBytes: number
  processadoEm: string | null
  erro: string | null
  totalPrecos: number
}

function data(dataTexto: string | null): string {
  if (!dataTexto) return '—'
  return new Date(dataTexto).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function bytes(valor: number): string {
  if (!valor) return '—'
  return `${(valor / 1024).toFixed(1)} KB`
}

function statusLabel(status: Importacao['status']): string {
  return { PENDENTE: 'Pendente', PROCESSANDO: 'Processando', SUCESSO: 'Sucesso', ERRO: 'Erro' }[status]
}

export function AnpImportStatus() {
  const [items, setItems] = useState<Importacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const response = await fetch('/api/anp/semanas?limite=50', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Falha ao carregar importações ANP.')
      setItems(Array.isArray(payload.items) ? payload.items : [])
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar importações ANP.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Importações ANP</CardTitle>
          <CardDescription>Histórico das semanas processadas e quantidade de preços persistidos.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {erro ? <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{erro}</div> : null}
        {carregando ? <p className="text-sm text-slate-500">Carregando importações...</p> : null}
        {!carregando && !erro && items.length === 0 ? <p className="text-sm text-slate-500">Nenhuma importação encontrada.</p> : null}
        {!carregando && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr><th className="px-3 py-3">Período</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Preços</th><th className="px-3 py-3">Arquivo</th><th className="px-3 py-3">Processado em</th><th className="px-3 py-3">Erro</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{data(item.dataInicio).slice(0, 10)} a {data(item.dataFim).slice(0, 10)}</td>
                    <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{statusLabel(item.status)}</span></td>
                    <td className="px-3 py-3">{item.totalPrecos.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3">{bytes(item.tamanhoBytes)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{data(item.processadoEm)}</td>
                    <td className="max-w-sm px-3 py-3 text-rose-600 dark:text-rose-300">{item.erro || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
