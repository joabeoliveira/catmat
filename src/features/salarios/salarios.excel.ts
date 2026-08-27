import * as XLSX from 'xlsx'
import type {
  CriterioSalarioGrade,
  SalarioBuscaResponse,
  SalarioCard,
  SalarioGradeItem,
} from './salarios.types'

export interface DadosExportSalarios {
  termo: string
  uf?: string
  ano: number
  aplicarInpc: boolean
  fatorInpc?: number
  grandeGrupo?: string
  subgrupoPrincipal?: string
  familia?: string
  palavrasObrigatorias?: string
  palavrasExcluidas?: string
  salarioMinimo?: number
  salarioMaximo?: number
  minimoUfs?: number
  referenciaSalarial?: 'mediana' | 'media' | 'p25' | 'p75'
  ordenarPor?: 'relevancia' | 'salario_asc' | 'salario_desc' | 'ufs_desc' | 'amplitude_asc' | 'titulo'
  /** Quantidade máxima de ocupações exportadas (default 200). */
  limite?: number
  grade?: SalarioGradeItem[]
}

type ValorCelula = string | number | null
type Linha = ValorCelula[]

const FONTE_OCUPACIONAL = 'Classificação Brasileira de Ocupações (CBO 2002) — Ministério do Trabalho e Emprego (MTE).'
const FONTE_SALARIAL = 'Referências salariais por CBO e UF — COGED e RAIS/MTE.'
const FONTE_INPC = 'INPC/IBGE, consultado pela série 188 do Sistema Gerenciador de Séries Temporais do Banco Central do Brasil (SGS/BCB).'
const FORMATO_MOEDA = 'R$ #,##0.00;[Red]-R$ #,##0.00;R$ 0.00'
const FORMATO_PERCENTUAL = '0.00%'

const ESTILO_TITULO = {
  fill: { fgColor: { rgb: '0F172A' } },
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 },
  alignment: { vertical: 'center', wrapText: true },
}
const ESTILO_CABECALHO = {
  fill: { fgColor: { rgb: '0E7490' } },
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { vertical: 'center', wrapText: true },
}
const ESTILO_SECAO = {
  fill: { fgColor: { rgb: 'CFFAFE' } },
  font: { bold: true, color: { rgb: '164E63' } },
  alignment: { vertical: 'center', wrapText: true },
}
const ESTILO_ENTRADA = {
  fill: { fgColor: { rgb: 'FFF7CC' } },
  font: { color: { rgb: '0000FF' } },
}
const ESTILO_TOTAL = {
  fill: { fgColor: { rgb: 'E2E8F0' } },
  font: { bold: true, color: { rgb: '0F172A' } },
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

function definirFormato(ws: XLSX.WorkSheet, linhas: number, colunas: number[], formato: string, inicio = 1) {
  for (let r = inicio; r < linhas; r += 1) {
    for (const c of colunas) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell) cell.z = formato
    }
  }
}

function criterioLegivel(criterio: CriterioSalarioGrade): string {
  if (criterio === 'p25') return 'Faixa inferior do mercado (P25)'
  if (criterio === 'p75') return 'Faixa superior do mercado (P75)'
  if (criterio === 'media') return 'Média dos salários observados'
  if (criterio === 'personalizado') return 'Valor definido pelo usuário'
  return 'Valor central do mercado (mediana/P50)'
}

function salarioDoCriterio(item: SalarioCard, criterio: CriterioSalarioGrade): number | null {
  if (criterio === 'p25') return item.percentis?.p25 ?? null
  if (criterio === 'p75') return item.percentis?.p75 ?? null
  if (criterio === 'media') return item.estatisticas.media
  return item.estatisticas.mediana
}

function normalizarGrade(items: SalarioCard[]): SalarioGradeItem[] {
  return items.map((item) => {
    const linha = item as Partial<SalarioGradeItem> & SalarioCard
    const criterio = linha.criterioReferencia || 'mediana'
    return {
      ...item,
      quantidade: Math.max(1, Math.trunc(Number(linha.quantidade) || 1)),
      criterioReferencia: criterio,
      salarioReferencia: typeof linha.salarioReferencia === 'number' && Number.isFinite(linha.salarioReferencia)
        ? linha.salarioReferencia
        : salarioDoCriterio(item, criterio),
      observacao: linha.observacao || '',
      atividadesSelecionadas: Array.isArray(linha.atividadesSelecionadas) ? linha.atividadesSelecionadas : undefined,
    }
  })
}

function criarApresentacao(dados: DadosExportSalarios, resultado: SalarioBuscaResponse, grade: SalarioGradeItem[]) {
  const totalPostos = grade.reduce((total, item) => total + item.quantidade, 0)
  const hoje = new Date().toLocaleDateString('pt-BR')
  const rows: Linha[] = [
    ['MEMÓRIA DE CÁLCULO DE POSTOS DE TRABALHO'],
    ['Documento de apoio à pesquisa salarial, elaboração da planilha de custos e formação de preços.'],
    [],
    ['PARÂMETROS DA PESQUISA'],
    ['Termo pesquisado', dados.termo || 'Grade montada pelo usuário'],
    ['Abrangência geográfica', dados.uf || 'Todas as UFs disponíveis'],
    ['Ano de referência dos salários', dados.ano],
    ['Atualização monetária pelo INPC', dados.aplicarInpc ? `Aplicada — fator ${resultado.fatorInpc.toFixed(4)}` : 'Não aplicada'],
    ['Funções/CBOs selecionados', grade.length],
    ['Quantidade total de postos', totalPostos],
    ['Data da pesquisa', hoje],
    [],
    ['COMO USAR ESTA PLANILHA'],
    ['1', 'Revise a função, o CBO, o perfil ocupacional e a quantidade de postos.'],
    ['2', 'Na aba “Planilha de Custos”, escolha ou altere o salário adotado para cada posto.'],
    ['3', 'Preencha os percentuais de encargos e provisões, benefícios e demais custos previstos na contratação.'],
    ['4', 'Confira a convenção coletiva, jornada, adicionais, tributos e regras do processo antes de concluir o preço.'],
    [],
    ['IMPORTANTE'],
    ['Os valores calculados são referências para planejamento. Eles não substituem pesquisa de mercado, convenção coletiva, legislação trabalhista, análise tributária ou justificativa formal do preço.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 5 } },
    { s: { r: 18, c: 0 }, e: { r: 18, c: 5 } },
    { s: { r: 19, c: 0 }, e: { r: 19, c: 5 } },
  ]
  ws['!cols'] = [{ wch: 34 }, { wch: 95 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 28 }, {}, { hpt: 24 }, {}, {}, {}, {}, {}, {}, {}, {}, { hpt: 24 }]
  estilizarLinha(ws, 0, 0, 5, ESTILO_TITULO)
  estilizarLinha(ws, 3, 0, 5, ESTILO_SECAO)
  estilizarLinha(ws, 12, 0, 5, ESTILO_SECAO)
  estilizarLinha(ws, 18, 0, 5, ESTILO_SECAO)
  return ws
}

function criarPlanilhaCustos(grade: SalarioGradeItem[]) {
  const inicioDados = 14
  const fimDados = inicioDados + grade.length - 1
  const totalPostos = grade.reduce((total, item) => total + item.quantidade, 0)
  const totalMensal = grade.reduce((total, item) => total + item.quantidade * (item.salarioReferencia || 0), 0)
  const rows: Linha[] = [
    ['PLANILHA-BASE DE CUSTOS DOS POSTOS DE TRABALHO'],
    ['As células amarelas são premissas editáveis. Complete encargos, benefícios e outros custos conforme a contratação.'],
    [],
    ['RESUMO DA ESTIMATIVA'],
    ['Duração estimada do contrato (meses)', 12],
    ['Funções/CBOs selecionados', grade.length],
    ['Quantidade total de postos', totalPostos],
    ['Custo mensal estimado', totalMensal],
    ['Custo estimado para o contrato', totalMensal * 12],
    [],
    ['Atenção', 'Os totais iniciais consideram apenas os salários adotados. Preencha encargos, provisões, benefícios e outros custos para obter uma estimativa mais completa.'],
    [],
    ['CBO', 'Posto/Função', 'Quantidade de postos', 'Referência salarial escolhida', 'Salário mensal adotado por posto', 'Encargos e provisões (%)', 'Benefícios mensais por posto', 'Outros custos mensais por posto', 'Custo mensal estimado', 'Custo anual estimado (12 meses)', 'Custo estimado do contrato', 'Observações', 'Atividades (CBO) do posto'],
    ...grade.map((item) => [
      item.cbo,
      item.titulo,
      item.quantidade,
      criterioLegivel(item.criterioReferencia),
      item.salarioReferencia ?? 0,
      0,
      0,
      0,
      item.quantidade * (item.salarioReferencia || 0),
      item.quantidade * (item.salarioReferencia || 0) * 12,
      item.quantidade * (item.salarioReferencia || 0) * 12,
      item.observacao || '',
      item.atividadesSelecionadas?.join('; ') || '',
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 12 } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 12 } },
  ]
  ws['!cols'] = [
    { wch: 9 }, { wch: 42 }, { wch: 14 }, { wch: 31 }, { wch: 20 }, { wch: 18 },
    { wch: 21 }, { wch: 21 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 35 }, { wch: 60 },
  ]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 30 }, {}, { hpt: 24 }, {}, {}, {}, {}, {}, {}, { hpt: 34 }, {}, { hpt: 48 }]
  ws['!autofilter'] = { ref: `A13:M${Math.max(13, fimDados)}` }
  estilizarLinha(ws, 0, 0, 12, ESTILO_TITULO)
  estilizarLinha(ws, 3, 0, 12, ESTILO_SECAO)
  estilizarLinha(ws, 12, 0, 12, ESTILO_CABECALHO)
  aplicarEstilo(ws, 'B5', ESTILO_ENTRADA)

  for (let r = inicioDados; r <= fimDados; r += 1) {
    const item = grade[r - inicioDados]
    ws[`I${r}`] = { t: 'n', f: `C${r}*(E${r}*(1+F${r})+G${r}+H${r})`, v: item.quantidade * (item.salarioReferencia || 0), z: FORMATO_MOEDA }
    ws[`J${r}`] = { t: 'n', f: `I${r}*12`, v: item.quantidade * (item.salarioReferencia || 0) * 12, z: FORMATO_MOEDA }
    ws[`K${r}`] = { t: 'n', f: `I${r}*$B$5`, v: item.quantidade * (item.salarioReferencia || 0) * 12, z: FORMATO_MOEDA }
    for (const col of ['C', 'E', 'F', 'G', 'H', 'L']) aplicarEstilo(ws, `${col}${r}`, ESTILO_ENTRADA)
  }
  if (grade.length) {
    ws.B7 = { t: 'n', f: `SUM(C14:C${fimDados})`, v: totalPostos }
    ws.B8 = { t: 'n', f: `SUM(I14:I${fimDados})`, v: totalMensal, z: FORMATO_MOEDA, s: ESTILO_TOTAL }
    ws.B9 = { t: 'n', f: `SUM(K14:K${fimDados})`, v: totalMensal * 12, z: FORMATO_MOEDA, s: ESTILO_TOTAL }
  }
  definirFormato(ws, rows.length, [4, 6, 7, 8, 9, 10], FORMATO_MOEDA, 13)
  definirFormato(ws, rows.length, [5], FORMATO_PERCENTUAL, 13)
  return ws
}

function criarReferencias(dados: DadosExportSalarios, resultado: SalarioBuscaResponse) {
  const corrigido = dados.aplicarInpc ? ' — valor atualizado pelo INPC' : ''
  const header = [
    'CBO',
    'Título oficial da ocupação',
    'Família ocupacional',
    'UFs consideradas no cálculo',
    `Menor salário observado${corrigido}`,
    `Salário médio observado${corrigido}`,
    `Valor central — metade dos salários está até este valor (mediana/P50)${corrigido}`,
    `Maior salário observado${corrigido}`,
    `Faixa inferior — 25% dos salários está até este valor (P25)${corrigido}`,
    `Faixa superior — 75% dos salários está até este valor (P75)${corrigido}`,
    'Quantidade de observações válidas',
    'Sinônimos ou títulos relacionados',
  ]
  const rows: Linha[] = [
    ['REFERÊNCIAS SALARIAIS PARA APOIO À DECISÃO'],
    ['Compare a posição do salário pretendido na distribuição observada entre as UFs.'],
    [],
    header,
    ...resultado.items.map((item) => [
      item.cbo,
      item.titulo,
      item.hierarquia?.familia || '',
      item.ufCount,
      item.estatisticas.menor ?? null,
      item.estatisticas.media ?? null,
      item.estatisticas.mediana ?? null,
      item.estatisticas.maior ?? null,
      item.percentis?.p25 ?? null,
      item.percentis?.p75 ?? null,
      item.percentis?.observacoes ?? item.ufCount,
      item.sinonimos?.join('; ') || '',
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
  ]
  ws['!cols'] = [
    { wch: 9 }, { wch: 42 }, { wch: 36 }, { wch: 15 }, { wch: 19 }, { wch: 20 },
    { wch: 38 }, { wch: 19 }, { wch: 38 }, { wch: 38 }, { wch: 18 }, { wch: 55 },
  ]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 26 }, {}, { hpt: 76 }]
  ws['!autofilter'] = { ref: `A4:L${Math.max(4, rows.length)}` }
  estilizarLinha(ws, 0, 0, 11, ESTILO_TITULO)
  estilizarLinha(ws, 3, 0, 11, ESTILO_CABECALHO)
  definirFormato(ws, rows.length, [4, 5, 6, 7, 8, 9], FORMATO_MOEDA, 4)
  return ws
}

function criarPerfis(resultado: SalarioBuscaResponse) {
  const rows: Linha[] = [
    ['CLASSIFICAÇÃO E PERFIL DOS POSTOS DE TRABALHO'],
    ['Use estas informações para descrever e justificar a escolha do posto no termo de referência ou documento equivalente.'],
    [],
    ['CBO', 'Título oficial da ocupação', 'Grande grupo', 'Subgrupo principal', 'Família ocupacional', 'Perfil ocupacional / atividades', 'Sinônimos ou títulos relacionados', 'Fonte oficial da classificação'],
    ...resultado.items.map((item) => [
      item.cbo,
      item.titulo,
      item.hierarquia?.grandeGrupo || '',
      item.hierarquia?.subgrupoPrincipal || '',
      item.hierarquia?.familia || '',
      item.hierarquia?.perfilOcupacional || '',
      item.sinonimos?.join('; ') || '',
      FONTE_OCUPACIONAL,
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ]
  ws['!cols'] = [{ wch: 9 }, { wch: 42 }, { wch: 42 }, { wch: 42 }, { wch: 38 }, { wch: 90 }, { wch: 55 }, { wch: 48 }]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 30 }, {}, { hpt: 48 }]
  ws['!autofilter'] = { ref: `A4:H${Math.max(4, rows.length)}` }
  estilizarLinha(ws, 0, 0, 7, ESTILO_TITULO)
  estilizarLinha(ws, 3, 0, 7, ESTILO_CABECALHO)
  return ws
}

function criarFontesMetodologia(dados: DadosExportSalarios, resultado: SalarioBuscaResponse) {
  const rows: Linha[] = [
    ['FONTES, CONCEITOS E ORIENTAÇÕES DE USO'],
    [],
    ['FONTES DOS DADOS'],
    ['Classificação e descrição das ocupações', FONTE_OCUPACIONAL],
    ['Referências salariais', FONTE_SALARIAL],
    ['Atualização monetária', FONTE_INPC],
    [],
    ['COMO INTERPRETAR OS VALORES'],
    ['Faixa inferior do mercado (P25)', '25% dos salários válidos observados são iguais ou inferiores a este valor. Pode apoiar uma referência mais econômica, desde que compatível com a função e com as obrigações aplicáveis.'],
    ['Valor central do mercado (mediana/P50)', 'Metade dos salários observados está abaixo e metade está acima deste valor. É uma referência central menos afetada por valores extremos.'],
    ['Faixa superior do mercado (P75)', '75% dos salários válidos observados são iguais ou inferiores a este valor. Pode apoiar funções que exijam maior experiência, responsabilidade ou qualificação.'],
    ['Média observada', 'Soma dos salários válidos dividida pela quantidade de observações. Pode ser influenciada por salários muito baixos ou muito altos.'],
    ['Menor e maior salário', 'Limites observados na base para o recorte escolhido. Não devem ser usados isoladamente para definir o preço.'],
    [],
    ['METODOLOGIA E LIMITAÇÕES'],
    ['Abrangência', 'As estatísticas são calculadas com salários positivos e válidos disponíveis por CBO, UF e ano de referência.'],
    ['Correção pelo INPC', dados.aplicarInpc ? `Os valores exibidos foram multiplicados pelo fator ${resultado.fatorInpc.toFixed(4)}. O índice atualiza o poder de compra, mas não substitui pesquisa salarial atual.` : 'Não foi aplicada correção monetária nesta exportação.'],
    ['Formação de preços', 'A remuneração é apenas uma parcela do custo do posto. Devem ser considerados encargos, provisões, benefícios, adicionais, substituições, tributos, administração, lucro e demais condições da contratação.'],
    ['Validação necessária', 'Antes de usar os valores no processo, confirme convenção coletiva, jornada, local de execução, requisitos do posto, data-base e regras legais e administrativas aplicáveis.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
    { s: { r: 14, c: 0 }, e: { r: 14, c: 5 } },
  ]
  ws['!cols'] = [{ wch: 38 }, { wch: 105 }, { wch: 3 }, { wch: 3 }, { wch: 3 }, { wch: 3 }]
  ws['!rows'] = [{ hpt: 30 }, {}, { hpt: 24 }, {}, {}, {}, {}, { hpt: 24 }, { hpt: 44 }, { hpt: 44 }, { hpt: 44 }, { hpt: 40 }, { hpt: 40 }, {}, { hpt: 24 }, { hpt: 38 }, { hpt: 44 }, { hpt: 48 }, { hpt: 48 }]
  estilizarLinha(ws, 0, 0, 5, ESTILO_TITULO)
  estilizarLinha(ws, 2, 0, 5, ESTILO_SECAO)
  estilizarLinha(ws, 7, 0, 5, ESTILO_SECAO)
  estilizarLinha(ws, 14, 0, 5, ESTILO_SECAO)
  return ws
}

export function gerarPlanilhaSalarios(dados: DadosExportSalarios, resultado: SalarioBuscaResponse): Buffer {
  const wb = XLSX.utils.book_new()
  const grade = normalizarGrade(resultado.items)

  XLSX.utils.book_append_sheet(wb, criarApresentacao(dados, resultado, grade), 'Apresentação')
  XLSX.utils.book_append_sheet(wb, criarPlanilhaCustos(grade), 'Planilha de Custos')
  XLSX.utils.book_append_sheet(wb, criarReferencias(dados, resultado), 'Referências Salariais')
  XLSX.utils.book_append_sheet(wb, criarPerfis(resultado), 'Perfis CBO')
  XLSX.utils.book_append_sheet(wb, criarFontesMetodologia(dados, resultado), 'Fontes e Metodologia')

  wb.Workbook = wb.Workbook || {}
  ;(wb.Workbook as typeof wb.Workbook & { CalcPr: { calcMode: string } }).CalcPr = { calcMode: 'auto' }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer
}

export { formatarMoeda }
