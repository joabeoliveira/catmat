import { NextResponse } from 'next/server'
import { consultar } from '@/features/arp/arp.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

const BASE_URL = 'https://dadosabertos.compras.gov.br'
const ENDPOINTS = new Set([
  'modulo-arp/1.2_consultarARP_FimVigencia',
  'modulo-arp/2_consultarARPItem',
  'modulo-arp/3_consultarUnidadesItem',
  'modulo-arp/4_consultarEmpenhosSaldoItem',
  'modulo-arp/5_consultarAdesoesItem',
  'modulo-uasg/1_consultarUasg',
])

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || ''
  if (!ENDPOINTS.has(endpoint)) return NextResponse.json({ erro: 'Endpoint ARP inválido.' }, { status: 400 })

  const query = new URLSearchParams(searchParams)
  query.delete('endpoint')
  try {
    return NextResponse.json(await consultar(endpoint, Object.fromEntries(query)))
  } catch {
    return NextResponse.json({ erro: 'Não foi possível consultar a API de ARPs.' }, { status: 502 })
  }
}
