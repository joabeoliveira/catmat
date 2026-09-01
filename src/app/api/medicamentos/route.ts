import { NextResponse } from 'next/server'
import { MedicamentosService } from '@/features/medicamentos/medicamentos.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()

  const { searchParams } = new URL(request.url)
  const service = new MedicamentosService()

  try {
    const resultado = await service.buscar(
      searchParams.get('q') || searchParams.get('descricao') || '',
      Number(searchParams.get('pagina') || 1),
      Number(searchParams.get('limite') || 20),
    )
    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar medicamentos.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
