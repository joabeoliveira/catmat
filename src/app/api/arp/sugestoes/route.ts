import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json([])

  try {
    const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    const termos = q.split(/\s+/).filter(Boolean)
    const rows = await prisma.arpItemAdesao.findMany({
      where: {
        maximoAdesao: { gt: 0 },
        itemExcluido: false,
        dataVigenciaFinal: { gte: hoje },
        AND: termos.map((termo) => ({ descricaoItem: { contains: termo, mode: 'insensitive' as const } })),
      },
      select: { descricaoItem: true },
      distinct: ['descricaoItem'],
      orderBy: { descricaoItem: 'asc' },
      take: 8,
    })
    return NextResponse.json(rows.map((row) => row.descricaoItem).filter(Boolean))
  } catch {
    return NextResponse.json([])
  }
}
