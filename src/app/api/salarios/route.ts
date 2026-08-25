import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { ANOS_SALARIOS, type AnoSalario } from '@/features/salarios/salarios.types'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function boolParam(value: string | null) {
  if (value === null) return false
  return value === 'true' || value === '1'
}

function anoParam(value: string | null): AnoSalario | undefined {
  const ano = numberParam(value)
  if (ano === undefined) return undefined
  return ANOS_SALARIOS.includes(ano as AnoSalario) ? (ano as AnoSalario) : undefined
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const service = new SalariosService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: numberParam(searchParams.get('pagina')) ?? 1,
      limite: numberParam(searchParams.get('limite')) ?? 20,
      filtros: {
        uf: searchParams.get('uf')?.toUpperCase() || undefined,
        ano: anoParam(searchParams.get('ano')) ?? 2026,
        aplicarInpc: boolParam(searchParams.get('aplicarInpc')),
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar salários.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
