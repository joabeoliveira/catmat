'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Download, Filter, Plus, Search, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { MedicamentoCatmatItem, MedicamentosBuscaResponse } from '@/features/medicamentos/medicamentos.types'

const GRADE_KEY = 'catmat:grade-medicamentos'

export function MedicamentosSearch() {
  const [termo, setTermo] = useState('')
  const [refinamento, setRefinamento] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1)
  const [pagina, setPagina] = useState(1)
  const [data, setData] = useState<MedicamentosBuscaResponse | null>(null)
  const [grade, setGrade] = useState<MedicamentoCatmatItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const digitouRef = useRef(false)

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(GRADE_KEY) || '[]')
      if (Array.isArray(salvo)) setGrade(salvo)
    } catch { /* inicia vazia */ }
  }, [])

  useEffect(() => { localStorage.setItem(GRADE_KEY, JSON.stringify(grade)) }, [grade])
  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const q = termo.trim()
    if (q.length < 2) { setSugestoes([]); setMostrarSugestoes(false); return }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const controller = new AbortController()
    abortRef.current?.abort(); abortRef.current = controller
    debounceRef.current = window.setTimeout(() => {
      void fetch(`/api/medicamentos/sugestoes?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : [])
        .then((result) => { if (!controller.signal.aborted) { setSugestoes(Array.isArray(result) ? result : []); setMostrarSugestoes(digitouRef.current) } })
        .catch(() => { setSugestoes([]); setMostrarSugestoes(false) })
    }, 180)
    return () => controller.abort()
  }, [termo])

  async function buscar(novaPagina = 1, termoOverride?: string) {
    const q = (termoOverride ?? termo).trim()
    const refinar = refinamento.trim()
    if (q.length < 2) { setData(null); setErro('Digite ao menos 2 caracteres para pesquisar.'); return }
    setCarregando(true); setErro(null); setMostrarSugestoes(false)
    try {
      const params = new URLSearchParams({ q, pagina: String(novaPagina), limite: '20' })
      if (refinar) params.set('refinar', refinar)
      const response = await fetch(`/api/v1/medicamentos?${params.toString()}`)
      if (!response.ok) throw new Error('Falha ao buscar medicamentos.')
      setData(await response.json()); setPagina(novaPagina)
    } catch (error) { setErro(error instanceof Error ? error.message : 'Falha ao buscar medicamentos.')
    } finally { setCarregando(false) }
  }

  function adicionar(item: MedicamentoCatmatItem) {
    setGrade((atual) => atual.some((linha) => linha.id === item.id) ? atual : [...atual, item])
  }

  function exportarExcel() {
    if (!grade.length) return
    const linhas = grade.map(({ id, compatibilidade, ...item }) => item)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(linhas), 'Medicamentos')
    XLSX.writeFile(workbook, `grade-medicamentos-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostrarSugestoes || !sugestoes.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setSugestaoAtiva((value) => (value + 1) % sugestoes.length) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSugestaoAtiva((value) => (value - 1 + sugestoes.length) % sugestoes.length) }
    else if (event.key === 'Escape') { setMostrarSugestoes(false); setSugestaoAtiva(-1) }
    else if (event.key === 'Enter' && sugestaoAtiva >= 0) { event.preventDefault(); const item = sugestoes[sugestaoAtiva]; setTermo(item); setMostrarSugestoes(false); void buscar(1, item) }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />Pesquisar medicamentos</CardTitle><CardDescription>Consulte por princípio ativo, concentração, código BR ou código CATMAT.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); digitouRef.current = false; void buscar(1) }} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Input aria-label="Pesquisar medicamentos" placeholder="Ex: Abacavir, 300 mg ou BR0268315" value={termo} onChange={(event) => { digitouRef.current = true; setTermo(event.target.value); setSugestaoAtiva(-1) }} onKeyDown={handleKeyDown} role="combobox" aria-expanded={mostrarSugestoes && !!sugestoes.length} aria-controls="sugestoes-medicamentos" aria-autocomplete="list" />
                {mostrarSugestoes && sugestoes.length > 0 ? <ul id="sugestoes-medicamentos" role="listbox" className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{sugestoes.map((sugestao, index) => <li key={sugestao} role="option" aria-selected={index === sugestaoAtiva} className={`cursor-pointer px-3 py-2 text-sm ${index === sugestaoAtiva ? 'bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} onMouseDown={() => { setTermo(sugestao); setMostrarSugestoes(false); void buscar(1, sugestao) }}>{sugestao}</li>)}</ul> : null}
              </div>
              <Button type="submit" disabled={carregando}><Search className="mr-2 h-4 w-4" />{carregando ? 'Buscando...' : 'Buscar'}</Button>
              <Button type="button" variant="outline" onClick={() => setFiltrosAbertos((value) => !value)}><Filter className="mr-2 h-4 w-4" />Refinar</Button>
            </div>
            {filtrosAbertos ? <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><label htmlFor="refinamento-medicamentos" className="mb-1 block text-sm font-medium">Palavras obrigatórias no resultado</label><div className="flex flex-col gap-2 sm:flex-row"><Input id="refinamento-medicamentos" placeholder="Ex: comprimido, solução, 500 mg" value={refinamento} onChange={(event) => setRefinamento(event.target.value)} /><Button type="button" variant="secondary" onClick={() => void buscar(1)}>Aplicar refinamento</Button></div></div> : null}
          </form>
        </CardContent>
      </Card>

      {erro ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{erro}</p> : null}
      {data ? <Card><CardHeader><CardTitle className="text-lg">{data.total.toLocaleString('pt-BR')} medicamento(s) encontrado(s)</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr><th className="px-3 py-3">Ação</th><th className="px-3 py-3">Código BR</th><th className="px-3 py-3">CATMAT</th><th className="px-3 py-3">Princípio ativo</th><th className="px-3 py-3">Concentração</th><th className="px-3 py-3">Forma</th><th className="px-3 py-3">Fornecimento</th></tr></thead><tbody>{data.items.map((item) => { const adicionado = grade.some((linha) => linha.id === item.id); return <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3"><Button type="button" size="sm" variant={adicionado ? 'secondary' : 'outline'} onClick={() => adicionar(item)}><Plus className="mr-1 h-4 w-4" />{adicionado ? <><Check className="mr-1 h-4 w-4" />Na grade</> : 'Adicionar'}</Button></td><td className="px-3 py-3 font-medium text-cyan-700 dark:text-cyan-400">{item.codigoBr}</td><td className="px-3 py-3">{item.catmat}</td><td className="px-3 py-3">{item.principioAtivo}</td><td className="px-3 py-3">{item.concentracao}</td><td className="px-3 py-3">{item.formaFarmaceutica}</td><td className="px-3 py-3">{item.unidadeFornecimento}</td></tr> })}</tbody></table></div>{data.totalPaginas > 1 ? <div className="mt-4 flex items-center justify-between text-sm"><span>Página {pagina} de {data.totalPaginas}</span><div className="flex gap-2"><Button variant="outline" disabled={pagina <= 1 || carregando} onClick={() => void buscar(pagina - 1)}>Anterior</Button><Button variant="outline" disabled={pagina >= data.totalPaginas || carregando} onClick={() => void buscar(pagina + 1)}>Próxima</Button></div></div> : null}</CardContent></Card> : null}

      <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Grade de medicamentos ({grade.length})</CardTitle><CardDescription>Selecione medicamentos nos resultados; a grade fica salva neste navegador.</CardDescription></div><Button type="button" variant="outline" onClick={exportarExcel} disabled={!grade.length}><Download className="mr-2 h-4 w-4" />Exportar Excel</Button></CardHeader><CardContent>{grade.length ? <div className="space-y-2">{grade.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"><div><p className="font-medium">{item.principioAtivo} — {item.concentracao}</p><p className="text-slate-500">{item.codigoBr} · CATMAT {item.catmat} · {item.formaFarmaceutica} · {item.unidadeFornecimento}</p></div><Button type="button" variant="ghost" size="sm" aria-label={`Remover ${item.principioAtivo}`} onClick={() => setGrade((atual) => atual.filter((linha) => linha.id !== item.id))}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div>)}</div> : <p className="text-sm text-slate-500">Nenhum medicamento adicionado à grade.</p>}</CardContent></Card>
    </div>
  )
}
