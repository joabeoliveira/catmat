import { NextResponse } from 'next/server'
import { sincronizarArps } from '@/features/arp/arp.service'

export async function POST(request: Request) {
  try {
    const pagina = Number(new URL(request.url).searchParams.get('pagina') || 1)
    if (!Number.isInteger(pagina) || pagina < 1) return NextResponse.json({ erro: 'Página inválida.' }, { status: 400 })
    return NextResponse.json(await sincronizarArps({ pagina }))
  }
  catch (error) { return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha na sincronização de ARPs.' }, { status: 502 }) }
}
