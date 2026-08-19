import { NextResponse } from 'next/server'
import { CatserService } from '@/features/catser/catser.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function boolParam(value: string | null) {
  if (value === null) return undefined
  return value === 'true' || value === '1'
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const service = new CatserService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: Number(searchParams.get('pagina') || 1),
      limite: Number(searchParams.get('limite') || 20),
      filtros: {
        codigoGrupo: numberParam(searchParams.get('codigoGrupo')),
        codigoClasse: searchParams.get('codigoClasse') || undefined,
        statusServico: boolParam(searchParams.get('statusServico')),
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar serviços.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
