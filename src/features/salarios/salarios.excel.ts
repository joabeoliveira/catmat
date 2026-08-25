// src/features/salarios/salarios.excel.ts
// Geração da planilha XLSX da pesquisa salarial por CBO (padrão pesquisa-precos.excel.ts).
import * as XLSX from 'xlsx'
import type { SalarioBuscaResponse, SalarioCard } from './salarios.types'

export interface DadosExportSalarios {
  termo: string
  uf?: string
  ano: number
  aplicarInpc: boolean
  /** Quantidade máxima de ocupações exportadas (default 200). */
  limite?: number
  grade?: SalarioCard[]
}

function formatarMoeda(valor: number | null | undefined): string {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function gerarPlanilhaSalarios(dados: DadosExportSalarios, resultado: SalarioBuscaResponse): Buffer {
  const wb = XLSX.utils.book_new()
  const hoje = new Date().toLocaleDateString('pt-BR')

  // ---------- Planilha 1: Documento (identificação) ----------
  const docRows: (string | number)[][] = [
    ['PESQUISA SALARIAL POR CBO — BASE PARA COTAÇÃO'],
    ['Fundamento: CBO (Classificação Brasileira de Ocupações) + correção INPC (SGS/BCB, série 188)'],
    [],
    ['Termo pesquisado', dados.termo || '(todos)'],
    ['UF filtrada', dados.uf || 'Todas'],
    ['Ano de referência', dados.ano],
    ['Correção INPC até o mês atual', dados.aplicarInpc ? `Sim (fator ${resultado.fatorInpc.toFixed(4)})` : 'Não'],
    ['Nº de ocupações exportadas', resultado.items.length],
    ['Data da pesquisa', hoje],
  ]
  const docWs = XLSX.utils.aoa_to_sheet(docRows)
  docWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]
  docWs['!cols'] = [{ wch: 32 }, { wch: 90 }]
  XLSX.utils.book_append_sheet(wb, docWs, 'Documento')

  // ---------- Planilha 2: Resultados ----------
  const header: string[] = dados.aplicarInpc
    ? ['CBO', 'Ocupação', 'Família', 'Perfil ocupacional', 'UFs', 'Menor (corrigido)', 'Média (corrigida)', 'Mediana (corrigida)', 'Maior (corrigido)', 'P25', 'P50', 'P75', 'Média original', 'Mediana original', 'Fonte']
    : ['CBO', 'Ocupação', 'Família', 'Perfil ocupacional', 'UFs', 'Menor', 'Média', 'Mediana', 'Maior', 'P25', 'P50', 'P75', 'Fonte']

  const rows: (string | number)[][] = [
    header,
    ...resultado.items.map((item) =>
      dados.aplicarInpc
        ? [
            item.cbo,
            item.titulo,
            item.hierarquia?.familia || '',
            item.hierarquia?.perfilOcupacional || '',
            item.ufCount,
            item.estatisticas.menor ?? 0,
            item.estatisticas.media ?? 0,
            item.estatisticas.mediana ?? 0,
            item.estatisticas.maior ?? 0,
            item.percentis?.p25 ?? 0,
            item.percentis?.p50 ?? 0,
            item.percentis?.p75 ?? 0,
            item.estatisticasOriginal?.media ?? 0,
            item.estatisticasOriginal?.mediana ?? 0,
            item.hierarquia?.fonte || '',
          ]
        : [
            item.cbo,
            item.titulo,
            item.hierarquia?.familia || '',
            item.hierarquia?.perfilOcupacional || '',
            item.ufCount,
            item.estatisticas.menor ?? 0,
            item.estatisticas.media ?? 0,
            item.estatisticas.mediana ?? 0,
            item.estatisticas.maior ?? 0,
            item.percentis?.p25 ?? 0,
            item.percentis?.p50 ?? 0,
            item.percentis?.p75 ?? 0,
            item.hierarquia?.fonte || '',
          ],
    ),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 8 },
    { wch: 70 },
    { wch: 24 },
    { wch: 60 },
    { wch: 6 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    ...(dados.aplicarInpc ? [{ wch: 16 }, { wch: 16 }] : []),
  ]
  const currencyCols = dados.aplicarInpc ? [5, 6, 7, 8, 9, 10, 11, 12] : [5, 6, 7, 8, 9, 10, 11]
  for (let r = 1; r < rows.length; r += 1) {
    for (const c of currencyCols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && typeof cell.v === 'number') cell.z = 'R$ #,##0.00'
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados')

  // ---------- Planilha 3: Resumo / metodologia ----------
  const resumoRows: (string | number)[][] = [
    ['RESUMO DA PESQUISA SALARIAL'],
    [],
    ['Métrica', 'Valor'],
    ['Ocupações exportadas', resultado.items.length],
    ['Ano de referência', dados.ano],
    ['Fator INPC aplicado', dados.aplicarInpc ? resultado.fatorInpc.toFixed(4) : '—'],
    [],
    ['Metodologia', 'Estatísticas calculadas entre as UFs disponíveis (menor, média, mediana, maior).'],
    ['Fonte', 'Base de salários por CBO/UF (salariosBrasil_INPC.csv).'],
    ['Correção monetária', 'INPC acumulado de 1º de janeiro do ano base até o mês atual (SGS/BCB série 188).'],
  ]
  const resumoWs = XLSX.utils.aoa_to_sheet(resumoRows)
  resumoWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
  resumoWs['!cols'] = [{ wch: 32 }, { wch: 90 }]
  XLSX.utils.book_append_sheet(wb, resumoWs, 'Resumo')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export { formatarMoeda }
