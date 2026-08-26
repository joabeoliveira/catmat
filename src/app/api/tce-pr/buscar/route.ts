import { NextResponse } from 'next/server'
import { TceprService } from '@/features/tcepr/tcepr.service'
import type { OrdenacaoTcePr } from '@/features/tcepr/tcepr.types'
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
  const service = new TceprService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: Number(searchParams.get('pagina') || 1),
      limite: Number(searchParams.get('limite') || 20),
      filtros: {
        cdIbge: searchParams.get('cdIbge') || undefined,
        municipio: searchParams.get('municipio') || undefined,
        refinar: searchParams.get('refinar') || undefined,
        modalidade: searchParams.get('modalidade') || undefined,
        anoLicitacao: numberParam(searchParams.get('anoLicitacao')),
        dtHomologacaoInicio: searchParams.get('dtHomologacaoInicio') || undefined,
        dtHomologacaoFim: searchParams.get('dtHomologacaoFim') || undefined,
        fornecedor: searchParams.get('fornecedor') || undefined,
        nrDocumento: searchParams.get('nrDocumento') || undefined,
        apenasVencedores: boolParam(searchParams.get('apenasVencedores')),
        valorMin: numberParam(searchParams.get('valorMin')),
        valorMax: numberParam(searchParams.get('valorMax')),
        ordenarPor: (searchParams.get('ordenarPor') as OrdenacaoTcePr) || undefined,
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar licitações TCE-PR.'
    const missingTable = message.includes('LicitacaoVencedorTcePr')
    return NextResponse.json(
      {
        erro: missingTable
          ? 'Base TCE-PR ainda não configurada. Execute a preparação/importação da carga inicial.'
          : message,
      },
      { status: missingTable ? 503 : 400 },
    )
  }
}
