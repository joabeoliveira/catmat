// src/features/tcepr/tcepr.excel.ts
// Geração de planilha XLSX com os resultados da pesquisa TCE-PR (padrão salarios.excel.ts).
import * as XLSX from 'xlsx'
import type { TcePrBuscaResponse, TcePrItem } from './tcepr.types'

export interface DadosExportTcePr {
  termo: string
  filtros?: {
    cdIbge?: string
    municipio?: string
    refinar?: string
    modalidade?: string
    anoLicitacao?: number
    dtHomologacaoInicio?: string
    dtHomologacaoFim?: string
    fornecedor?: string
    nrDocumento?: string
    apenasVencedores?: boolean
    valorMin?: number
    valorMax?: number
    ordenarPor?: string
  }
  /** Quantidade máxima de itens exportados (default 200, máximo 500). */
  limite?: number
}

const FORMATO_MOEDA = 'R$ #,##0.00'
const ESTILO_TITULO = { font: { bold: true, sz: 14 } }
const ESTILO_SECAO = { fill: { fgColor: { rgb: 'CFFAFE' } }, font: { bold: true, color: { rgb: '164E63' } } }
const ESTILO_CABECALHO = {
  fill: { fgColor: { rgb: '0E7490' } },
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', wrapText: true },
}

function formatarMoeda(valor: number | null | undefined): string {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function aplicarEstilo(ws: XLSX.WorkSheet, endereco: string, estilo: object) {
  const cell = ws[endereco]
  if (cell) cell.s = estilo
}

function estilizarLinha(ws: XLSX.WorkSheet, linha: number, primeiraColuna: number, ultimaColuna: number, estilo: object) {
  for (let c = primeiraColuna; c <= ultimaColuna; c += 1) {
    aplicarEstilo(ws, XLSX.utils.encode_cell({ r: linha, c }), estilo)
  }
}

const CABECALHOS = [
  'Item',
  'Município',
  'Entidade',
  'Modalidade',
  'Homologação',
  'Fornecedor',
  'CNPJ/CPF',
  'Qtd',
  'Unidade',
  'Preço unitário homologado',
  'Classificação',
  'Lote',
  'Nº item',
  'Nº licitação',
  'Ano',
  'Forma de pagamento',
  'Prazo entrega (dias)',
]

function linhaDoItem(item: TcePrItem): (string | number | null)[] {
  return [
    item.dsItem,
    item.nmMunicipio,
    item.nmEntidade,
    item.dsModalidadeLicitacao,
    item.dtHomologacao ? item.dtHomologacao.slice(0, 10) : null,
    item.nmPessoa,
    item.nrDocumento,
    item.nrQuantidade,
    item.dsUnidadeMedida,
    item.vlLicitacaoVencedor,
    item.nrClassificacao,
    item.nrLote,
    item.nrItem,
    item.nrLicitacao,
    item.nrAnoLicitacao,
    item.dsFormaPagamento,
    item.nrPrazoLimiteEntrega,
  ]
}

export function gerarPlanilhaTcePr(dados: DadosExportTcePr, resultado: TcePrBuscaResponse): Buffer {
  const filtrosTexto: string[] = []
  const f = dados.filtros || {}
  if (dados.termo) filtrosTexto.push(`termo: "${dados.termo}"`)
  if (f.municipio) filtrosTexto.push(`município: ${f.municipio}`)
  if (f.modalidade) filtrosTexto.push(`modalidade: ${f.modalidade}`)
  if (f.anoLicitacao) filtrosTexto.push(`ano: ${f.anoLicitacao}`)
  if (f.dtHomologacaoInicio || f.dtHomologacaoFim) {
    filtrosTexto.push(`homologação: ${f.dtHomologacaoInicio || '...'} a ${f.dtHomologacaoFim || '...'}`)
  }
  if (f.fornecedor) filtrosTexto.push(`fornecedor: ${f.fornecedor}`)
  if (f.apenasVencedores === false) filtrosTexto.push('todas as classificações')

  const linhas: (string | number | null)[][] = []
  linhas.push(['Pesquisa de preços TCE-PR — itens homologados'])
  linhas.push([filtrosTexto.length ? `Filtros: ${filtrosTexto.join(' | ')}` : 'Busca geral'])

  const metricas = resultado.metricas
  linhas.push([
    `Registros: ${resultado.total}`,
    `Menor: ${formatarMoeda(metricas?.menor)}`,
    `Média: ${formatarMoeda(metricas?.media)}`,
    `Mediana: ${formatarMoeda(metricas?.mediana)}`,
    `Maior: ${formatarMoeda(metricas?.maior)}`,
  ])

  linhas.push(CABECALHOS)
  for (const item of resultado.items) {
    linhas.push(linhaDoItem(item))
  }

  const ws = XLSX.utils.aoa_to_sheet(linhas)

  // Estilos
  aplicarEstilo(ws, 'A1', ESTILO_TITULO)
  estilizarLinha(ws, 3, 0, CABECALHOS.length - 1, ESTILO_CABECALHO)
  estilizarLinha(ws, 1, 0, 0, ESTILO_SECAO)

  // Formato moeda na coluna "Preço unitário homologado" (índice 9)
  const larguraColunas = [60, 18, 34, 20, 12, 34, 18, 10, 12, 18, 12, 8, 8, 12, 8, 18, 14]
  ws['!cols'] = larguraColunas.map((wch) => ({ wch }))
  for (let r = 4; r < linhas.length; r += 1) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 9 })]
    if (cell) cell.z = FORMATO_MOEDA
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'TCE-PR')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
