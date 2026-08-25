import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { ANOS_SALARIOS, type AnoSalario } from '@/features/salarios/salarios.types'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function boolParam(value: string | null) {
  if (value === null) return false
  return value === 'true' || value === '1'
}

export async function GET(request: Request, { params }: { params: { cbo: string } }) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const cbo = Number(params.cbo)
  const anoRaw = Number(searchParams.get('ano'))
  const ano: AnoSalario = ANOS_SALARIOS.includes(anoRaw as AnoSalario) ? (anoRaw as AnoSalario) : 2026
  const service = new SalariosService()

  try {
    const resultado = await service.buscarDetalhe(cbo, {
      uf: searchParams.get('uf')?.toUpperCase() || undefined,
      ano,
      aplicarInpc: boolParam(searchParams.get('aplicarInpc')),
    })
    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar o CBO.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
