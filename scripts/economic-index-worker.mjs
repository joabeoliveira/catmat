const hour = Number(process.env.INDICES_SYNC_HORA ?? 3)
const interval = 60 * 1000

function nextRun() {
  const now = new Date()
  const run = new Date(now)
  run.setHours(hour, 0, 0, 0)
  if (run <= now) run.setDate(run.getDate() + 1)
  return run
}

async function sync() {
  const baseUrl = process.env.INDICES_SYNC_URL ?? 'http://web:3000/api/indices/sync'
  try {
    const response = await fetch(baseUrl, { method: 'POST' })
    const result = await response.json()
    console.log(`[indices-worker] ${new Date().toISOString()} ${response.ok ? 'sucesso' : 'falha'}`, result)
  } catch (error) {
    console.error('[indices-worker] erro:', error?.message || error)
  }
}

console.log(`Worker de índices ativo. Execução diária às ${String(hour).padStart(2, '0')}:00.`)
async function loop() {
  const wait = Math.max(1000, nextRun().getTime() - Date.now())
  console.log(`[indices-worker] próxima execução: ${nextRun().toISOString()}`)
  await new Promise((resolve) => setTimeout(resolve, wait))
  await sync()
  setTimeout(loop, interval)
}
loop()
