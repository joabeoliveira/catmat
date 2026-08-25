import { NextResponse } from 'next/server'
import { SalariosService } from '@/features/salarios/salarios.service'
import {
  ANOS_SALARIOS,
  type AnoSalario,
  type OrdenacaoSalarios,
  type ReferenciaSalarial,
} from '@/features/salarios/salarios.types'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

function numberParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function boolParam(value: string | null) {
  if (value === null) return false
  return value === 'true' || value === '1'
}

function anoParam(value: string | null): AnoSalario | undefined {
  const ano = numberParam(value)
  if (ano === undefined) return undefined
  return ANOS_SALARIOS.includes(ano as AnoSalario) ? (ano as AnoSalario) : undefined
}

function textParam(value: string | null, max = 160) {
  const texto = value?.trim().slice(0, max)
  return texto || undefined
}

function referenciaParam(value: string | null): ReferenciaSalarial {
  return value === 'media' || value === 'p25' || value === 'p75' ? value : 'mediana'
}

function ordenacaoParam(value: string | null): OrdenacaoSalarios {
  const validas: OrdenacaoSalarios[] = ['relevancia', 'salario_asc', 'salario_desc', 'ufs_desc', 'amplitude_asc', 'titulo']
  return validas.includes(value as OrdenacaoSalarios) ? value as OrdenacaoSalarios : 'relevancia'
}

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) {
    return tooManyRequests()
  }

  const { searchParams } = new URL(request.url)
  const service = new SalariosService()

  try {
    const resultado = await service.buscar({
      termo: searchParams.get('q') || '',
      pagina: numberParam(searchParams.get('pagina')) ?? 1,
      limite: numberParam(searchParams.get('limite')) ?? 20,
      filtros: {
        uf: searchParams.get('uf')?.toUpperCase() || undefined,
        ano: anoParam(searchParams.get('ano')) ?? 2026,
        aplicarInpc: boolParam(searchParams.get('aplicarInpc')),
        grandeGrupo: textParam(searchParams.get('grandeGrupo'), 240),
        subgrupoPrincipal: textParam(searchParams.get('subgrupoPrincipal'), 240),
        familia: textParam(searchParams.get('familia'), 240),
        palavrasObrigatorias: textParam(searchParams.get('incluir')),
        palavrasExcluidas: textParam(searchParams.get('excluir')),
        salarioMinimo: numberParam(searchParams.get('salarioMinimo')),
        salarioMaximo: numberParam(searchParams.get('salarioMaximo')),
        minimoUfs: numberParam(searchParams.get('minimoUfs')),
        referenciaSalarial: referenciaParam(searchParams.get('referencia')),
        ordenarPor: ordenacaoParam(searchParams.get('ordenar')),
      },
    })

    return NextResponse.json(resultado)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao buscar salários.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
