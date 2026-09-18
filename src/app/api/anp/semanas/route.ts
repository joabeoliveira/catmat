import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buscarSemanas } from '@/features/anp/anp.service'

const anpSemanasQuerySchema = z
  .object({
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict()

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = anpSemanasQuerySchema.safeParse(Object.fromEntries(params.entries()))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros de paginação inválidos.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const resultado = await buscarSemanas(parsed.data)

    return NextResponse.json({
      items: resultado.items.map((semana) => ({
        id: semana.id,
        ano: semana.ano,
        dataInicio: semana.dataInicio,
        dataFim: semana.dataFim,
        status: semana.status,
        tamanhoBytes: semana.tamanhoBytes,
        baixadoEm: semana.baixadoEm,
        processadoEm: semana.processadoEm,
        hashSha256: semana.hashSha256,
        erro: semana.erro,
        totalPrecos: semana._count.precos,
      })),
      total: resultado.total,
      pagina: parsed.data.pagina,
      limite: parsed.data.limite,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao consultar semanas da ANP.' },
      { status: 500 },
    )
  }
}
