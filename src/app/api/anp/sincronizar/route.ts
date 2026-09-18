import { NextResponse } from 'next/server'

import { validarAdminSecret, validarCronSecret } from '@/lib/secrets'
import {
  anpSincronizarSchema,
} from '@/features/anp/anp.schema'
import { sincronizarSemanaAnp } from '@/features/anp/anp.service'
import {
  calcularSemanaAnterior,
  calcularSemanaPorDatas,
} from '@/features/anp/anp.source'

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha ao sincronizar dados da ANP.'
}

function eErroDownload(mensagem: string): boolean {
  return /^(Timeout ao baixar|Falha ao baixar)/i.test(mensagem) || /fetch failed/i.test(mensagem)
}

function respostaErro(error: unknown): NextResponse {
  const mensagem = mensagemErro(error)

  if (/^Abas faltantes no XLSX da ANP:/i.test(mensagem)) {
    const abas = mensagem.replace(/^Abas faltantes no XLSX da ANP:\s*/i, '')
    return NextResponse.json({ error: mensagem, abasFaltantes: abas.split(', ').filter(Boolean) }, { status: 422 })
  }

  if (eErroDownload(mensagem)) {
    return NextResponse.json({ error: mensagem }, { status: 502 })
  }

  return NextResponse.json({ error: mensagem }, { status: 500 })
}

export async function POST(request: Request) {
  const temCronSecret = request.headers.has('x-cron-secret')
  const temAdminSecret = request.headers.has('x-anp-admin-secret')

  if (
    !(temCronSecret && validarCronSecret(request)) &&
    !(temAdminSecret && validarAdminSecret(request))
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const texto = await request.text()
    let body: unknown = {}

    if (texto.trim()) {
      try {
        body = JSON.parse(texto)
      } catch {
        return NextResponse.json(
          { error: 'Corpo JSON inválido.', details: [] },
          { status: 400 },
        )
      }
    }

    const parsed = anpSincronizarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados de sincronização inválidos.', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const periodo = parsed.data.dataInicio && parsed.data.dataFim
      ? calcularSemanaPorDatas(
          new Date(`${parsed.data.dataInicio}T00:00:00.000Z`),
          new Date(`${parsed.data.dataFim}T00:00:00.000Z`),
        )
      : calcularSemanaAnterior()

    const resumo = await sincronizarSemanaAnp(periodo.dataInicio, periodo.dataFim)

    return NextResponse.json({ ok: true, ...resumo })
  } catch (error) {
    return respostaErro(error)
  }
}
