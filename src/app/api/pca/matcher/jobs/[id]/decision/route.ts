import { NextResponse } from 'next/server'
import { decidePcaItems } from '@/features/pca/pca.job'
export async function POST(request: Request, context: { params: { id: string } }) {
  try { return NextResponse.json(await decidePcaItems(context.params.id, await request.json())) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao salvar decisão.' }, { status: 400 }) }
}
