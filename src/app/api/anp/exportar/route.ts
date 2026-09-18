import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

import { anpFiltrosSchema } from '@/features/anp/anp.schema'
import { buscarPrecosParaExportacao } from '@/features/anp/anp.service'
import { montarUrlAnp } from '@/features/anp/anp.source'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const nomes: Record<string, string> = {
  CAPITAIS: 'Capitais',
  MUNICIPIOS: 'Municípios',
  ESTADOS: 'Estados',
  REGIOES: 'Regiões',
  BRASIL: 'Brasil',
  ETANOL_HIDRATADO: 'Etanol hidratado',
  GASOLINA_COMUM: 'Gasolina comum',
  GASOLINA_ADITIVADA: 'Gasolina aditivada',
  OLEO_DIESEL: 'Óleo diesel',
  OLEO_DIESEL_S10: 'Óleo diesel S10',
  GLP: 'GLP',
  GNV: 'GNV',
  LITRO: 'R$/l',
  TREZE_KG: 'R$/13kg',
  METRO_CUBICO: 'R$/m³',
}

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function valorNome(valor: string): string {
  return nomes[valor] || valor
}

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
    const resultado = await buscarPrecosParaExportacao(parsed.data)

    if (!resultado.semana) {
      return NextResponse.json({ error: 'Nenhuma semana ANP disponível para os filtros informados.' }, { status: 404 })
    }

    const filtros = parsed.data
    const linhas = resultado.items.map((item) => ({
      Abrangência: valorNome(item.abrangencia),
      Localidade: item.localidade,
      Estado: item.estado || '',
      Município: item.municipio || '',
      Região: item.regiao || '',
      Produto: valorNome(item.produto),
      Unidade: valorNome(item.unidade),
      'Postos pesquisados': item.postosPesquisados,
      'Preço médio': item.precoMedio,
      'Preço mínimo': item.precoMinimo,
      'Preço máximo': item.precoMaximo,
      'Desvio padrão': item.desvioPadrao,
      'Coeficiente de variação': item.coefVariacao,
    }))

    const urlFonte = montarUrlAnp(resultado.semana.dataInicio, resultado.semana.dataFim)
    const informacoes = [
      { Campo: 'Fonte', Valor: 'Agência Nacional do Petróleo, Gás Natural e Biocombustíveis (ANP)' },
      { Campo: 'URL oficial do arquivo', Valor: urlFonte },
      { Campo: 'Período da pesquisa', Valor: `${formatarData(resultado.semana.dataInicio)} a ${formatarData(resultado.semana.dataFim)}` },
      { Campo: 'Data da importação', Valor: resultado.semana.processadoEm ? resultado.semana.processadoEm.toISOString() : '' },
      { Campo: 'Data da exportação', Valor: new Date().toISOString() },
      { Campo: 'Hash SHA-256 do XLSX original', Valor: resultado.semana.hashSha256 },
      { Campo: 'Object key no armazenamento', Valor: resultado.semana.objectKey },
      { Campo: 'Total de registros exportados', Valor: resultado.total },
      { Campo: 'Abrangência aplicada', Valor: filtros.abrangencia ? valorNome(filtros.abrangencia) : 'Todas' },
      { Campo: 'Produto aplicado', Valor: filtros.produto ? valorNome(filtros.produto) : 'Todos' },
      { Campo: 'Unidade aplicada', Valor: filtros.unidade ? valorNome(filtros.unidade) : 'Todas' },
      { Campo: 'Estado aplicado', Valor: filtros.estado || 'Todos' },
      { Campo: 'Município aplicado', Valor: filtros.municipio || 'Todos' },
      { Campo: 'Região aplicada', Valor: filtros.regiao || 'Todas' },
      { Campo: 'Metodologia', Valor: 'Preços estatísticos agregados divulgados semanalmente pela ANP. Não são registros individuais de postos.' },
      { Campo: 'Identificação da semana', Valor: resultado.semana.id },
    ]

    const workbook = XLSX.utils.book_new()
    const planilhaPrecos = XLSX.utils.json_to_sheet(linhas)
    const planilhaFonte = XLSX.utils.json_to_sheet(informacoes)
    planilhaPrecos['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 8 }, { wch: 28 }, { wch: 18 },
      { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 22 },
    ]
    planilhaFonte['!cols'] = [{ wch: 34 }, { wch: 110 }]
    XLSX.utils.book_append_sheet(workbook, planilhaPrecos, 'Preços ANP')
    XLSX.utils.book_append_sheet(workbook, planilhaFonte, 'Fonte e metodologia')

    const arquivo = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const nomeArquivo = `precos-anp-${resultado.semana.dataInicio.toISOString().slice(0, 10)}-${resultado.semana.dataFim.toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(arquivo, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao gerar exportação ANP.' },
      { status: 500 },
    )
  }
}
