import { prisma } from '@/lib/db'

const SIDRA = 'https://apisidra.ibge.gov.br/values'
const BCB = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'

type Point = { name: string; seriesCode: string; date: Date; value: number }

async function sidra(table: string, variable: string, name: string): Promise<Point[]> {
  const response = await fetch(`${SIDRA}/t/${table}/n1/all/v/${variable}/p/last%20120/f/c`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`IBGE SIDRA ${response.status}`)
  const data = await response.json() as Array<Record<string, string>>
  return data.slice(1).map((item) => ({ name, seriesCode: `SIDRA-${table}-${variable}`, date: new Date(Number(item.D3C.slice(0, 4)), Number(item.D3C.slice(4, 6)) - 1, 1), value: Number(item.V) })).filter((item) => Number.isFinite(item.value))
}

async function igpm(): Promise<Point[]> {
  const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 120)
  const fmt = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
  const response = await fetch(`${BCB}.189/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`BCB ${response.status}`)
  const data = await response.json() as Array<{ data: string; valor: string }>
  return data.map((item) => { const [day, month, year] = item.data.split('/').map(Number); return { name: 'IGPM', seriesCode: 'BCB-189', date: new Date(year, month - 1, 1), value: Number(item.valor) } }).filter((item) => Number.isFinite(item.value))
}

export async function syncEconomicIndexes() {
  const batches = await Promise.allSettled([sidra('1737', '2266', 'IPCA'), sidra('1736', '2289', 'INPC'), igpm()])
  const errors = batches.filter((item): item is PromiseRejectedResult => item.status === 'rejected').map((item) => String(item.reason?.message || item.reason))
  const points = batches.filter((item): item is PromiseFulfilledResult<Point[]> => item.status === 'fulfilled').flatMap((item) => item.value)
  for (const point of points) await prisma.economicIndex.upsert({ where: { name_date: { name: point.name, date: point.date } }, update: { value: point.value, seriesCode: point.seriesCode }, create: point })
  return { synced: points.length, errors }
}

export async function findIndex(name: string, targetDate: Date) {
  const month = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1)
  if (name.toUpperCase() !== 'IGPM') return prisma.economicIndex.findFirst({ where: { name: name.toUpperCase(), date: { lte: month } }, orderBy: { date: 'desc' } })
  const points = await prisma.economicIndex.findMany({ where: { name: 'IGPM', date: { lte: month } }, orderBy: { date: 'asc' } })
  if (!points.length) return null
  let accumulated = 1
  for (const point of points) accumulated *= 1 + (point.value / 100)
  return { ...points[points.length - 1], value: accumulated * 100 }
}
