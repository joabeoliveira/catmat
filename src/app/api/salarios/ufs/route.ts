import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  try {
    const service = new SalariosService()
    const ufs = await service.listarUfs()
    return NextResponse.json(ufs, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
