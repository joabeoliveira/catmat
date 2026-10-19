import { NextResponse } from 'next/server'
import { getPcaJobSummary } from '@/features/pca/pca.job'
export async function GET(_request: Request, context: { params: { id: string } }) {
  const result = await getPcaJobSummary(context.params.id)
  return result ? NextResponse.json(result) : NextResponse.json({ error: 'Job não encontrado.' }, { status: 404 })
}
