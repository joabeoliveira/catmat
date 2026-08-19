'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CatserResults } from '@/components/catser/CatserResults'
import { CatserFiltros } from '@/components/catser/CatserFiltros'

export function CatserSearch() {
  const [termo, setTermo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [pagina, setPagina] = useState(1)

  async function consultar(event?: React.FormEvent) {
    if (event) event.preventDefault()
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (termo.trim()) params.set('q', termo.trim())
      params.set('pagina', String(pagina))

      const resp = await fetch(`/api/catser?${params.toString()}`)
      if (!resp.ok) throw new Error('Falha na busca')
      const payload = await resp.json()
      setResultados(Array.isArray(payload?.items) ? payload.items : payload || [])
    } catch (err) {
      setResultados([])
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            Buscar serviços (CATSER)
          </CardTitle>
          <CardDescription>Pesquise por descrição; use os filtros para refinar por localidade e período.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={consultar} className="space-y-3">
            <div className="flex gap-3">
              <Input
                aria-label="Buscar serviços"
                placeholder="Ex: manutenção elétrica predial"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
              <Button type="submit" disabled={carregando} className="md:w-44">
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
              </Button>
            </div>

            <CatserFiltros onChange={() => { /* placeholder: futuro refino */ }} />
          </form>
        </CardContent>
      </Card>

      <CatserResults resultados={resultados} carregando={carregando} onReload={consultar} />
    </div>
  )
}
