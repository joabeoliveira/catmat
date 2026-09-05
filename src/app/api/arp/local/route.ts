import { NextResponse } from 'next/server'
import { buscarArpLocal } from '@/features/arp/arp.service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  try { return NextResponse.json(await buscarArpLocal({ termo: searchParams.get('q') || '', uasg: searchParams.get('uasg') || undefined, catmat: searchParams.get('catmat') ? Number(searchParams.get('catmat')) : undefined, ataControle: searchParams.get('ata') || undefined, uf: searchParams.get('uf') || undefined, pagina: Number(searchParams.get('pagina') || 1), limite: Math.min(Number(searchParams.get('limite') || 50), 200) })) }
  catch (error) { return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha ao buscar ARPs armazenadas.' }, { status: 503 }) }
}
