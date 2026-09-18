import { NextResponse } from 'next/server'

import { anpFiltrosSchema } from '@/features/anp/anp.schema'
import { buscarPrecos } from '@/features/anp/anp.service'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = anpFiltrosSchema.safeParse(Object.fromEntries(params.entries()))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Filtros inválidos.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const resultado = await buscarPrecos(parsed.data)
    const semanaValida = resultado.semana?.status === 'SUCESSO' ? resultado.semana : null

    return NextResponse.json({
      items: semanaValida ? resultado.items : [],
      total: semanaValida ? resultado.total : 0,
      pagina: parsed.data.pagina,
      limite: parsed.data.limite,
      semana: semanaValida
        ? {
            id: semanaValida.id,
            dataInicio: semanaValida.dataInicio,
            dataFim: semanaValida.dataFim,
          }
        : null,
      filtrosAplicados: parsed.data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao consultar preços da ANP.' },
      { status: 500 },
    )
  }
}
