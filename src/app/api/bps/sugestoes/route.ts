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
        SELECT descricao_catmat AS sugestao
        FROM bps_itens_referencia
        WHERE descricao_catmat ILIKE $1 ESCAPE '\\'
           OR similarity(descricao_catmat, $2) > 0.12
        GROUP BY descricao_catmat
        ORDER BY
          CASE WHEN descricao_catmat ILIKE $1 ESCAPE '\\' THEN 0 ELSE 1 END,
          similarity(descricao_catmat, $2) DESC,
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
