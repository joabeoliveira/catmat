import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 2) {
    return new NextResponse(JSON.stringify([]), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ nomePdm: string }>>`
      SELECT DISTINCT "nomePdm"
      FROM "CatmatItem"
      WHERE immutable_unaccent("nomePdm") ILIKE immutable_unaccent(${`${q}%`})
         OR immutable_unaccent("nomePdm") % immutable_unaccent(${q})
      ORDER BY similarity(immutable_unaccent("nomePdm"), immutable_unaccent(${q})) DESC
      LIMIT 8
    `

    return new NextResponse(JSON.stringify(rows.map((row) => row.nomePdm)), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  } catch {
    return new NextResponse(JSON.stringify([]), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  }
}
