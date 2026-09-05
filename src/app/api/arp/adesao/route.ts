import { NextRequest, NextResponse } from 'next/server'
import { buscarItensAdesaoLocal } from '@/features/arp/arp.service'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    const catmat = p.get('catmat') ? Number(p.get('catmat')) : undefined
    return NextResponse.json(await buscarItensAdesaoLocal({
      termo: p.get('q') || '', uasg: p.get('uasg') || undefined, catmat,
      pagina: Number(p.get('pagina') || 1), limite: Number(p.get('limite') || 50),
    }))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao consultar itens de adesão.' }, { status: 400 })
  }
}
