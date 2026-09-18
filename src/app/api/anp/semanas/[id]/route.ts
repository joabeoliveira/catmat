import { NextResponse } from 'next/server'

import { anpSemanaIdSchema } from '@/features/anp/anp.schema'
import {
  buscarResumoNacional,
  buscarSemanaPorId,
} from '@/features/anp/anp.service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const parsed = anpSemanaIdSchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Identificador de semana inválido.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const semana = await buscarSemanaPorId(parsed.data.id)

    if (!semana) {
      return NextResponse.json({ error: 'semana não encontrada' }, { status: 404 })
    }

    const resumo = await buscarResumoNacional(semana.id)

    return NextResponse.json({
      semana: {
        id: semana.id,
        ano: semana.ano,
        dataInicio: semana.dataInicio,
        dataFim: semana.dataFim,
        status: semana.status,
        objectKey: semana.objectKey,
        hashSha256: semana.hashSha256,
        tamanhoBytes: semana.tamanhoBytes,
        baixadoEm: semana.baixadoEm,
        processadoEm: semana.processadoEm,
        erro: semana.erro,
      },
      resumo,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao consultar semana da ANP.' },
      { status: 500 },
    )
  }
}
