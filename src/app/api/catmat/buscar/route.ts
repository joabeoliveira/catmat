import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CatmatService } from '@/features/catmar/catmat.service'
import { buscaParamsSchema } from '@/features/catmar/catmat.schema'

const rateLimit = new Map<string, number[]>()

function allowRequest(ip: string) {
  const now = Date.now()
  const windowStart = now - 60_000
  const entries = (rateLimit.get(ip) || []).filter((timestamp) => timestamp > windowStart)
  entries.push(now)
  rateLimit.set(ip, entries)
  return entries.length <= 60
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ip = request.headers.get('x-forwarded-for') || 'local'
  if (!allowRequest(ip)) {
    return NextResponse.json({ erro: 'Muitas requisições em pouco tempo.' }, { status: 429, headers: { 'Cache-Control': 'public, s-maxage=60' } })
  }

  const body = {
    termo: searchParams.get('q') || '',
    pagina: Number(searchParams.get('pagina') || 1),
    limite: Number(searchParams.get('limite') || 20),
    filtros: {
      codigoGrupo: searchParams.getAll('grupo').map((value) => Number(value)).filter(Boolean),
      codigoClasse: searchParams.getAll('classe').map((value) => Number(value)).filter(Boolean),
    },
  }

  const parsed = buscaParamsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Parâmetros inválidos', detalhes: parsed.error.issues.map((issue) => issue.message) }, { status: 400 })
  }

  const service = new CatmatService()
  const resultado = await service.buscarItens(parsed.data)
  return NextResponse.json(resultado, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'local'
  if (!allowRequest(ip)) {
    return NextResponse.json({ erro: 'Muitas requisições em pouco tempo.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) ?? {}
  const parsed = buscaParamsSchema.safeParse({
    termo: body.termo || '',
    filtros: body.filtros,
    pagina: body.pagina,
    limite: body.limite,
  })

  if (!parsed.success) {
    return NextResponse.json({ erro: 'Parâmetros inválidos', detalhes: parsed.error.issues.map((issue) => issue.message) }, { status: 400 })
  }

  const service = new CatmatService()
  const resultado = await service.buscarItens(parsed.data)

  return NextResponse.json(resultado)
}
