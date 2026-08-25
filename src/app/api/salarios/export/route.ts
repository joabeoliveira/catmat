import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { gerarPlanilhaSalarios, type DadosExportSalarios } from '@/features/salarios/salarios.excel'
import { ANOS_SALARIOS, type AnoSalario, type SalarioBuscaResponse } from '@/features/salarios/salarios.types'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 30)) {
    return tooManyRequests()
  }

  try {
    const body = (await request.json()) as DadosExportSalarios
    const ano: AnoSalario = ANOS_SALARIOS.includes(body.ano as AnoSalario) ? (body.ano as AnoSalario) : 2026

    let resultado: SalarioBuscaResponse
    if (Array.isArray(body.grade) && body.grade.length) {
      resultado = {
        items: body.grade.slice(0, Math.min(500, Math.max(1, body.limite || 200))),
        total: body.grade.length,
        pagina: 1,
        totalPaginas: 1,
        ano,
        aplicarInpc: Boolean(body.aplicarInpc),
        fatorInpc: body.aplicarInpc && typeof body.fatorInpc === 'number' ? body.fatorInpc : 1,
      }
    } else {
      const service = new SalariosService()
      resultado = await service.buscar({
        termo: body.termo || '',
        pagina: 1,
        limite: Math.min(500, Math.max(1, body.limite || 200)),
        filtros: {
          uf: body.uf || undefined,
          ano,
          aplicarInpc: Boolean(body.aplicarInpc),
          grandeGrupo: body.grandeGrupo,
          subgrupoPrincipal: body.subgrupoPrincipal,
          familia: body.familia,
          palavrasObrigatorias: body.palavrasObrigatorias,
          palavrasExcluidas: body.palavrasExcluidas,
          salarioMinimo: body.salarioMinimo,
          salarioMaximo: body.salarioMaximo,
          minimoUfs: body.minimoUfs,
          referenciaSalarial: body.referenciaSalarial,
          ordenarPor: body.ordenarPor,
        },
      })
    }

    const buffer = gerarPlanilhaSalarios({ ...body, ano }, resultado)
    const nome = `salarios-cbo-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar a planilha.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
