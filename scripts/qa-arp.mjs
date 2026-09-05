import assert from 'node:assert/strict'

// Teste integrado local: grava/atualiza somente os itens da ata de referência.
const base = process.env.QA_BASE_URL || 'http://localhost:3001'
const controle = '00394452000103-1-010104/2024-000023'
async function request(path, options) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(120000) })
  const data = await response.json()
  assert.equal(response.ok, true, data.erro || `HTTP ${response.status}`)
  return data
}
const body = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ata: controle }) }
const first = await request('/api/arp/itens', body)
const second = await request('/api/arp/itens', body)
assert.equal(first.resultado[0].numeroControlePncpAta, controle)
assert.equal(first.resultado[0].valorUnitario, 5.69)
assert.equal(first.resultado[0].quantidadeHomologadaItem, 30000)
assert.equal(first.totalRegistros, second.totalRegistros)
assert.equal(new URL(first.ata.linkAtaPncp).hostname, 'pncp.gov.br')
const query = new URLSearchParams({ numeroAta: '00159/2024', unidadeGerenciadora: '160249', numeroItem: '00005' })
const units = await request('/api/arp?endpoint=modulo-arp/3_consultarUnidadesItem&' + query)
assert.ok(Array.isArray(units.resultado))
const balance = await request('/api/arp?endpoint=modulo-arp/4_consultarEmpenhosSaldoItem&' + query)
assert.ok(Array.isArray(balance.resultado))
const search = await request('/api/arp/pesquisa?catmat=446704')
assert.ok(search.resultado.length > 0)
assert.ok(search.resultado.every(i => i.codigoItem === 446704))
const invalid = await fetch(base + '/api/arp/local?pagina=0')
assert.ok(!invalid.ok)
console.log(JSON.stringify({ ok: true, itensAta: first.totalRegistros, buscaCatmat: search.resultado.length, registrosSaldo: balance.resultado.length, unidades: units.resultado.length }))
