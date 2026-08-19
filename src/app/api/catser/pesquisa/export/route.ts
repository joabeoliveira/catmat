import { NextResponse } from 'next/server'
import { gerarPlanilhaPesquisaPrecos } from '@/features/pesquisa/pesquisa-precos.excel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const buffer = gerarPlanilhaPesquisaPrecos(body)
    const nome = `pesquisa-precos-catser-${new Date().toISOString().slice(0, 10)}.xlsx`

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
