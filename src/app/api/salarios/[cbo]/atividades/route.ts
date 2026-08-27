import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request, { params }: { params: { cbo: string } }) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const cbo = Number(params.cbo)
  const service = new SalariosService()

  try {
    const resultado = await service.buscarAtividades(cbo)
    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar as atividades do CBO.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
