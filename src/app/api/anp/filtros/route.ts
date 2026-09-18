import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buscarFiltrosDisponiveis } from '@/features/anp/anp.service'

const anpFiltrosQuerySchema = z
  .object({
    estado: z.string().length(2).regex(/^[A-Z]{2}$/, 'Informe a UF em letras maiúsculas.').optional(),
  })
  .strict()

export async function GET(request: Request) {
  const estado = new URL(request.url).searchParams.get('estado') || undefined
  const parsed = anpFiltrosQuerySchema.safeParse({ estado })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Estado inválido.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const filtros = await buscarFiltrosDisponiveis(parsed.data.estado)

    return NextResponse.json({
      semanas: filtros.semanas,
      produtos: filtros.produtos,
      unidades: filtros.unidades,
      abrangencias: filtros.abrangencias,
      estados: filtros.estados,
      regioes: filtros.regioes,
      municipios: filtros.municipios,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao consultar filtros da ANP.' },
      { status: 500 },
    )
  }
}
