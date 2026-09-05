import { NextRequest, NextResponse } from 'next/server'
import { sincronizarItensAdesao } from '@/features/arp/arp.service'

export async function POST(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await sincronizarItensAdesao({
      pagina: Number(p.get('pagina') || 1),
      dataVigenciaInicialMin: p.get('dataVigenciaInicialMin') || '2026-06-30',
      dataVigenciaInicialMax: p.get('dataVigenciaInicialMax') || '2027-06-29',
    }))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao sincronizar itens de adesão.' }, { status: 502 })
  }
}
