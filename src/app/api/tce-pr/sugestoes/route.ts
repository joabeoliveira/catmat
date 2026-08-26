import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
    const rows = await prisma.$queryRawUnsafe<Array<{ sugestao: string }>>(
      `
        SELECT "dsItem" AS sugestao
        FROM "LicitacaoVencedorTcePr"
        WHERE "dsItem" ILIKE $1 ESCAPE '\\'
           OR similarity(immutable_unaccent(lower("dsItem")), immutable_unaccent(lower($2))) > 0.12
        GROUP BY "dsItem"
        ORDER BY
          CASE WHEN "dsItem" ILIKE $1 ESCAPE '\\' THEN 0 ELSE 1 END,
          similarity(immutable_unaccent(lower("dsItem")), immutable_unaccent(lower($2))) DESC,
          count(*) DESC
        LIMIT 8
      `,
      `${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`,
      q,
    )

    return NextResponse.json(rows.map((row) => row.sugestao), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  }
}
