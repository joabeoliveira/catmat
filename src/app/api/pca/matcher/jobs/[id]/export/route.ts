import { NextResponse } from 'next/server'
import { exportPcaJob } from '@/features/pca/pca.job'
export async function GET(_request: Request, context: { params: { id: string } }) {
  try { const buffer = await exportPcaJob(context.params.id); return new NextResponse(new Uint8Array(buffer), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': `attachment; filename="pca-matcher-${context.params.id}.xlsx"` } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao exportar job.' }, { status: 400 }) }
}
