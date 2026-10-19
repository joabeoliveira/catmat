'use client'

import { useEffect, useState } from 'react'

type Job = { id: string; status: string; totalItens: number; processados?: number; aprovados?: number; pendentes?: number; progresso?: number; contagens?: Record<string, number> }
type Item = { id: string; sourceSheet: string; sourceRow: number; descricaoOriginal: string; descricaoNormalizada: string; tipoCatalogo: string; status: string; codigoAprovado?: number | null; candidates: Array<{ codigo: number; descricaoCatalogo: string; scoreFinal: number }> }
type ItemsPage = { items?: Item[]; total?: number; page?: number; totalPages?: number }

const badge: Record<string, string> = { ALTA_CONFIANCA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', MEDIA_CONFIANCA: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', BAIXA_CONFIANCA: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', SEM_MATCH: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', FORA_ESCOPO: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' }

export function PcaMatcher() {
  const [job, setJob] = useState<Job | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  async function refresh(id = job?.id, requestedPage = page) {
    if (!id) return
    const [summary, rowsResponse] = await Promise.all([fetch(`/api/pca/matcher/jobs/${id}`).then((r) => r.json()), fetch(`/api/pca/matcher/jobs/${id}/items?page=${requestedPage}&limit=25`).then((r) => r.json())])
    const rows = rowsResponse as ItemsPage
    setJob(summary); setItems(rows.items || []); setPage(rows.page || requestedPage); setTotalPages(rows.totalPages || 1); setTotalItems(rows.total || 0)
  }

  async function upload(file: File) {
    setLoading(true); setMessage('Importando e normalizando…')
    try { const form = new FormData(); form.set('file', file); const response = await fetch('/api/pca/matcher/jobs', { method: 'POST', body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPage(1); setJob(data); await refresh(data.id, 1); setMessage('Arquivo importado.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no upload.') } finally { setLoading(false) }
  }

  async function processAll() {
    if (!job) return
    setLoading(true); setMessage('Processando chunks…')
    try {
      let next: number | null = 0
      while (next !== null) {
        const response: Response = await fetch(`/api/pca/matcher/jobs/${job.id}/process-chunk`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offset: next, limit: 35 }) })
        const data: { error?: string; nextOffset: number | null; [key: string]: unknown } = await response.json()
        if (!response.ok) throw new Error(data.error || 'Falha no chunk.')
        next = data.nextOffset
        setJob((current) => current ? { ...current, ...(data as Partial<Job>) } : current)
        await refresh(job.id, page)
      }
      setMessage('Processamento concluído.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no processamento.') } finally { setLoading(false) }
  }

  async function approveAll() { if (!job) return; await fetch(`/api/pca/matcher/jobs/${job.id}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aprovarAlta: true }) }); await refresh(job.id, page) }
  async function approve(item: Item, code: number) { if (!job) return; await fetch(`/api/pca/matcher/jobs/${job.id}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: item.id, codigo: code, justificativa: 'Escolha manual no painel.' }) }); await refresh(job.id, page) }

  async function goToPage(nextPage: number) {
    if (!job || nextPage < 1 || nextPage > totalPages || nextPage === page) return
    await refresh(job.id, nextPage)
  }

  useEffect(() => { if (job?.id) void refresh(job.id) }, [])

  return <main className="mx-auto max-w-7xl space-y-6 p-6 text-slate-900 dark:text-slate-100">
    <header><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Smart Matcher PCA</h1><p className="text-sm text-slate-600 dark:text-slate-300">Concilie descrições de compras com CATMAT e CATSER, priorizando relevância, atividade e códigos recentes.</p></header>
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"><label className="block text-sm font-medium text-slate-800 dark:text-slate-200">Arquivo PCA (.xlsx, .xls ou .csv)<input className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700" type="file" accept=".xlsx,.xls,.csv" disabled={loading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} /></label>{message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>}</section>
    {job && <>
      <section className="grid gap-3 sm:grid-cols-4">{[['Itens', job.totalItens], ['Processados', job.processados || 0], ['Alta confiança', job.aprovados || job.contagens?.ALTA_CONFIANCA || 0], ['Pendentes', job.pendentes ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{value}</div></div>)}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-slate-900 dark:text-slate-100">Progresso: {job.progresso || 0}%</div><div className="mt-2 h-2 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-700"><div className="h-2 rounded bg-indigo-600" style={{ width: `${job.progresso || 0}%` }} /></div></div><div className="flex gap-2"><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={loading} onClick={() => void processAll()}>Processar chunks</button><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white" onClick={() => void approveAll()}>Aprovar altas</button><a className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200" href={`/api/pca/matcher/jobs/${job.id}/export`}>Exportar XLSX</a></div></div></section>
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr><th className="p-3">Origem</th><th className="p-3">Descrição</th><th className="p-3">Status</th><th className="p-3">Candidatos</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-200 align-top dark:border-slate-800"><td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{item.sourceSheet}:{item.sourceRow}</td><td className="max-w-xl p-3 text-slate-900 dark:text-slate-100"><div>{item.descricaoOriginal}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.descricaoNormalizada}</div></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${badge[item.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{item.status}</span></td><td className="p-3"><div className="space-y-2">{item.candidates.map((candidate) => <button key={candidate.codigo} className="block w-full rounded border border-slate-200 p-2 text-left text-slate-800 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-100" onClick={() => void approve(item, candidate.codigo)}><span className="font-semibold">{candidate.codigo}</span> · {candidate.descricaoCatalogo}<span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{Math.round(candidate.scoreFinal * 100)}%</span></button>)}</div></td></tr>)}</tbody></table><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-700"><span className="text-slate-600 dark:text-slate-300">Exibindo {totalItems ? ((page - 1) * 25) + 1 : 0}–{Math.min(page * 25, totalItems)} de {totalItems} itens</span><div className="flex items-center gap-2"><button className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200" disabled={page <= 1 || loading} onClick={() => void goToPage(page - 1)}>Anterior</button><span className="text-slate-600 dark:text-slate-300">Página {page} de {totalPages}</span><button className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200" disabled={page >= totalPages || loading} onClick={() => void goToPage(page + 1)}>Próxima</button></div></div></section>
    </>}
  </main>
}
