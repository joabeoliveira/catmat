import { NextResponse } from 'next/server'
import { CatserService } from '@/features/catser/catser.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(
  request: Request,
  { params }: { params: { codigoServico: string } },
) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const codigoServico = Number(params.codigoServico)
  if (!Number.isInteger(codigoServico) || codigoServico <= 0) {
    return NextResponse.json({ error: 'Código do serviço inválido.' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const service = new CatserService()

  try {
    const resultado = await service.consultarPrecos(codigoServico, {
      pagina: Number(searchParams.get('pagina') || 1),
      tamanhoPagina: Number(searchParams.get('tamanhoPagina') || 10),
      uf: searchParams.get('uf') || undefined,
      codigoUasg: searchParams.get('codigoUasg') || undefined,
      codigoMunicipio: numberParam(searchParams.get('codigoMunicipio')),
      poder: searchParams.get('poder') || undefined,
      esfera: searchParams.get('esfera') || undefined,
      dataCompraInicio: searchParams.get('dataCompraInicio') || undefined,
      dataCompraFim: searchParams.get('dataCompraFim') || undefined,
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar os preços do serviço.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
