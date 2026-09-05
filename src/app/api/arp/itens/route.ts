import { NextResponse } from 'next/server'
import { carregarItensAta } from '@/features/arp/arp.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()
  try {
    const body = await request.json()
    return NextResponse.json(await carregarItensAta(String(body.ata || '')))
  } catch (error) {
    return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha ao carregar itens.' }, { status: 502 })
  }
}
