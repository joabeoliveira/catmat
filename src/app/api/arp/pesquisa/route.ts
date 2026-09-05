import { NextResponse } from 'next/server'
import { consultar } from '@/features/arp/arp.service'
import { allowRequest, clientIp, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!allowRequest(clientIp(request))) return tooManyRequests()
  const q = new URL(request.url).searchParams
  const uasg = q.get('uasg') || ''
  const catmat = q.get('catmat') || ''
  if ((!uasg && !catmat) || (uasg && !/^\d+$/.test(uasg)) || (catmat && !/^\d+$/.test(catmat))) return NextResponse.json({ erro: 'Informe UASG ou CATMAT numérico.' }, { status: 400 })
  const pagina = Number(q.get('pagina') || 1)
  if (!Number.isInteger(pagina) || pagina < 1) return NextResponse.json({ erro: 'Página inválida.' }, { status: 400 })
  const hoje = new Date().toISOString().slice(0, 10)
  const inicio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  try {
    const result = await consultar('modulo-arp/2_consultarARPItem', {
      pagina: String(pagina), tamanhoPagina: '200', dataVigenciaInicialMin: inicio, dataVigenciaInicialMax: hoje,
      ...(uasg ? { codigoUnidadeGerenciadora: uasg } : {}), ...(catmat ? { codigoItem: catmat } : {}),
    })
    return NextResponse.json({ ...result, resultado: (result.resultado || []).filter(i => !i.itemExcluido && Number(i.maximoAdesao || 0) > 0 && String(i.dataVigenciaInicial).slice(0, 10) <= hoje && String(i.dataVigenciaFinal).slice(0, 10) >= hoje) })
  } catch (error) {
    return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha na consulta.' }, { status: 502 })
  }
}
