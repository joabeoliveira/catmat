import { NextResponse } from 'next/server'
import { pcaChunkRequestSchema } from '@/features/pca/pca.schema'
import { processPcaChunk } from '@/features/pca/pca.matcher'

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const payload = await request.json().catch(() => ({}))
    const input = pcaChunkRequestSchema.parse(payload)
    const result = await processPcaChunk(context.params.id, input.offset, input.limit)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao processar chunk do job PCA.'
    const status = message.includes('não encontrado') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
