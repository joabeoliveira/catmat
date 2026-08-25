import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function cleanTerm(value: string) {
  return value.trim().slice(0, 80)
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request), 120)) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const q = cleanTerm(searchParams.get('q') || '')

  if (q.length < 2) {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  }

  try {
    const service = new SalariosService()
    const sugestoes = await service.sugestoes(q)
    return NextResponse.json(sugestoes, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  }
}
