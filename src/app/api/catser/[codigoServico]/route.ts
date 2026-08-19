import { NextResponse } from 'next/server'
import { CatserService } from '@/features/catser/catser.service'

export async function GET(
  request: Request,
  { params }: { params: { codigoServico: string } },
) {
  const codigoServico = Number(params.codigoServico)

  if (!Number.isInteger(codigoServico) || codigoServico <= 0) {
    return NextResponse.json({ error: 'Código do serviço inválido.' }, { status: 400 })
  }

  try {
    const service = new CatserService()
    const item = await service.buscarPorCodigo(codigoServico)

    if (!item) {
      return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar o serviço.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
