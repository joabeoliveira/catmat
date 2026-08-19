import { NextResponse } from 'next/server'
import { BpsReferenciaService } from '@/features/bps/bps-referencia.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const service = new BpsReferenciaService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: Number(searchParams.get('pagina') || 1),
      limite: Number(searchParams.get('limite') || 20),
      filtros: {
        uf: searchParams.get('uf') || undefined,
        municipio: searchParams.get('municipio') || undefined,
        codigoCatmat: searchParams.get('codigoCatmat') || undefined,
        modalidade: searchParams.get('modalidade') || undefined,
        fabricante: searchParams.get('fabricante') || undefined,
        fornecedor: searchParams.get('fornecedor') || undefined,
        comprador: searchParams.get('comprador') || undefined,
        dataInicio: searchParams.get('dataInicio') || undefined,
        dataFim: searchParams.get('dataFim') || undefined,
        valorMin: numberParam(searchParams.get('valorMin')),
        valorMax: numberParam(searchParams.get('valorMax')),
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar referências BPS.'
    const missingTable = message.includes('bps_itens_referencia')
    return NextResponse.json(
      {
        erro: missingTable
          ? 'Base BPS ainda não configurada. Execute a preparação/importação da carga inicial.'
          : message,
      },
      { status: missingTable ? 503 : 400 },
    )
  }
}
