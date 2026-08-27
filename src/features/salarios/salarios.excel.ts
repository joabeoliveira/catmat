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

const PARAMETROS_PADRAO = {
  mesesContrato: 12,
  decimoTerceiro: 1 / 12,
  adicionalFerias: 1 / 36,
  inss: 0.20,
  salarioEducacao: 0.025,
  rat: 0.01,
  sesiSesc: 0.015,
  senaiSenac: 0.01,
  sebrae: 0.006,
  incra: 0.002,
  fgts: 0.08,
  avisoPrevioIndenizado: 0.0046,
  fgtsAvisoPrevioIndenizado: 0.000368,
  avisoPrevioTrabalhado: 0.0194,
  incidenciaAvisoPrevioTrabalhado: 0.0068,
  multaFgtsAvisoPrevioTrabalhado: 0.02,
  reposicaoFerias: 0.0833,
  ausenciasLegais: 0.0028,
  licencaPaternidade: 0.00021,
  acidenteTrabalho: 0.00032,
  afastamentoMaternidade: 0.0031,
  ausenciaDoenca: 0.0166,
  custosIndiretos: 0.03,
  lucro: 0.0679,
  pis: 0.0165,
  cofins: 0.076,
  iss: 0.02,
} as const

const CELULAS_PARAMETROS = {
  mesesContrato: "'Parâmetros'!$B$5",
  decimoTerceiro: "'Parâmetros'!$B$8",
  adicionalFerias: "'Parâmetros'!$B$9",
  inss: "'Parâmetros'!$B$12",
  salarioEducacao: "'Parâmetros'!$B$13",
  rat: "'Parâmetros'!$B$14",
  sesiSesc: "'Parâmetros'!$B$15",
  senaiSenac: "'Parâmetros'!$B$16",
  sebrae: "'Parâmetros'!$B$17",
  incra: "'Parâmetros'!$B$18",
  fgts: "'Parâmetros'!$B$19",
  avisoPrevioIndenizado: "'Parâmetros'!$B$22",
  fgtsAvisoPrevioIndenizado: "'Parâmetros'!$B$23",
  avisoPrevioTrabalhado: "'Parâmetros'!$B$24",
  incidenciaAvisoPrevioTrabalhado: "'Parâmetros'!$B$25",
  multaFgtsAvisoPrevioTrabalhado: "'Parâmetros'!$B$26",
  reposicaoFerias: "'Parâmetros'!$B$29",
  ausenciasLegais: "'Parâmetros'!$B$30",
  licencaPaternidade: "'Parâmetros'!$B$31",
  acidenteTrabalho: "'Parâmetros'!$B$32",
  afastamentoMaternidade: "'Parâmetros'!$B$33",
  ausenciaDoenca: "'Parâmetros'!$B$34",
  custosIndiretos: "'Parâmetros'!$B$37",
  lucro: "'Parâmetros'!$B$38",
  pis: "'Parâmetros'!$B$39",
  cofins: "'Parâmetros'!$B$40",
  iss: "'Parâmetros'!$B$41",
} as const

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

interface TotaisPosto {
  modulo1: number
  modulo21: number
  modulo22: number
  modulo23: number
  modulo2: number
  modulo3: number
  modulo4: number
  modulo5: number
  subtotal: number
  custosIndiretos: number
  lucro: number
  tributos: number
  valorEmpregado: number
  valorMensal: number
  valorContrato: number
}

interface MetadadosAbaPosto {
  nome: string
  item: SalarioGradeItem
  linhaSalario: number
  linhaValorEmpregado: number
  linhaValorMensal: number
  linhaValorContrato: number
  totais: TotaisPosto
}

function calcularTotaisPosto(item: SalarioGradeItem): TotaisPosto {
  const salario = item.salarioReferencia || 0
  const modulo1 = salario
  const modulo21 = modulo1 * (PARAMETROS_PADRAO.decimoTerceiro + PARAMETROS_PADRAO.adicionalFerias)
  const base22 = modulo1 + modulo21
  const percentual22 = PARAMETROS_PADRAO.inss + PARAMETROS_PADRAO.salarioEducacao + PARAMETROS_PADRAO.rat
    + PARAMETROS_PADRAO.sesiSesc + PARAMETROS_PADRAO.senaiSenac + PARAMETROS_PADRAO.sebrae
    + PARAMETROS_PADRAO.incra + PARAMETROS_PADRAO.fgts
  const modulo22 = base22 * percentual22
  const modulo23 = 0
  const modulo2 = modulo21 + modulo22 + modulo23
  const baseApi = modulo1 + modulo21 + modulo23
  const baseApt = modulo1 + modulo2
  const modulo3 = baseApi * (PARAMETROS_PADRAO.avisoPrevioIndenizado + PARAMETROS_PADRAO.fgtsAvisoPrevioIndenizado)
    + baseApt * (PARAMETROS_PADRAO.avisoPrevioTrabalhado + PARAMETROS_PADRAO.incidenciaAvisoPrevioTrabalhado + PARAMETROS_PADRAO.multaFgtsAvisoPrevioTrabalhado)
  const baseReposicao = modulo1 + modulo2 + modulo3
  const modulo4 = baseReposicao * (PARAMETROS_PADRAO.reposicaoFerias + PARAMETROS_PADRAO.ausenciasLegais
    + PARAMETROS_PADRAO.licencaPaternidade + PARAMETROS_PADRAO.acidenteTrabalho
    + PARAMETROS_PADRAO.afastamentoMaternidade + PARAMETROS_PADRAO.ausenciaDoenca)
  const modulo5 = 0
  const subtotal = modulo1 + modulo2 + modulo3 + modulo4 + modulo5
  const custosIndiretos = subtotal * PARAMETROS_PADRAO.custosIndiretos
  const baseLucro = subtotal + custosIndiretos
  const lucro = baseLucro * PARAMETROS_PADRAO.lucro
  const baseTributos = baseLucro + lucro
  const tributos = baseTributos * (PARAMETROS_PADRAO.pis + PARAMETROS_PADRAO.cofins + PARAMETROS_PADRAO.iss)
  const valorEmpregado = baseTributos + tributos
  const valorMensal = valorEmpregado * item.quantidade
  return {
    modulo1,
    modulo21,
    modulo22,
    modulo23,
    modulo2,
    modulo3,
    modulo4,
    modulo5,
    subtotal,
    custosIndiretos,
    lucro,
    tributos,
    valorEmpregado,
    valorMensal,
    valorContrato: valorMensal * PARAMETROS_PADRAO.mesesContrato,
  }
}

function criarParametros() {
  const rows: Linha[] = [
    ['PARÂMETROS GERAIS DA FORMAÇÃO DE PREÇOS'],
    ['As células amarelas são premissas editáveis. Revise-as conforme edital, legislação, regime tributário e convenção coletiva aplicáveis.'],
    [],
    ['CONTRATAÇÃO'],
    ['Duração estimada do contrato (meses)', PARAMETROS_PADRAO.mesesContrato, 'Aplicada a todas as abas de posto.'],
    [],
    ['PROVISÕES ANUAIS'],
    ['13º salário', PARAMETROS_PADRAO.decimoTerceiro, 'Equivale a 1/12 da remuneração.'],
    ['Adicional de férias', PARAMETROS_PADRAO.adicionalFerias, 'Equivale a 1/3 sobre a provisão mensal de férias.'],
    [],
    ['ENCARGOS PREVIDENCIÁRIOS, FGTS E OUTRAS CONTRIBUIÇÕES'],
    ['INSS', PARAMETROS_PADRAO.inss, 'Validar o regime tributário da empresa.'],
    ['Salário-Educação', PARAMETROS_PADRAO.salarioEducacao, ''],
    ['RAT x FAP', PARAMETROS_PADRAO.rat, 'Pode variar conforme o risco e o FAP.'],
    ['SESC ou SESI', PARAMETROS_PADRAO.sesiSesc, ''],
    ['SENAI ou SENAC', PARAMETROS_PADRAO.senaiSenac, ''],
    ['SEBRAE', PARAMETROS_PADRAO.sebrae, ''],
    ['INCRA', PARAMETROS_PADRAO.incra, ''],
    ['FGTS', PARAMETROS_PADRAO.fgts, ''],
    [],
    ['PROVISÃO PARA RESCISÃO'],
    ['Aviso-prévio indenizado', PARAMETROS_PADRAO.avisoPrevioIndenizado, 'Premissa orientativa do modelo de referência.'],
    ['Incidência do FGTS sobre aviso-prévio indenizado', PARAMETROS_PADRAO.fgtsAvisoPrevioIndenizado, ''],
    ['Aviso-prévio trabalhado', PARAMETROS_PADRAO.avisoPrevioTrabalhado, ''],
    ['Incidência de encargos sobre aviso-prévio trabalhado', PARAMETROS_PADRAO.incidenciaAvisoPrevioTrabalhado, ''],
    ['Multa do FGTS sobre aviso-prévio trabalhado', PARAMETROS_PADRAO.multaFgtsAvisoPrevioTrabalhado, ''],
    [],
    ['REPOSIÇÃO DO PROFISSIONAL AUSENTE'],
    ['Cobertura de férias', PARAMETROS_PADRAO.reposicaoFerias, ''],
    ['Ausências legais', PARAMETROS_PADRAO.ausenciasLegais, ''],
    ['Licença-paternidade', PARAMETROS_PADRAO.licencaPaternidade, ''],
    ['Acidente de trabalho', PARAMETROS_PADRAO.acidenteTrabalho, ''],
    ['Afastamento-maternidade', PARAMETROS_PADRAO.afastamentoMaternidade, ''],
    ['Ausência por doença', PARAMETROS_PADRAO.ausenciaDoenca, ''],
    [],
    ['CUSTOS INDIRETOS, LUCRO E TRIBUTOS'],
    ['Custos indiretos', PARAMETROS_PADRAO.custosIndiretos, ''],
    ['Lucro', PARAMETROS_PADRAO.lucro, ''],
    ['PIS', PARAMETROS_PADRAO.pis, 'Validar o regime tributário.'],
    ['COFINS', PARAMETROS_PADRAO.cofins, 'Validar o regime tributário.'],
    ['ISS', PARAMETROS_PADRAO.iss, 'Validar a legislação municipal.'],
    [],
    ['AVISO'],
    ['Este modelo é um ponto de partida. Todos os percentuais, benefícios, adicionais, insumos e incidências devem ser revisados pelo responsável técnico antes do uso no processo administrativo.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 2 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } },
    { s: { r: 20, c: 0 }, e: { r: 20, c: 2 } },
    { s: { r: 27, c: 0 }, e: { r: 27, c: 2 } },
    { s: { r: 35, c: 0 }, e: { r: 35, c: 2 } },
    { s: { r: 42, c: 0 }, e: { r: 42, c: 2 } },
    { s: { r: 43, c: 0 }, e: { r: 43, c: 2 } },
  ]
  ws['!cols'] = [{ wch: 58 }, { wch: 18 }, { wch: 66 }]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 34 }]
  estilizarLinha(ws, 0, 0, 2, ESTILO_TITULO)
  for (const row of [3, 6, 10, 20, 27, 35, 42]) estilizarLinha(ws, row, 0, 2, ESTILO_SECAO)
  for (let row = 4; row <= 40; row += 1) {
    if (ws[`B${row + 1}`]) aplicarEstilo(ws, `B${row + 1}`, ESTILO_ENTRADA)
  }
  definirFormato(ws, rows.length, [1], FORMATO_PERCENTUAL, 7)
  if (ws.B5) ws.B5.z = '#,##0'
  ws['!freeze'] = { xSplit: 0, ySplit: 4 }
  return ws
}

function formulaCell(formula: string, valor: number, formato = FORMATO_MOEDA): XLSX.CellObject {
  return { t: 'n', f: formula, v: valor, z: formato }
}

function criarAbaPosto(item: SalarioGradeItem, indice: number): { ws: XLSX.WorkSheet; meta: MetadadosAbaPosto } {
  const nome = `Posto ${String(indice + 1).padStart(2, '0')} - ${item.cbo}`
  const atividades = item.atividadesSelecionadas?.filter(Boolean) || []
  const totais = calcularTotaisPosto(item)
  const rows: Linha[] = []
  const push = (row: Linha = []) => { rows.push(row); return rows.length }
  const secao = (titulo: string) => push([titulo])

  push(['PLANILHA DE CUSTOS E FORMAÇÃO DE PREÇOS - POSTO DE TRABALHO'])
  push(['Modelo orientativo com fórmulas editáveis. Revise as premissas antes de utilizá-lo no processo administrativo.'])
  push()
  const identificacao = secao('IDENTIFICAÇÃO DO POSTO')
  push(['Posto/Função', item.titulo])
  push(['CBO', item.cbo])
  const linhaQuantidade = push(['Quantidade de postos', item.quantidade])
  const linhaMeses = push(['Duração do contrato (meses)', PARAMETROS_PADRAO.mesesContrato])
  push(['Referência salarial escolhida', criterioLegivel(item.criterioReferencia)])
  push(['Observações', item.observacao || ''])
  push()
  const atividadesSecao = secao(`ATIVIDADES DO POSTO (${atividades.length} selecionadas)`)
  push(['Item', 'Atividade selecionada pelo usuário'])
  if (atividades.length) atividades.forEach((atividade, atividadeIndice) => push([atividadeIndice + 1, atividade]))
  else push(['-', 'Nenhuma atividade selecionada. Retorne ao sistema, escolha as atividades do CBO e exporte novamente.'])
  push()

  const modulo1Secao = secao('MÓDULO 1 - COMPOSIÇÃO DA REMUNERAÇÃO')
  push(['Item', 'Composição', 'Percentual', 'Base/valor unitário', 'Valor mensal por empregado'])
  const linhaSalario = push(['1.A', 'Salário-base', null, item.salarioReferencia ?? 0, item.salarioReferencia ?? 0])
  const linhaPericulosidade = push(['1.B', 'Adicional de periculosidade', 0, null, 0])
  const linhaInsalubridade = push(['1.C', 'Adicional de insalubridade', 0, null, 0])
  const linhaNoturno = push(['1.D', 'Adicional noturno', 0, null, 0])
  const linhaModulo1 = push(['', 'TOTAL DO MÓDULO 1', null, null, totais.modulo1])
  push()

  const modulo21Secao = secao('SUBMÓDULO 2.1 - 13º SALÁRIO, FÉRIAS E ADICIONAL DE FÉRIAS')
  push(['Item', 'Provisão', 'Percentual', 'Base de cálculo', 'Valor mensal por empregado'])
  const linhaDecimo = push(['2.1.A', '13º salário', PARAMETROS_PADRAO.decimoTerceiro, totais.modulo1, totais.modulo1 * PARAMETROS_PADRAO.decimoTerceiro])
  const linhaFerias = push(['2.1.B', 'Adicional de férias', PARAMETROS_PADRAO.adicionalFerias, totais.modulo1, totais.modulo1 * PARAMETROS_PADRAO.adicionalFerias])
  const linhaModulo21 = push(['', 'TOTAL DO SUBMÓDULO 2.1', null, null, totais.modulo21])
  push()

  const modulo22Secao = secao('SUBMÓDULO 2.2 - ENCARGOS PREVIDENCIÁRIOS, FGTS E OUTRAS CONTRIBUIÇÕES')
  push(['Item', 'Encargo', 'Percentual', 'Base de cálculo', 'Valor mensal por empregado'])
  const encargos22: Array<[string, string, keyof typeof CELULAS_PARAMETROS, number]> = [
    ['2.2.A', 'INSS', 'inss', PARAMETROS_PADRAO.inss],
    ['2.2.B', 'Salário-Educação', 'salarioEducacao', PARAMETROS_PADRAO.salarioEducacao],
    ['2.2.C', 'RAT x FAP', 'rat', PARAMETROS_PADRAO.rat],
    ['2.2.D', 'SESC ou SESI', 'sesiSesc', PARAMETROS_PADRAO.sesiSesc],
    ['2.2.E', 'SENAI ou SENAC', 'senaiSenac', PARAMETROS_PADRAO.senaiSenac],
    ['2.2.F', 'SEBRAE', 'sebrae', PARAMETROS_PADRAO.sebrae],
    ['2.2.G', 'INCRA', 'incra', PARAMETROS_PADRAO.incra],
    ['2.2.H', 'FGTS', 'fgts', PARAMETROS_PADRAO.fgts],
  ]
  const linhasEncargos22 = encargos22.map(([codigo, descricao, chave, percentual]) => ({
    linha: push([codigo, descricao, percentual, totais.modulo1 + totais.modulo21, (totais.modulo1 + totais.modulo21) * percentual]),
    chave,
  }))
  const linhaModulo22 = push(['', 'TOTAL DO SUBMÓDULO 2.2', null, null, totais.modulo22])
  push()

  const modulo23Secao = secao('SUBMÓDULO 2.3 - BENEFÍCIOS MENSAIS E DIÁRIOS')
  push(['Item', 'Benefício', 'Quantidade/dias', 'Valor unitário', 'Custo mensal por empregado'])
  const beneficios = [
    ['2.3.A', 'Auxílio-transporte'],
    ['2.3.B', 'Auxílio-refeição/alimentação'],
    ['2.3.C', 'Seguro de vida'],
    ['2.3.D', 'Plano de saúde'],
    ['2.3.E', 'Plano odontológico'],
    ['2.3.F', 'Auxílio-creche'],
    ['2.3.G', 'Outros benefícios'],
  ]
  const linhasBeneficios = beneficios.map(([codigo, descricao]) => push([codigo, descricao, 1, 0, 0]))
  const linhaModulo23 = push(['', 'TOTAL DO SUBMÓDULO 2.3', null, null, totais.modulo23])
  const linhaModulo2 = push(['', 'TOTAL DO MÓDULO 2', null, null, totais.modulo2])
  push()

  const modulo3Secao = secao('MÓDULO 3 - PROVISÃO PARA RESCISÃO')
  push(['Item', 'Provisão', 'Percentual', 'Base de cálculo', 'Valor mensal por empregado'])
  const provisoes3: Array<[string, string, keyof typeof CELULAS_PARAMETROS, number, 'api' | 'apt']> = [
    ['3.A', 'Aviso-prévio indenizado', 'avisoPrevioIndenizado', PARAMETROS_PADRAO.avisoPrevioIndenizado, 'api'],
    ['3.B', 'Incidência do FGTS sobre aviso-prévio indenizado', 'fgtsAvisoPrevioIndenizado', PARAMETROS_PADRAO.fgtsAvisoPrevioIndenizado, 'api'],
    ['3.C', 'Aviso-prévio trabalhado', 'avisoPrevioTrabalhado', PARAMETROS_PADRAO.avisoPrevioTrabalhado, 'apt'],
    ['3.D', 'Incidência de encargos sobre aviso-prévio trabalhado', 'incidenciaAvisoPrevioTrabalhado', PARAMETROS_PADRAO.incidenciaAvisoPrevioTrabalhado, 'apt'],
    ['3.E', 'Multa do FGTS sobre aviso-prévio trabalhado', 'multaFgtsAvisoPrevioTrabalhado', PARAMETROS_PADRAO.multaFgtsAvisoPrevioTrabalhado, 'apt'],
  ]
  const baseApi = totais.modulo1 + totais.modulo21 + totais.modulo23
  const baseApt = totais.modulo1 + totais.modulo2
  const linhasProvisoes3 = provisoes3.map(([codigo, descricao, chave, percentual, base]) => ({
    linha: push([codigo, descricao, percentual, base === 'api' ? baseApi : baseApt, (base === 'api' ? baseApi : baseApt) * percentual]),
    chave,
    base,
  }))
  const linhaModulo3 = push(['', 'TOTAL DO MÓDULO 3', null, null, totais.modulo3])
  push()

  const modulo4Secao = secao('MÓDULO 4 - CUSTO DE REPOSIÇÃO DO PROFISSIONAL AUSENTE')
  push(['Item', 'Ausência', 'Percentual', 'Base de cálculo', 'Valor mensal por empregado'])
  const reposicoes4: Array<[string, string, keyof typeof CELULAS_PARAMETROS, number]> = [
    ['4.A', 'Cobertura de férias', 'reposicaoFerias', PARAMETROS_PADRAO.reposicaoFerias],
    ['4.B', 'Ausências legais', 'ausenciasLegais', PARAMETROS_PADRAO.ausenciasLegais],
    ['4.C', 'Licença-paternidade', 'licencaPaternidade', PARAMETROS_PADRAO.licencaPaternidade],
    ['4.D', 'Acidente de trabalho', 'acidenteTrabalho', PARAMETROS_PADRAO.acidenteTrabalho],
    ['4.E', 'Afastamento-maternidade', 'afastamentoMaternidade', PARAMETROS_PADRAO.afastamentoMaternidade],
    ['4.F', 'Ausência por doença', 'ausenciaDoenca', PARAMETROS_PADRAO.ausenciaDoenca],
  ]
  const baseReposicao = totais.modulo1 + totais.modulo2 + totais.modulo3
  const linhasReposicoes4 = reposicoes4.map(([codigo, descricao, chave, percentual]) => ({
    linha: push([codigo, descricao, percentual, baseReposicao, baseReposicao * percentual]),
    chave,
  }))
  const linhaModulo4 = push(['', 'TOTAL DO MÓDULO 4', null, null, totais.modulo4])
  push()

  const modulo5Secao = secao('MÓDULO 5 - INSUMOS DIVERSOS')
  push(['Item', 'Insumo', 'Quantidade', 'Valor unitário', 'Custo mensal por empregado'])
  const linhasInsumos = [
    push(['5.A', 'Uniformes e EPIs', 1, 0, 0]),
    push(['5.B', 'Materiais e utensílios', 1, 0, 0]),
    push(['5.C', 'Equipamentos', 1, 0, 0]),
    push(['5.D', 'Outros insumos', 1, 0, 0]),
  ]
  const linhaModulo5 = push(['', 'TOTAL DO MÓDULO 5', null, null, totais.modulo5])
  push()

  const modulo6Secao = secao('MÓDULO 6 - CUSTOS INDIRETOS, TRIBUTOS E LUCRO')
  push(['Item', 'Componente', 'Percentual', 'Base de cálculo', 'Valor mensal por empregado'])
  const linhaSubtotal = push(['6.A', 'Subtotal dos módulos 1 a 5', null, null, totais.subtotal])
  const linhaCustosIndiretos = push(['6.B', 'Custos indiretos', PARAMETROS_PADRAO.custosIndiretos, totais.subtotal, totais.custosIndiretos])
  const linhaBaseLucro = push(['', 'Base de cálculo para lucro', null, null, totais.subtotal + totais.custosIndiretos])
  const linhaLucro = push(['6.C', 'Lucro', PARAMETROS_PADRAO.lucro, totais.subtotal + totais.custosIndiretos, totais.lucro])
  const linhaBaseTributos = push(['', 'Base de cálculo para tributos', null, null, totais.subtotal + totais.custosIndiretos + totais.lucro])
  const linhaPis = push(['6.D.1', 'PIS', PARAMETROS_PADRAO.pis, totais.subtotal + totais.custosIndiretos + totais.lucro, (totais.subtotal + totais.custosIndiretos + totais.lucro) * PARAMETROS_PADRAO.pis])
  const linhaCofins = push(['6.D.2', 'COFINS', PARAMETROS_PADRAO.cofins, totais.subtotal + totais.custosIndiretos + totais.lucro, (totais.subtotal + totais.custosIndiretos + totais.lucro) * PARAMETROS_PADRAO.cofins])
  const linhaIss = push(['6.D.3', 'ISS', PARAMETROS_PADRAO.iss, totais.subtotal + totais.custosIndiretos + totais.lucro, (totais.subtotal + totais.custosIndiretos + totais.lucro) * PARAMETROS_PADRAO.iss])
  const linhaTributos = push(['', 'TOTAL DE TRIBUTOS', null, null, totais.tributos])
  const linhaValorEmpregado = push(['', 'VALOR TOTAL MENSAL POR EMPREGADO', null, null, totais.valorEmpregado])
  const linhaValorMensal = push(['', 'VALOR MENSAL DO POSTO (QUANTIDADE TOTAL)', null, null, totais.valorMensal])
  const linhaValorContrato = push(['', 'VALOR ESTIMADO DO CONTRATO', null, null, totais.valorContrato])
  push()
  const quadroResumoSecao = secao('QUADRO-RESUMO DO CUSTO POR EMPREGADO')
  push(['Módulo', 'Descrição', null, null, 'Valor mensal'])
  push(['1', 'Composição da remuneração', null, null, totais.modulo1])
  push(['2', 'Encargos e benefícios anuais, mensais e diários', null, null, totais.modulo2])
  push(['3', 'Provisão para rescisão', null, null, totais.modulo3])
  push(['4', 'Custo de reposição do profissional ausente', null, null, totais.modulo4])
  push(['5', 'Insumos diversos', null, null, totais.modulo5])
  push(['6', 'Custos indiretos, tributos e lucro', null, null, totais.custosIndiretos + totais.lucro + totais.tributos])
  push(['', 'VALOR TOTAL MENSAL POR EMPREGADO', null, null, totais.valorEmpregado])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 62 }, { wch: 18 }, { wch: 22 }, { wch: 25 }]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 34 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ...[identificacao, atividadesSecao, modulo1Secao, modulo21Secao, modulo22Secao, modulo23Secao, modulo3Secao, modulo4Secao, modulo5Secao, modulo6Secao, quadroResumoSecao]
      .map((linha) => ({ s: { r: linha - 1, c: 0 }, e: { r: linha - 1, c: 4 } })),
  ]
  estilizarLinha(ws, 0, 0, 4, ESTILO_TITULO)
  for (const linha of [identificacao, atividadesSecao, modulo1Secao, modulo21Secao, modulo22Secao, modulo23Secao, modulo3Secao, modulo4Secao, modulo5Secao, modulo6Secao, quadroResumoSecao]) {
    estilizarLinha(ws, linha - 1, 0, 4, ESTILO_SECAO)
  }
  for (const linha of [modulo1Secao + 1, modulo21Secao + 1, modulo22Secao + 1, modulo23Secao + 1, modulo3Secao + 1, modulo4Secao + 1, modulo5Secao + 1, modulo6Secao + 1, quadroResumoSecao + 1, atividadesSecao + 1]) {
    estilizarLinha(ws, linha - 1, 0, 4, ESTILO_CABECALHO)
  }
  aplicarEstilo(ws, `B${linhaQuantidade}`, ESTILO_ENTRADA)
  aplicarEstilo(ws, `B${linhaMeses}`, ESTILO_ENTRADA)
  aplicarEstilo(ws, `D${linhaSalario}`, ESTILO_ENTRADA)
  for (const linha of [linhaPericulosidade, linhaInsalubridade, linhaNoturno]) aplicarEstilo(ws, `C${linha}`, ESTILO_ENTRADA)
  for (const linha of linhasBeneficios) {
    aplicarEstilo(ws, `C${linha}`, ESTILO_ENTRADA)
    aplicarEstilo(ws, `D${linha}`, ESTILO_ENTRADA)
  }
  for (const linha of linhasInsumos) {
    aplicarEstilo(ws, `C${linha}`, ESTILO_ENTRADA)
    aplicarEstilo(ws, `D${linha}`, ESTILO_ENTRADA)
  }
  for (const linha of [linhaModulo1, linhaModulo21, linhaModulo22, linhaModulo23, linhaModulo2, linhaModulo3, linhaModulo4, linhaModulo5, linhaSubtotal, linhaTributos, linhaValorEmpregado, linhaValorMensal, linhaValorContrato]) {
    estilizarLinha(ws, linha - 1, 0, 4, ESTILO_TOTAL)
  }

  ws[`B${linhaMeses}`] = formulaCell(CELULAS_PARAMETROS.mesesContrato, PARAMETROS_PADRAO.mesesContrato, '#,##0')
  ws[`E${linhaSalario}`] = formulaCell(`D${linhaSalario}`, item.salarioReferencia || 0)
  for (const linha of [linhaPericulosidade, linhaInsalubridade, linhaNoturno]) {
    ws[`D${linha}`] = formulaCell(`E${linhaSalario}`, item.salarioReferencia || 0)
    ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, 0)
  }
  ws[`E${linhaModulo1}`] = formulaCell(`SUM(E${linhaSalario}:E${linhaNoturno})`, totais.modulo1)
  ws[`C${linhaDecimo}`] = formulaCell(CELULAS_PARAMETROS.decimoTerceiro, PARAMETROS_PADRAO.decimoTerceiro, FORMATO_PERCENTUAL)
  ws[`D${linhaDecimo}`] = formulaCell(`E${linhaModulo1}`, totais.modulo1)
  ws[`E${linhaDecimo}`] = formulaCell(`C${linhaDecimo}*D${linhaDecimo}`, totais.modulo1 * PARAMETROS_PADRAO.decimoTerceiro)
  ws[`C${linhaFerias}`] = formulaCell(CELULAS_PARAMETROS.adicionalFerias, PARAMETROS_PADRAO.adicionalFerias, FORMATO_PERCENTUAL)
  ws[`D${linhaFerias}`] = formulaCell(`E${linhaModulo1}`, totais.modulo1)
  ws[`E${linhaFerias}`] = formulaCell(`C${linhaFerias}*D${linhaFerias}`, totais.modulo1 * PARAMETROS_PADRAO.adicionalFerias)
  ws[`E${linhaModulo21}`] = formulaCell(`SUM(E${linhaDecimo}:E${linhaFerias})`, totais.modulo21)

  for (const { linha, chave } of linhasEncargos22) {
    ws[`C${linha}`] = formulaCell(CELULAS_PARAMETROS[chave], Number(PARAMETROS_PADRAO[chave]), FORMATO_PERCENTUAL)
    ws[`D${linha}`] = formulaCell(`E${linhaModulo1}+E${linhaModulo21}`, totais.modulo1 + totais.modulo21)
    ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, (totais.modulo1 + totais.modulo21) * Number(PARAMETROS_PADRAO[chave]))
  }
  ws[`E${linhaModulo22}`] = formulaCell(`SUM(E${linhasEncargos22[0].linha}:E${linhasEncargos22[linhasEncargos22.length - 1].linha})`, totais.modulo22)
  for (const linha of linhasBeneficios) ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, 0)
  ws[`E${linhaModulo23}`] = formulaCell(`SUM(E${linhasBeneficios[0]}:E${linhasBeneficios[linhasBeneficios.length - 1]})`, totais.modulo23)
  ws[`E${linhaModulo2}`] = formulaCell(`E${linhaModulo21}+E${linhaModulo22}+E${linhaModulo23}`, totais.modulo2)

  for (const { linha, chave, base } of linhasProvisoes3) {
    ws[`C${linha}`] = formulaCell(CELULAS_PARAMETROS[chave], Number(PARAMETROS_PADRAO[chave]), FORMATO_PERCENTUAL)
    const formulaBase = base === 'api' ? `E${linhaModulo1}+E${linhaModulo21}+E${linhaModulo23}` : `E${linhaModulo1}+E${linhaModulo2}`
    ws[`D${linha}`] = formulaCell(formulaBase, base === 'api' ? baseApi : baseApt)
    ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, (base === 'api' ? baseApi : baseApt) * Number(PARAMETROS_PADRAO[chave]))
  }
  ws[`E${linhaModulo3}`] = formulaCell(`SUM(E${linhasProvisoes3[0].linha}:E${linhasProvisoes3[linhasProvisoes3.length - 1].linha})`, totais.modulo3)

  for (const { linha, chave } of linhasReposicoes4) {
    ws[`C${linha}`] = formulaCell(CELULAS_PARAMETROS[chave], Number(PARAMETROS_PADRAO[chave]), FORMATO_PERCENTUAL)
    ws[`D${linha}`] = formulaCell(`E${linhaModulo1}+E${linhaModulo2}+E${linhaModulo3}`, baseReposicao)
    ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, baseReposicao * Number(PARAMETROS_PADRAO[chave]))
  }
  ws[`E${linhaModulo4}`] = formulaCell(`SUM(E${linhasReposicoes4[0].linha}:E${linhasReposicoes4[linhasReposicoes4.length - 1].linha})`, totais.modulo4)
  for (const linha of linhasInsumos) ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, 0)
  ws[`E${linhaModulo5}`] = formulaCell(`SUM(E${linhasInsumos[0]}:E${linhasInsumos[linhasInsumos.length - 1]})`, totais.modulo5)

  ws[`E${linhaSubtotal}`] = formulaCell(`SUM(E${linhaModulo1},E${linhaModulo2},E${linhaModulo3},E${linhaModulo4},E${linhaModulo5})`, totais.subtotal)
  ws[`C${linhaCustosIndiretos}`] = formulaCell(CELULAS_PARAMETROS.custosIndiretos, PARAMETROS_PADRAO.custosIndiretos, FORMATO_PERCENTUAL)
  ws[`D${linhaCustosIndiretos}`] = formulaCell(`E${linhaSubtotal}`, totais.subtotal)
  ws[`E${linhaCustosIndiretos}`] = formulaCell(`C${linhaCustosIndiretos}*D${linhaCustosIndiretos}`, totais.custosIndiretos)
  ws[`E${linhaBaseLucro}`] = formulaCell(`E${linhaSubtotal}+E${linhaCustosIndiretos}`, totais.subtotal + totais.custosIndiretos)
  ws[`C${linhaLucro}`] = formulaCell(CELULAS_PARAMETROS.lucro, PARAMETROS_PADRAO.lucro, FORMATO_PERCENTUAL)
  ws[`D${linhaLucro}`] = formulaCell(`E${linhaBaseLucro}`, totais.subtotal + totais.custosIndiretos)
  ws[`E${linhaLucro}`] = formulaCell(`C${linhaLucro}*D${linhaLucro}`, totais.lucro)
  ws[`E${linhaBaseTributos}`] = formulaCell(`E${linhaBaseLucro}+E${linhaLucro}`, totais.subtotal + totais.custosIndiretos + totais.lucro)
  for (const [linha, chave, valor] of [
    [linhaPis, 'pis', PARAMETROS_PADRAO.pis],
    [linhaCofins, 'cofins', PARAMETROS_PADRAO.cofins],
    [linhaIss, 'iss', PARAMETROS_PADRAO.iss],
  ] as const) {
    ws[`C${linha}`] = formulaCell(CELULAS_PARAMETROS[chave], valor, FORMATO_PERCENTUAL)
    ws[`D${linha}`] = formulaCell(`E${linhaBaseTributos}`, totais.subtotal + totais.custosIndiretos + totais.lucro)
    ws[`E${linha}`] = formulaCell(`C${linha}*D${linha}`, (totais.subtotal + totais.custosIndiretos + totais.lucro) * valor)
  }
  ws[`E${linhaTributos}`] = formulaCell(`SUM(E${linhaPis}:E${linhaIss})`, totais.tributos)
  ws[`E${linhaValorEmpregado}`] = formulaCell(`E${linhaBaseTributos}+E${linhaTributos}`, totais.valorEmpregado)
  ws[`E${linhaValorMensal}`] = formulaCell(`E${linhaValorEmpregado}*$B$${linhaQuantidade}`, totais.valorMensal)
  ws[`E${linhaValorContrato}`] = formulaCell(`E${linhaValorMensal}*$B$${linhaMeses}`, totais.valorContrato)

  const linhasResumo = Array.from({ length: 7 }, (_, resumoIndice) => quadroResumoSecao + 2 + resumoIndice)
  const formulasResumo = [
    `E${linhaModulo1}`,
    `E${linhaModulo2}`,
    `E${linhaModulo3}`,
    `E${linhaModulo4}`,
    `E${linhaModulo5}`,
    `E${linhaCustosIndiretos}+E${linhaLucro}+E${linhaTributos}`,
    `E${linhaValorEmpregado}`,
  ]
  const valoresResumo = [totais.modulo1, totais.modulo2, totais.modulo3, totais.modulo4, totais.modulo5, totais.custosIndiretos + totais.lucro + totais.tributos, totais.valorEmpregado]
  linhasResumo.forEach((linha, resumoIndice) => { ws[`E${linha}`] = formulaCell(formulasResumo[resumoIndice], valoresResumo[resumoIndice]) })

  definirFormato(ws, rows.length, [2], FORMATO_PERCENTUAL, modulo1Secao)
  definirFormato(ws, rows.length, [3, 4], FORMATO_MOEDA, modulo1Secao)
  for (const linha of [...linhasBeneficios, ...linhasInsumos]) {
    if (ws[`C${linha}`]) ws[`C${linha}`].z = '#,##0.00'
  }
  ws['!freeze'] = { xSplit: 0, ySplit: 4 }
  ws['!autofilter'] = { ref: `A${atividadesSecao + 1}:B${atividadesSecao + 1 + Math.max(1, atividades.length)}` }
  return {
    ws,
    meta: { nome, item, linhaSalario, linhaValorEmpregado, linhaValorMensal, linhaValorContrato, totais },
  }
}

function criarResumoPostos(metadados: MetadadosAbaPosto[]) {
  const totalQuantidade = metadados.reduce((total, meta) => total + meta.item.quantidade, 0)
  const totalMensal = metadados.reduce((total, meta) => total + meta.totais.valorMensal, 0)
  const totalContrato = metadados.reduce((total, meta) => total + meta.totais.valorContrato, 0)
  const inicioDados = 7
  const fimDados = inicioDados + metadados.length - 1
  const linhaTotais = fimDados + 1
  const rows: Linha[] = [
    ['RESUMO CONSOLIDADO DOS POSTOS DE TRABALHO'],
    ['Quadro demonstrativo do valor mensal e global da contratação. Os valores são alimentados pelas fórmulas das abas individuais.'],
    [],
    ['Funções/CBOs selecionados', metadados.length, 'Quantidade total de postos', totalQuantidade, 'Custo mensal estimado', totalMensal, 'Custo estimado do contrato', totalContrato],
    [],
    ['Item', 'CBO', 'Posto/Função', 'Quantidade', 'Salário-base', 'Custo mensal por empregado', 'Subtotal mensal', 'Meses', 'Subtotal do contrato', 'Atividades selecionadas', 'Resumo das atividades'],
    ...metadados.map((meta, indice) => [
      indice + 1,
      meta.item.cbo,
      meta.item.titulo,
      meta.item.quantidade,
      meta.item.salarioReferencia || 0,
      meta.totais.valorEmpregado,
      meta.totais.valorMensal,
      PARAMETROS_PADRAO.mesesContrato,
      meta.totais.valorContrato,
      meta.item.atividadesSelecionadas?.length || 0,
      meta.item.atividadesSelecionadas?.slice(0, 8).join('; ') || '',
    ]),
    ['', '', 'TOTAL GERAL', totalQuantidade, '', '', totalMensal, '', totalContrato, '', ''],
    [],
    ['ORIENTAÇÃO'],
    ['Cada aba “Posto” contém a memória de cálculo completa e as atividades escolhidas para aquela função. Revise as células amarelas e as premissas da aba “Parâmetros”.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: linhaTotais + 1, c: 0 }, e: { r: linhaTotais + 1, c: 10 } },
    { s: { r: linhaTotais + 2, c: 0 }, e: { r: linhaTotais + 2, c: 10 } },
  ]
  ws['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 42 }, { wch: 12 }, { wch: 18 }, { wch: 23 },
    { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 65 },
  ]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 30 }, {}, { hpt: 25 }, {}, { hpt: 48 }]
  estilizarLinha(ws, 0, 0, 10, ESTILO_TITULO)
  estilizarLinha(ws, 5, 0, 10, ESTILO_CABECALHO)
  estilizarLinha(ws, linhaTotais - 1, 0, 10, ESTILO_TOTAL)
  estilizarLinha(ws, linhaTotais + 1, 0, 10, ESTILO_SECAO)
  for (let indice = 0; indice < metadados.length; indice += 1) {
    const row = inicioDados + indice
    const meta = metadados[indice]
    const aba = `'${meta.nome}'`
    ws[`D${row}`] = formulaCell(`${aba}!$B$7`, meta.item.quantidade, '#,##0')
    ws[`E${row}`] = formulaCell(`${aba}!$D$${meta.linhaSalario}`, meta.item.salarioReferencia || 0)
    ws[`F${row}`] = formulaCell(`${aba}!$E$${meta.linhaValorEmpregado}`, meta.totais.valorEmpregado)
    ws[`G${row}`] = formulaCell(`${aba}!$E$${meta.linhaValorMensal}`, meta.totais.valorMensal)
    ws[`H${row}`] = formulaCell("'Parâmetros'!$B$5", PARAMETROS_PADRAO.mesesContrato, '#,##0')
    ws[`I${row}`] = formulaCell(`${aba}!$E$${meta.linhaValorContrato}`, meta.totais.valorContrato)
  }
  if (metadados.length) {
    ws.D4 = formulaCell(`SUM(D${inicioDados}:D${fimDados})`, totalQuantidade, '#,##0')
    ws.F4 = formulaCell(`SUM(G${inicioDados}:G${fimDados})`, totalMensal)
    ws.H4 = formulaCell(`SUM(I${inicioDados}:I${fimDados})`, totalContrato)
    ws[`D${linhaTotais}`] = formulaCell(`SUM(D${inicioDados}:D${fimDados})`, totalQuantidade, '#,##0')
    ws[`G${linhaTotais}`] = formulaCell(`SUM(G${inicioDados}:G${fimDados})`, totalMensal)
    ws[`I${linhaTotais}`] = formulaCell(`SUM(I${inicioDados}:I${fimDados})`, totalContrato)
  }
  definirFormato(ws, rows.length, [4, 5, 6, 8], FORMATO_MOEDA, 6)
  ws['!autofilter'] = { ref: `A6:K${Math.max(6, fimDados)}` }
  ws['!freeze'] = { xSplit: 0, ySplit: 6 }
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
  const exportandoGrade = Array.isArray(dados.grade) && dados.grade.length > 0

  XLSX.utils.book_append_sheet(wb, criarApresentacao(dados, resultado, grade), 'Apresentação')
  if (exportandoGrade) {
    const abasPostos = grade.map((item, indice) => criarAbaPosto(item, indice))
    XLSX.utils.book_append_sheet(wb, criarResumoPostos(abasPostos.map(({ meta }) => meta)), 'Resumo de Postos')
    XLSX.utils.book_append_sheet(wb, criarParametros(), 'Parâmetros')
    for (const { ws, meta } of abasPostos) XLSX.utils.book_append_sheet(wb, ws, meta.nome)
  } else {
    XLSX.utils.book_append_sheet(wb, criarPlanilhaCustos(grade), 'Planilha de Custos')
  }
  XLSX.utils.book_append_sheet(wb, criarReferencias(dados, resultado), 'Referências Salariais')
  XLSX.utils.book_append_sheet(wb, criarPerfis(resultado), 'Perfis CBO')
  XLSX.utils.book_append_sheet(wb, criarFontesMetodologia(dados, resultado), 'Fontes e Metodologia')

  wb.Workbook = wb.Workbook || {}
  ;(wb.Workbook as typeof wb.Workbook & { CalcPr: { calcMode: string; fullCalcOnLoad: boolean; forceFullCalc: boolean } }).CalcPr = {
    calcMode: 'auto',
    fullCalcOnLoad: true,
    forceFullCalc: true,
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer
}

export { formatarMoeda }
