// Geração de planilha Excel com documento formal de Pesquisa de Preços
// conforme IN SEGES/ME nº 65/2021, a partir dos preços retornados pela API.
import * as XLSX from 'xlsx'
import type { CatserPrecosResponse } from '@/features/catser/catser.types'

export interface IdentificacaoPesquisa {
  orgao: string
  responsavel: string
  processo: string
  observacoes: string
}

export interface FiltrosPesquisa {
  uf?: string
  uasg?: string
  poder?: string
  esfera?: string
  dataInicio?: string
  dataFim?: string
}

export interface ServicoPesquisa {
  codigoServico: number
  nomeServico: string
  nomeGrupo?: string | null
  nomeClasse?: string | null
}

export interface DadosPesquisaPrecos {
  identificacao: IdentificacaoPesquisa
  filtros: FiltrosPesquisa
  servico: ServicoPesquisa
  data: CatserPrecosResponse
}

const PODER_NOMES: Record<string, string> = { E: 'Executivo', L: 'Legislativo', J: 'Judiciário' }
const ESFERA_NOMES: Record<string, string> = { F: 'Federal', E: 'Estadual', M: 'Municipal' }
const FONTE = 'Compras.gov.br — Módulo Pesquisa de Preço (dados abertos)'

function formatarMoeda(valor: number | null | undefined): string {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleDateString('pt-BR')
}

function descreverFiltros(filtros: FiltrosPesquisa): string {
  const partes: string[] = []
  if (filtros.uf) partes.push(`UF: ${filtros.uf}`)
  if (filtros.uasg) partes.push(`UASG: ${filtros.uasg}`)
  if (filtros.poder) partes.push(`Poder: ${PODER_NOMES[filtros.poder] || filtros.poder}`)
  if (filtros.esfera) partes.push(`Esfera: ${ESFERA_NOMES[filtros.esfera] || filtros.esfera}`)
  if (filtros.dataInicio) partes.push(`De: ${filtros.dataInicio}`)
  if (filtros.dataFim) partes.push(`Até: ${filtros.dataFim}`)
  return partes.length ? partes.join('; ') : 'Sem filtros'
}

export function gerarPlanilhaPesquisaPrecos(params: DadosPesquisaPrecos): Buffer {
  const { identificacao, filtros, servico, data } = params
  const hoje = new Date().toLocaleDateString('pt-BR')
  const wb = XLSX.utils.book_new()

  // ---------- Planilha 1: Documento (identificação) ----------
  const docRows: (string | number)[][] = [
    ['PESQUISA DE PREÇOS — BASE PARA CONTRATAÇÃO'],
    ['Fundamento: IN SEGES/ME nº 65/2021, art. 4º (pesquisa de preços)'],
    [],
    ['Órgão solicitante', identificacao.orgao || ''],
    ['Responsável pela pesquisa', identificacao.responsavel || ''],
    ['Nº do processo', identificacao.processo || ''],
    ['Objeto', servico.nomeServico],
    ['Código do serviço (CATSER)', servico.codigoServico],
    ['Grupo / Classe', [servico.nomeGrupo, servico.nomeClasse].filter(Boolean).join(' / ')],
    ['Data da pesquisa', hoje],
    ['Período considerado', [filtros.dataInicio, filtros.dataFim].filter(Boolean).join(' a ') || '—'],
    ['Filtros aplicados', descreverFiltros(filtros)],
    ['Nº de preços considerados', data.metricas.quantidade ?? 0],
    ['Preço de referência (média)', formatarMoeda(data.metricas.media)],
    ['Observações', identificacao.observacoes || ''],
  ]
  const docWs = XLSX.utils.aoa_to_sheet(docRows)
  docWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]
  docWs['!cols'] = [{ wch: 32 }, { wch: 100 }]
  XLSX.utils.book_append_sheet(wb, docWs, 'Documento')

  // ---------- Planilha 2: Preços pesquisados ----------
  const precosRows: (string | number)[][] = [
    ['Data compra', 'Órgão (UASG)', 'Cód. UASG', 'Fornecedor', 'Objeto', 'Preço unitário (R$)', 'Quantidade', 'Unidade', 'Município/UF', 'Poder', 'Esfera', 'Fonte'],
    ...data.itens.map((item) => [
      formatarData(item.dataCompra),
      item.nomeUasg || '—',
      item.codigoUasg || '—',
      item.nomeFornecedor || '—',
      item.objetoCompra || item.descricaoItem || '—',
      item.precoUnitario ?? 0,
      item.quantidade ?? 0,
      [item.siglaUnidadeMedida, item.nomeUnidadeMedida].filter(Boolean).join(' · ') || '—',
      item.municipio ? `${item.municipio}${item.estado ? `/${item.estado}` : ''}` : item.estado || '—',
      PODER_NOMES[item.poder ?? ''] || item.poder || '—',
      ESFERA_NOMES[item.esfera ?? ''] || item.esfera || '—',
      FONTE,
    ]),
  ]
  const precosWs = XLSX.utils.aoa_to_sheet(precosRows)
  precosWs['!cols'] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 10 },
    { wch: 35 },
    { wch: 55 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 45 },
  ]
  for (let r = 1; r < precosRows.length; r += 1) {
    const preco = precosWs[XLSX.utils.encode_cell({ r, c: 5 })]
    if (preco && typeof preco.v === 'number') preco.z = 'R$ #,##0.00'
    const qtd = precosWs[XLSX.utils.encode_cell({ r, c: 6 })]
    if (qtd && typeof qtd.v === 'number') qtd.z = '#,##0.00'
  }
  XLSX.utils.book_append_sheet(wb, precosWs, 'Preços')

  // ---------- Planilha 3: Resumo / metodologia ----------
  const m = data.metricas
  const resumoRows: (string | number)[][] = [
    ['RESUMO DA PESQUISA DE PREÇOS'],
    [],
    ['Métrica', 'Valor'],
    ['Nº de preços considerados', m.quantidade ?? 0],
    ['Menor preço', formatarMoeda(m.menor)],
    ['Preço médio', formatarMoeda(m.media)],
    ['Preço mediano', formatarMoeda(m.mediana)],
    ['Maior preço', formatarMoeda(m.maior)],
    [],
    ['Metodologia', 'Média aritmética dos preços coletados em fontes oficiais, conforme IN SEGES/ME nº 65/2021.'],
    ['Fonte dos dados', FONTE],
    ['Filtros aplicados', descreverFiltros(filtros)],
    ['Total de registros na fonte', data.totalRegistros ?? 0],
  ]
  const resumoWs = XLSX.utils.aoa_to_sheet(resumoRows)
  resumoWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
  resumoWs['!cols'] = [{ wch: 32 }, { wch: 90 }]
  XLSX.utils.book_append_sheet(wb, resumoWs, 'Resumo')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
