import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()
  try {
    const service = new SalariosService()
    const hierarquia = await service.listarHierarquia()
    return NextResponse.json(hierarquia, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
