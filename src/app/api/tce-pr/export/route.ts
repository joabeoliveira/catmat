import { NextResponse } from 'next/server'
import { TceprService } from '@/features/tcepr/tcepr.service'
import { gerarPlanilhaTcePr, type DadosExportTcePr } from '@/features/tcepr/tcepr.excel'
import type { OrdenacaoTcePr } from '@/features/tcepr/tcepr.types'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 30)) {
    return tooManyRequests()
  }

  try {
    const body = (await request.json()) as DadosExportTcePr
    const service = new TceprService()
    const resultado = await service.buscar({
      termo: body.termo || '',
      pagina: 1,
      limite: Math.min(500, Math.max(1, body.limite || 200)),
      filtros: {
        cdIbge: body.filtros?.cdIbge || undefined,
        municipio: body.filtros?.municipio || undefined,
        refinar: body.filtros?.refinar || undefined,
        modalidade: body.filtros?.modalidade || undefined,
        anoLicitacao: body.filtros?.anoLicitacao,
        dtHomologacaoInicio: body.filtros?.dtHomologacaoInicio || undefined,
        dtHomologacaoFim: body.filtros?.dtHomologacaoFim || undefined,
        fornecedor: body.filtros?.fornecedor || undefined,
        nrDocumento: body.filtros?.nrDocumento || undefined,
        apenasVencedores: body.filtros?.apenasVencedores,
        valorMin: body.filtros?.valorMin,
        valorMax: body.filtros?.valorMax,
        ordenarPor: body.filtros?.ordenarPor as OrdenacaoTcePr | undefined,
      },
    })

    const buffer = gerarPlanilhaTcePr(body, resultado)
    const nome = `tce-pr-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar a planilha TCE-PR.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
