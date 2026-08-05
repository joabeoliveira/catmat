import { NextResponse } from 'next/server'
import { CatmatService } from '@/features/catmar/catmat.service'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) ?? {}
  const service = new CatmatService()

  const resultado = await service.buscarItens({
    termo: body.termo,
    filtros: body.filtros,
    pagina: body.pagina,
    limite: body.limite,
  })

  return NextResponse.json(resultado)
}
