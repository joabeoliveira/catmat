import { NextResponse } from 'next/server'
import { listPcaItems } from '@/features/pca/pca.job'
export async function GET(request: Request, context: { params: { id: string } }) {
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Number(params.get('page') || 1)); const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25)))
  return NextResponse.json(await listPcaItems(context.params.id, page, limit, params.get('status') || undefined))
}
