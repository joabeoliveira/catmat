import { NextRequest, NextResponse } from 'next/server'
import { consultarCnpj } from '@/features/cnpj/cnpj.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()
  const cnpj = request.nextUrl.searchParams.get('cnpj') || ''
  const atualizar = request.nextUrl.searchParams.get('atualizar') === 'true'
  try {
    return NextResponse.json(await consultarCnpj(cnpj, atualizar))
  } catch (error) {
    return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha ao consultar o CNPJ.' }, { status: 400 })
  }
}
