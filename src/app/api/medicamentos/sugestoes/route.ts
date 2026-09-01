import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request), 120)) return tooManyRequests()
  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json([])

  try {
    const rows = await prisma.$queryRaw<Array<{ sugestao: string }>>`
      SELECT "principioAtivo" AS sugestao
      FROM "MedicamentoCatmat"
      WHERE immutable_unaccent("principioAtivo") ILIKE immutable_unaccent(${`${q}%`})
         OR immutable_unaccent("principioAtivo") % immutable_unaccent(${q})
      GROUP BY "principioAtivo"
      ORDER BY similarity(immutable_unaccent("principioAtivo"), immutable_unaccent(${q})) DESC
      LIMIT 8
    `
    return NextResponse.json(rows.map((row) => row.sugestao), { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
  } catch {
    return NextResponse.json([])
  }
}
