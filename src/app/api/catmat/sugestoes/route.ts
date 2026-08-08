import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { catmatMockData } from '@/features/catmar/mock-data'
import { sugestaoSchema } from '@/features/catmar/catmat.schema'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getSugestoesFallback(termo: string) {
  const q = normalizar(termo.trim())
  if (!q) return []

  const candidatos = catmatMockData
    .flatMap((item) => [item.nomePdm, item.descricaoItem, item.nomeClasse, item.nomeGrupo])
    .filter((valor): valor is string => Boolean(valor))
    .filter((valor) => normalizar(valor).includes(q) || normalizar(valor).startsWith(q))

  const sugestoes = [...new Set(candidatos)].slice(0, 8)
  return sugestoes.length ? sugestoes : []
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request), 120)) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const parsed = sugestaoSchema.safeParse({ q: searchParams.get('q') || '' })

  if (!parsed.success) {
    return new NextResponse(JSON.stringify([]), {
      status: 400,
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  }

  const q = (parsed.data.q || '').trim()

  if (q.length < 2) {
    return new NextResponse(JSON.stringify([]), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_INTERNAL) {
      return new NextResponse(JSON.stringify(getSugestoesFallback(q)), {
        headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
      })
    }

    const rows = await prisma.$queryRaw<Array<{ nomePdm: string }>>`
      SELECT "nomePdm"
      FROM "CatmatItem"
      WHERE immutable_unaccent("nomePdm") ILIKE immutable_unaccent(${`${q}%`})
         OR immutable_unaccent("nomePdm") % immutable_unaccent(${q})
      GROUP BY "nomePdm"
      ORDER BY similarity(immutable_unaccent("nomePdm"), immutable_unaccent(${q})) DESC
      LIMIT 8
    `

    // Banco respondeu: resultado vazio é resposta legítima — não cair no mock
    const resultado = rows.map((row) => row.nomePdm)
    return new NextResponse(JSON.stringify(resultado), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  } catch {
    return new NextResponse(JSON.stringify(getSugestoesFallback(q)), {
      headers: { 'Cache-Control': 'public, s-maxage=86400', 'Content-Type': 'application/json' },
    })
  }
}
