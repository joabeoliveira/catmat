import { NextResponse } from 'next/server'
import { CatmatService } from '@/features/catmar/catmat.service'
import { buscaParamsSchema } from '@/features/catmar/catmat.schema'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const body = {
    termo: searchParams.get('q') || '',
    pagina: Number(searchParams.get('pagina') || 1),
    limite: Number(searchParams.get('limite') || 20),
    filtros: {
      codigoGrupo: searchParams.getAll('grupo').map((value) => Number(value)).filter(Boolean),
      codigoClasse: searchParams.getAll('classe').map((value) => Number(value)).filter(Boolean),
      codigoPdm: searchParams.getAll('pdm').map((value) => Number(value)).filter(Boolean),
      aplicaMargemPreferencia: searchParams.get('aplicaMargemPreferencia') ? searchParams.get('aplicaMargemPreferencia') === 'true' : undefined,
    },
  }

  const parsed = buscaParamsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Parâmetros inválidos', detalhes: parsed.error.issues.map((issue) => issue.message) }, { status: 400 })
  }

  const service = new CatmatService()
  const startedAt = Date.now()
  const resultado = await service.buscarItens(parsed.data)
  console.log(JSON.stringify({ termo: parsed.data.termo, total: resultado.total, duracaoMs: Date.now() - startedAt }))
  return NextResponse.json(resultado, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
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
  const startedAt = Date.now()
  const resultado = await service.buscarItens(parsed.data)
  console.log(JSON.stringify({ termo: parsed.data.termo, total: resultado.total, duracaoMs: Date.now() - startedAt }))

  return NextResponse.json(resultado)
}
