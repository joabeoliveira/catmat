import { NextResponse } from 'next/server'
import { syncEconomicIndexes } from '@/lib/economic-indexes'

export const dynamic = 'force-dynamic'

export async function POST() {
  try { return NextResponse.json({ success: true, ...(await syncEconomicIndexes()), timestamp: new Date().toISOString() }) }
  catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Falha ao sincronizar índices.' }, { status: 502 }) }
}
