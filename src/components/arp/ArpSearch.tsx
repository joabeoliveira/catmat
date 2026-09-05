'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { ArrowUp, CalendarDays, ExternalLink, FileSearch, LoaderCircle, MapPin, PackageSearch, RefreshCw, Search, X } from 'lucide-react'

type Item = Record<string, any>
type SearchValues = { uasg: string; catmat: string; uf: string; objeto: string }
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const dateBR = (v?: string) => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${v.slice(0, 10)}T00:00:00`)) : '—'
const money = (v: any) => v === null || v === undefined || v === '' ? 'Não informado' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const api = async (ep: string, params: Record<string, string>) => {
  const q = new URLSearchParams({ endpoint: ep, ...params })
  const res = await fetch(`/api/arp?${q}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.erro || 'Falha ao consultar ARPs.')
  return data
}
const localApi = async (params: Record<string, string>) => {
  const res = await fetch(`${params.uasg || params.catmat ? '/api/arp/pesquisa' : '/api/arp/local'}?${new URLSearchParams(params)}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.erro || 'Falha ao consultar ARPs armazenadas.')
  return data
}

function pncp(item: Item) {
  const direct = item.linkAtaPncp || item.linkAtaPNCP || item.ata?.linkAtaPncp || item.ata?.linkAtaPNCP
  if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct
  const m = item.numeroControlePncpAta?.match(/^(\d{14})-\d+-(\d+)\/(\d{4})-(\d+)$/)
  return m ? `https://pncp.gov.br/app/atas/${m[1]}/${m[3]}/${Number(m[2])}/${Number(m[4])}` : null
}

export function ArpSearch() {
  const [aba, setAba] = useState<'atas' | 'adesao'>('adesao')
  const [uasg, setUasg] = useState(''); const [catmat, setCatmat] = useState(''); const [uf, setUf] = useState(''); const [objeto, setObjeto] = useState('')
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [searched, setSearched] = useState(false); const [selected, setSelected] = useState<Item | null>(null)
  const [homeItems, setHomeItems] = useState<Item[]>([]); const [homeLoading, setHomeLoading] = useState(true); const [homeQuery, setHomeQuery] = useState('')
  const [history, setHistory] = useState<Partial<SearchValues>[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncPage, setSyncPage] = useState(1)
  const [syncInfo, setSyncInfo] = useState('')
  const [adesaoSyncPage, setAdesaoSyncPage] = useState(1)
  const [adesaoItems, setAdesaoItems] = useState<Item[]>([]); const [adesaoLoading, setAdesaoLoading] = useState(true); const [adesaoSyncing, setAdesaoSyncing] = useState(false); const [adesaoSyncInfo, setAdesaoSyncInfo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [paginas, setPaginas] = useState(1)
  const [applied, setApplied] = useState<SearchValues>({ uasg: '', catmat: '', uf: '', objeto: '' })
  const requestId = useRef(0)
  const buscaRef = useRef<HTMLElement>(null)

  async function loadHome(page = 1) {
    setHomeLoading(true)
    try {
      const data = await localApi({ pagina: String(page), limite: '200', q: '' })
      setPagina(page); setPaginas(data.totalPaginas || 1)
      setHomeItems((data.resultado || []).map((i: Item) => ({ ...(i.ata || {}), ...i, valorTotalAta: i.ata?.valorTotal })).slice(0, 200))
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar atas vigentes.') } finally { setHomeLoading(false) }
  }
  async function loadAdesao(page = 1, values: SearchValues = { uasg: '', catmat: '', uf: '', objeto: '' }) {
    setAdesaoLoading(true)
    try {
      const res = await fetch(`/api/arp/adesao?${new URLSearchParams({ pagina: String(page), limite: '200', q: values.objeto, uasg: values.uasg, catmat: values.catmat })}`)
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Falha ao carregar oportunidades de adesão.')
      setAdesaoItems(data.resultado || []); setPagina(page); setPaginas(data.totalPaginas || 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar oportunidades de adesão.') } finally { setAdesaoLoading(false) }
  }
  async function syncAdesao() {
    setAdesaoSyncing(true); setError('')
    try {
      const res = await fetch(`/api/arp/adesao/sincronizar?pagina=${adesaoSyncPage}`, { method: 'POST' }); const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha na sincronização de oportunidades.')
      setAdesaoSyncPage(data.proximaPagina || 1); setAdesaoSyncInfo(`${data.gravados} itens disponíveis atualizados. Lote ${data.pagina} de ${data.totalPaginas}.`); await loadAdesao()
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao sincronizar oportunidades.') } finally { setAdesaoSyncing(false) }
  }
  async function syncDatabase() {
    setSyncing(true); setError('')
    try { const response = await fetch(`/api/arp/sincronizar?pagina=${syncPage}`, { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.erro || 'Falha na sincronização'); setSyncPage(data.proximaPagina || 1); setSyncInfo(`${data.gravadas} atas atualizadas. Página ${data.pagina} de ${data.totalPaginas}.`); await loadHome() }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao sincronizar ARPs.') }
    finally { setSyncing(false) }
  }
  useEffect(() => { loadHome(); loadAdesao(); try { setHistory(JSON.parse(localStorage.getItem('catmat:arp:historico') || '[]')) } catch {} }, [])

  async function search(event?: React.FormEvent, values: SearchValues = { uasg, catmat, uf, objeto }, page = 1) {
    event?.preventDefault(); if (!values.uasg && !values.catmat && !values.objeto) return
    const current = ++requestId.current
    setApplied(values); setLoading(true); setSearched(true); setError(''); setItems([])
    const next = [values, ...history.filter(h => h.uasg !== values.uasg || h.catmat !== values.catmat)].slice(0, 8); setHistory(next); try { localStorage.setItem('catmat:arp:historico', JSON.stringify(next)) } catch {}
    try {
      const data = aba === 'adesao' ? await (async () => { const res = await fetch(`/api/arp/adesao?${new URLSearchParams({ pagina: String(page), limite: '200', q: values.objeto, uasg: values.uasg, catmat: values.catmat })}`); const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Falha ao buscar oportunidades.'); return json })() : await localApi({ pagina: String(page), limite: '200', q: values.objeto, uasg: values.uasg, catmat: values.catmat, uf: values.uf }); let result = (data.resultado || []).map((i: Item) => ({ ...(i.ata || {}), ...i, valorTotalAta: i.ata?.valorTotal }))
      if (aba === 'adesao') { setAdesaoItems(result); setPagina(page); setPaginas(data.totalPaginas || 1); return }
      if (values.uf) {
        const codes = Array.from(new Set<string>(result.map((i: Item) => String(i.codigoUnidadeGerenciadora))))
        const map = new Map<string, string>()
        for (let offset = 0; offset < codes.length; offset += 4) {
          await Promise.all(codes.slice(offset, offset + 4).map(async code => {
            const response = await api('modulo-uasg/1_consultarUasg', { pagina: '1', codigoUasg: code })
            map.set(code, response.resultado?.[0]?.siglaUf || '')
          }))
        }
        result = result.map((i: Item) => ({ ...i, siglaUf: map.get(String(i.codigoUnidadeGerenciadora)) })).filter((i: Item) => i.siglaUf === values.uf)
      }
      if (current !== requestId.current) return
      setPagina(page); setPaginas(data.totalPaginas || 1)
      const term = values.objeto.trim().toLocaleLowerCase('pt-BR'); if (term) result = result.filter((i: Item) => [i.objeto, i.descricaoItem, i.descricaoDetalhada].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term)); setItems(result)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao buscar itens.') } finally { setLoading(false) }
  }
  const visibleHome = useMemo(() => { const q = homeQuery.toLocaleLowerCase('pt-BR'); return homeItems.filter(i => !q || String(i.descricaoItem || '').toLocaleLowerCase('pt-BR').includes(q)) }, [homeItems, homeQuery])
  const visibleAdesao = useMemo(() => { const q = homeQuery.toLocaleLowerCase('pt-BR'); return adesaoItems.filter(i => !q || String(i.descricaoItem || '').toLocaleLowerCase('pt-BR').includes(q)) }, [adesaoItems, homeQuery])
  const display = aba === 'adesao' ? (searched ? items : visibleAdesao) : (searched ? items : visibleHome)

  return <main ref={buscaRef} className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10"><div className="mx-auto max-w-7xl space-y-6">
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/60 dark:to-slate-900 sm:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-600 p-2.5 text-white"><FileSearch className="h-6 w-6" /></div><div><p className="text-sm font-medium uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-300">Módulo ARP</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Busca ARP Inteligente</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">Encontre oportunidades de adesão em Atas de Registro de Preços vigentes, com preço, órgão gerenciador e disponibilidade do item.</p></div></div></section>
    <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4"><label className="text-sm font-medium">Objeto<input value={objeto} onChange={e => setObjeto(e.target.value)} placeholder="Ex.: papel para impressão" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" /><span className="mt-1 block text-xs text-slate-500">Filtra pela descrição do item, objeto ou descrição detalhada retornada pela API.</span></label></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">Código da UASG<input value={uasg} onChange={e => setUasg(e.target.value)} placeholder="Ex.: 784700" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" /><span className="mt-1 block text-xs text-slate-500">Unidade gerenciadora da ata</span></label><label className="text-sm font-medium">Código CATMAT<input value={catmat} onChange={e => setCatmat(e.target.value)} placeholder="Ex.: 432572" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" /><span className="mt-1 block text-xs text-slate-500">Código do material</span></label><label className="text-sm font-medium">UF do órgão<select value={uf} onChange={e => setUf(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950"><option value="">Todas as UFs</option>{ufs.map(u => <option key={u}>{u}</option>)}</select><span className="mt-1 block text-xs text-slate-500">Filtra a unidade gerenciadora</span></label></div><div className="mt-5 flex justify-end"><button disabled={loading || (!uasg && !catmat && !objeto)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {loading ? 'Buscando…' : 'Buscar atas'}</button></div></form>
    {history.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-slate-500">Buscas recentes:</span>{history.map((h, i) => <button key={i} onClick={() => { const values = { uasg: h.uasg || '', catmat: h.catmat || '', uf: h.uf || '', objeto: h.objeto || '' }; setUasg(values.uasg); setCatmat(values.catmat); setUf(values.uf); setObjeto(values.objeto); search(undefined, values) }} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{h.objeto ? `Objeto: ${h.objeto}` : h.uasg ? `UASG ${h.uasg}` : `CATMAT ${h.catmat}`}</button>)}<button onClick={() => { setHistory([]); localStorage.removeItem('catmat:arp:historico') }} className="text-xs text-slate-400 hover:text-rose-600">Limpar</button></div>}
    {syncInfo && <p role="status" className="text-sm">{syncInfo} Clique em sincronizar para carregar o próximo lote.</p>}
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800"><button onClick={() => { setAba('adesao'); setSearched(false); void loadAdesao() }} className={`px-4 py-3 text-sm font-medium ${aba === 'adesao' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Oportunidades de adesão</button><button onClick={() => { setAba('atas'); setSearched(false); void loadHome() }} className={`px-4 py-3 text-sm font-medium ${aba === 'atas' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Atas vigentes</button></div>
    {!searched && aba === 'adesao' && <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><PackageSearch className="h-5 w-5 text-indigo-600" />Itens disponíveis para adesão</h2><p className="mt-1 text-sm text-slate-500">Itens com máximo de adesão maior que zero, armazenados localmente.</p></div><div className="flex gap-2"><button onClick={syncAdesao} disabled={adesaoSyncing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${adesaoSyncing ? 'animate-spin' : ''}`} /> {adesaoSyncing ? `Carregando lote ${adesaoSyncPage}…` : `Carregar lote ${adesaoSyncPage}`}</button><button onClick={() => void loadAdesao()} disabled={adesaoLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700"><RefreshCw className={`h-4 w-4 ${adesaoLoading ? 'animate-spin' : ''}`} /> Atualizar</button></div></div>{adesaoSyncInfo && <p role="status" className="mt-3 text-sm">{adesaoSyncInfo} Use “Carregar lote” para trazer a próxima página da API.</p>}<div className="relative mt-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={homeQuery} onChange={e => setHomeQuery(e.target.value)} placeholder="Filtre pela descrição do item…" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></div></section>}
    {!searched && aba === 'atas' && <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><PackageSearch className="h-5 w-5 text-indigo-600" />Atas vigentes</h2><p className="mt-1 text-sm text-slate-500">Atas armazenadas. Abra os detalhes para consultar e atualizar seus itens.</p></div><div className="flex gap-2"><button onClick={syncDatabase} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizando…' : 'Sincronizar API'}</button><button onClick={() => void loadHome()} disabled={homeLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700"><RefreshCw className={`h-4 w-4 ${homeLoading ? 'animate-spin' : ''}`} /> Atualizar</button></div></div><div className="relative mt-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={homeQuery} onChange={e => setHomeQuery(e.target.value)} placeholder="Filtre pela descrição do item…" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></div></section>}
    {searched && <h2 className="text-xl font-semibold">Resultados encontrados ({items.length})</h2>}{(homeLoading || adesaoLoading) && !searched && <p className="text-sm text-slate-500">Consultando {aba === 'adesao' ? 'oportunidades de adesão' : 'atas vigentes'}…</p>}{!loading && !homeLoading && !adesaoLoading && display.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Nenhum resultado encontrado.</div>}
    <div className="grid gap-4 lg:grid-cols-2">{display.map((item, i) => <article key={`${item.numeroControlePncpAta}-${item.numeroItem}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950"><PackageSearch className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.descricaoItem || item.objeto || 'Item sem descrição'}</h3><p className="mt-1 text-xs text-slate-500">Ata {item.numeroAtaRegistroPreco} · {item.numeroItem && item.numeroItem !== '—' ? `Item ${item.numeroItem} · CATMAT ${item.codigoItem || '—'}` : 'Resumo da ata'}</p></div><span className="whitespace-nowrap text-sm font-semibold">{money(item.valorUnitario ?? item.valorTotal)}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400"><span>Órgão: <b>{item.codigoUnidadeGerenciadora}</b></span><span>{item.numeroItem === '—' ? 'Itens na ata' : 'Quantidade homologada'}: <b>{item.quantidadeHomologadaItem ?? item.quantidadeHomologadaVencedor ?? item.quantidadeItens ?? '—'}</b></span>{aba === 'adesao' && <span className="font-semibold text-emerald-700 dark:text-emerald-400">Máximo para adesão: <b>{item.maximoAdesao}</b></span>}<span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Até {dateBR(item.dataVigenciaFinal)}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.siglaUf || 'UF não informada'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSelected(item)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">Ver detalhes</button>{pncp(item) && <a href={pncp(item)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"><ExternalLink className="h-3.5 w-3.5" /> PNCP</a>}</div></article>)}</div>
    <div className="flex items-center justify-between gap-3"><button disabled={loading || homeLoading || adesaoLoading || pagina <= 1} onClick={() => searched ? void search(undefined, applied, pagina - 1) : aba === 'adesao' ? void loadAdesao(pagina - 1) : void loadHome(pagina - 1)}>Anterior</button><span>Página {pagina} de {paginas}</span><button disabled={loading || homeLoading || adesaoLoading || pagina >= paginas} onClick={() => searched ? void search(undefined, applied, pagina + 1) : aba === 'adesao' ? void loadAdesao(pagina + 1) : void loadHome(pagina + 1)}>Próxima</button></div>
    {searched && <p className="text-xs text-slate-500">Objeto e UF refinam os registros desta página. Use Próxima para consultar mais resultados.</p>}
    {display.length > 0 && <button type="button" onClick={() => buscaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="fixed bottom-5 right-5 z-20 inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" aria-label="Voltar para a pesquisa"><ArrowUp className="h-4 w-4" />Voltar para pesquisa</button>}
    {selected && <ArpDetailsV2 item={selected} onClose={() => setSelected(null)} />}
  </div></main>
}


function ArpDetailsV2({ item, onClose }: { item: Item; onClose: () => void }) {
  const resumo = item.numeroItem === '—'
  const [itens, setItens] = useState<Item[]>(resumo ? [] : [item])
  const [loadingItens, setLoadingItens] = useState(resumo)
  const [errorItens, setErrorItens] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(resumo ? null : item)
  const dialog = useRef<HTMLDialogElement>(null)
  const pointerStartedOutside = useRef(false)

  function isOutsideDialog(event: React.MouseEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    dialog.current?.showModal()
    return () => { previous?.focus() }
  }, [])
  useEffect(() => {
    if (!resumo) return
    const controller = new AbortController()
    setLoadingItens(true)
    setErrorItens('')
    fetch('/api/arp/itens', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ata: item.numeroControlePncpAta }), signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.erro || 'Falha ao consultar itens.'); return data })
      .then(data => setItens(data.resultado.map((i: Item) => ({
        ...data.ata, ...i, valorTotalAta: data.ata.valorTotal,
        linkAtaPncp: data.ata.linkAtaPncp,
      }))))
      .catch(e => { if (!controller.signal.aborted) setErrorItens(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoadingItens(false) })
    return () => controller.abort()
  }, [item, resumo])

  return <dialog ref={dialog} onCancel={onClose}
    onPointerDown={event => { pointerStartedOutside.current = isOutsideDialog(event) }}
    onPointerCancel={() => { pointerStartedOutside.current = false }}
    onClick={event => {
      if (pointerStartedOutside.current && isOutsideDialog(event)) onClose()
      pointerStartedOutside.current = false
    }}
    className="m-auto max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/60 dark:bg-slate-900 dark:text-slate-100">
    <div className="flex justify-between gap-4"><h2 className="text-xl font-semibold">Ata {item.numeroAtaRegistroPreco}</h2><button onClick={onClose} aria-label="Fechar detalhes"><X /></button></div>
    <p className="mt-3">{item.objeto || item.descricaoItem}</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <div><small>Órgão gerenciador</small><p>{item.nomeUnidadeGerenciadora} · UASG {item.codigoUnidadeGerenciadora}</p></div>
      <div><small>Vigência</small><p>{dateBR(item.dataVigenciaInicial)} a {dateBR(item.dataVigenciaFinal)}</p></div>
      <div><small>Valor total da ata</small><p>{money(resumo ? item.valorTotal : item.valorTotalAta)}</p></div>
    </div>
    {pncp(item) && <a href={pncp(item)!} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex gap-2 text-indigo-600 dark:text-indigo-300">Abrir ata no PNCP <ExternalLink className="h-4 w-4" /></a>}
    <h3 className="mt-6 text-lg font-semibold">Itens da ata {loadingItens ? '' : '(' + itens.length + ')'}</h3>
    {loadingItens && <p role="status">Consultando os itens desta ata na API oficial…</p>}
    {errorItens && <p role="alert" className="mt-3 text-rose-600">{errorItens}</p>}
    {!loadingItens && !errorItens && !itens.length && <p>A API não retornou itens para esta ata.</p>}
    {itens.map((i, index) => <div key={i.numeroItem + '-' + index}>
      <button type="button" aria-expanded={selectedItem === i} aria-controls={`arp-item-details-${index}`}
        onClick={() => setSelectedItem(current => current === i ? null : i)}
        className="mt-3 block w-full rounded-xl border border-slate-300 p-4 text-left hover:border-indigo-500 dark:border-slate-700">
      <p className="text-sm text-indigo-600 dark:text-indigo-300">Item {i.numeroItem} · {i.tipoItem || 'Material/serviço'} · Código {i.codigoItem ?? 'Não informado'}</p>
      <p className="mt-1 font-semibold">{i.descricaoItem}</p>
      <p className="mt-2">Valor unitário: {money(i.valorUnitario)} · Quantidade homologada: {i.quantidadeHomologadaItem ?? i.quantidadeHomologadaVencedor ?? 'Não informada'}</p>
      <p>Fornecedor: {i.nomeRazaoSocialFornecedor || 'Não informado'}</p>
      <span className="mt-2 block text-sm text-indigo-600 dark:text-indigo-300">{selectedItem === i ? 'Recolher detalhes e saldos' : 'Ver detalhes e consultar saldos'}</span>
      </button>
      <div id={`arp-item-details-${index}`} hidden={selectedItem !== i}>
        {selectedItem === i && <ItemInformation item={i} />}
      </div>
    </div>)}
  </dialog>
}

function ItemInformation({ item }: { item: Item }) {
  const [saldos, setSaldos] = useState<Item[]>([])
  const [unidades, setUnidades] = useState<Item[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const params = { pagina: '1', tamanhoPagina: '200', numeroAta: String(item.numeroAtaRegistroPreco), unidadeGerenciadora: String(item.codigoUnidadeGerenciadora), numeroItem: String(item.numeroItem) }
    Promise.allSettled([
      api('modulo-arp/4_consultarEmpenhosSaldoItem', params),
      api('modulo-arp/3_consultarUnidadesItem', params),
    ]).then(results => {
      if (!active) return
      const [saldo, unidades] = results
      if (saldo.status === 'fulfilled') setSaldos(saldo.value.resultado || [])
      if (unidades.status === 'fulfilled') setUnidades(unidades.value.resultado || [])
      setErrors(results.flatMap((r, index) => r.status === 'rejected' ? [(index ? 'Adesões: ' : 'Empenhos: ') + r.reason.message] : []))
      setLoading(false)
    })
    return () => { active = false }
  }, [item])
  return <section className="mt-6 rounded-xl border border-indigo-300 p-5">
    <h3 className="text-lg font-semibold">Detalhes do item {item.numeroItem}</h3>
    <p className="mt-2">{item.descricaoDetalhada || item.descricaoItem}</p>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      {Object.entries({
        'Valor unitário': money(item.valorUnitario), 'Valor total do item': money(item.valorTotal),
        'Quantidade homologada': item.quantidadeHomologadaItem, 'Máximo de adesão': item.maximoAdesao,
        'Fornecedor': item.nomeRazaoSocialFornecedor, 'CNPJ/CPF': item.niFornecedor,
        'Classificação': item.classificacaoFornecedor, 'Modalidade': item.nomeModalidadeCompra,
        'Compra': (item.numeroCompra || '—') + '/' + (item.anoCompra || '—'), 'ID da compra': item.idCompra,
      }).map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd>{value ?? 'Não informado'}</dd></div>)}
    </dl>
    <h4 className="mt-5 font-semibold">Saldo de empenho</h4>
    {loading && <p role="status">Consultando saldos…</p>}
    {errors.map(e => <p role="alert" key={e} className="text-rose-600">{e}</p>)}
    {!loading && !errors.some(e => e.startsWith('Empenhos:')) && !saldos.length && <p>Nenhum registro de empenho disponível.</p>}
    {saldos.map((s, i) => <p key={i} className="mt-2">Unidade: {s.nomeUnidade ?? s.codigoUnidade ?? s.unidade ?? s.unidadeParticipante ?? '—'} · Registrada: {s.quantidadeRegistrada ?? '—'} · Empenhada: {s.quantidadeEmpenhada ?? '—'} · Saldo de empenho: {s.saldoEmpenho ?? '—'}</p>)}
    <h4 className="mt-5 font-semibold">Unidades e adesões</h4>
    {!loading && !errors.some(e => e.startsWith('Adesões:')) && !unidades.length && <p>Nenhum registro de adesão disponível.</p>}
    {unidades.map((u, i) => <p key={i} className="mt-2">Unidade: {u.nomeUnidade ?? u.codigoUnidade ?? u.unidadeParticipante ?? u.unidade ?? '—'} · Aceita adesão: {u.aceitaAdesao === true ? 'Sim' : u.aceitaAdesao === false ? 'Não' : 'Não informado'} · Saldo de adesões: {u.saldoAdesoes ?? 'Não informado'}</p>)}
    <p className="mt-3 text-xs text-slate-500">Saldo de empenho e saldo de adesão são informações distintas. Ausência de registros não significa saldo zero.</p>
  </section>
}
