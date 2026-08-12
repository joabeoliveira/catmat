'use client'

import { useMemo, useState } from 'react'
import { FileSearch, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DanfeViewer } from '@/components/nfe/DanfeViewer'
import type { NFeResposta } from '@/features/nfe/nfe.service'

export function NFeSearch() {
  const [chave, setChave] = useState('')
  const [dados, setDados] = useState<NFeResposta | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const chaveLimpa = useMemo(() => chave.replace(/\D/g, ''), [chave])
  const chaveValida = chaveLimpa.length === 44

  async function consultar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setDados(null)

    if (!chaveValida) {
      setErro('Informe uma chave de acesso com 44 dígitos.')
      return
    }

    setCarregando(true)
    try {
      const response = await fetch(`/api/nfe/${chaveLimpa}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao consultar NF-e.')
      }

      setDados(payload)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao consultar NF-e.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Buscar NF-e pela chave de acesso
          </CardTitle>
          <CardDescription>
            Consulte notas fiscais eletrônicas publicadas no Portal da Transparência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={consultar} className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                aria-label="Chave de acesso da NF-e"
                inputMode="numeric"
                placeholder="Digite ou cole a chave de acesso com 44 dígitos"
                value={chave}
                onChange={(event) => setChave(event.target.value)}
              />
              <Button type="submit" disabled={carregando || !chaveValida} className="md:w-44">
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Consultar
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{chaveLimpa.length}/44 dígitos</span>
              {chaveLimpa.length > 0 && !chaveValida ? <span>Chave incompleta ou inválida.</span> : null}
            </div>
          </form>

          {erro ? (
            <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {erro}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {dados ? <DanfeViewer dados={dados} /> : null}
    </div>
  )
}
