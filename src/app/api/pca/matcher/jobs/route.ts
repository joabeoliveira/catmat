import { NextResponse } from 'next/server'
import { createPcaJob } from '@/features/pca/pca.job'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie o arquivo no campo file.' }, { status: 400 })
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: 'Formato inválido. Use XLSX, XLS ou CSV.' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.length || buffer.length > Number(process.env.PCA_MAX_UPLOAD_BYTES || 25 * 1024 * 1024)) return NextResponse.json({ error: 'Arquivo vazio ou acima do limite permitido.' }, { status: 413 })
    return NextResponse.json(await createPcaJob(buffer, file.name, file.type), { status: 201 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao criar job PCA.' }, { status: 400 }) }
}
