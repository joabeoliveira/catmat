import { NextResponse } from 'next/server'
import { NfeReferenciaService } from '@/features/nfe/nfe-referencia.service'
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
  const service = new NfeReferenciaService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: Number(searchParams.get('pagina') || 1),
      limite: Number(searchParams.get('limite') || 20),
      filtros: {
        ufEmitente: searchParams.get('ufEmitente') || undefined,
        municipioEmitente: searchParams.get('municipioEmitente') || undefined,
        ufDestinatario: searchParams.get('ufDestinatario') || undefined,
        ncm: searchParams.get('ncm') || undefined,
        cfop: searchParams.get('cfop') || undefined,
        fornecedor: searchParams.get('fornecedor') || undefined,
        destinatario: searchParams.get('destinatario') || undefined,
        dataInicio: searchParams.get('dataInicio') || undefined,
        dataFim: searchParams.get('dataFim') || undefined,
        valorMin: numberParam(searchParams.get('valorMin')),
        valorMax: numberParam(searchParams.get('valorMax')),
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar referências de NF-e.'
    const missingTable = message.includes('nfe_itens_referencia')
    return NextResponse.json(
      {
        erro: missingTable
          ? 'Base de NF-e ainda não configurada. Execute a preparação/importação da carga inicial.'
          : message,
      },
      { status: missingTable ? 503 : 400 },
    )
  }
}
