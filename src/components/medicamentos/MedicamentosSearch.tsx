'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { MedicamentosBuscaResponse } from '@/features/medicamentos/medicamentos.types'

export function MedicamentosSearch() {
  const [termo, setTermo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [data, setData] = useState<MedicamentosBuscaResponse | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function buscar(novaPagina = 1) {
    const q = termo.trim()
    if (q.length < 2) {
      setData(null)
      setErro('Digite ao menos 2 caracteres para pesquisar.')
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      const response = await fetch(`/api/v1/medicamentos?q=${encodeURIComponent(q)}&pagina=${novaPagina}&limite=20`)
      if (!response.ok) throw new Error('Falha ao buscar medicamentos.')
      setData(await response.json())
      setPagina(novaPagina)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao buscar medicamentos.')
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
            Pesquisar medicamentos
          </CardTitle>
          <CardDescription>Consulte medicamentos por princípio ativo, concentração, código BR ou código CATMAT.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); void buscar(1) }} className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Pesquisar medicamentos"
              placeholder="Ex: Abacavir, 300 mg ou BR0268315"
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
            />
            <Button type="submit" disabled={carregando}>
              <Search className="mr-2 h-4 w-4" />
              {carregando ? 'Buscando...' : 'Buscar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {erro ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{erro}</p> : null}

      {data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data.total.toLocaleString('pt-BR')} medicamento(s) encontrado(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <tr><th className="px-3 py-3">Código BR</th><th className="px-3 py-3">CATMAT</th><th className="px-3 py-3">Princípio ativo</th><th className="px-3 py-3">Concentração</th><th className="px-3 py-3">Forma</th><th className="px-3 py-3">Fornecimento</th></tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3 font-medium text-cyan-700 dark:text-cyan-400">{item.codigoBr}</td>
                      <td className="px-3 py-3">{item.catmat}</td>
                      <td className="px-3 py-3">{item.principioAtivo}</td>
                      <td className="px-3 py-3">{item.concentracao}</td>
                      <td className="px-3 py-3">{item.formaFarmaceutica}</td>
                      <td className="px-3 py-3">{item.unidadeFornecimento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.totalPaginas > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>Página {pagina} de {data.totalPaginas}</span>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={pagina <= 1 || carregando} onClick={() => void buscar(pagina - 1)}>Anterior</Button>
                  <Button variant="outline" disabled={pagina >= data.totalPaginas || carregando} onClick={() => void buscar(pagina + 1)}>Próxima</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
