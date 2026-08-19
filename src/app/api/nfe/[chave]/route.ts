import { NextResponse } from 'next/server'
import { consultarNFePorChave } from '@/features/nfe/nfe.service'

export async function GET(
  request: Request,
  { params }: { params: { chave: string } },
) {
  try {
    const { chave } = params
    const dados = await consultarNFePorChave(chave)

    return NextResponse.json(dados)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar NF-e'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
