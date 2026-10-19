import { NextResponse } from 'next/server'
import { resetPcaJob } from '@/features/pca/pca.job'

export async function POST(_request: Request, context: { params: { id: string } }) {
  try { return NextResponse.json(await resetPcaJob(context.params.id)) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao reiniciar job.' }, { status: 400 }) }
}
