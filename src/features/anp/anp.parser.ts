import * as XLSX from 'xlsx'

import type {
  AnpAbrangencia,
  AnpLinhaNormalizada,
  AnpProduto,
  AnpResultadoParsing,
  AnpUnidade,
} from './anp.types'

const ABAS_ESPERADAS: readonly AnpAbrangencia[] = [
  'CAPITAIS',
  'MUNICIPIOS',
  'ESTADOS',
  'REGIOES',
  'BRASIL',
]

const PRODUTO_MAP: Record<string, AnpProduto> = {
  'ETANOL HIDRATADO': 'ETANOL_HIDRATADO',
  'GASOLINA COMUM': 'GASOLINA_COMUM',
  'GASOLINA ADITIVADA': 'GASOLINA_ADITIVADA',
  'OLEO DIESEL': 'OLEO_DIESEL',
  'OLEO DIESEL S10': 'OLEO_DIESEL_S10',
  GLP: 'GLP',
  GNV: 'GNV',
}

const UNIDADE_MAP: Record<string, AnpUnidade> = {
  'R$/L': 'LITRO',
  'R$/13KG': 'TREZE_KG',
  'R$/M3': 'METRO_CUBICO',
}

const ESTADO_PARA_UF: Record<string, string> = {
  ACRE: 'AC',
  ALAGOAS: 'AL',
  AMAPA: 'AP',
  AMAZONAS: 'AM',
  BAHIA: 'BA',
  CEARA: 'CE',
  'DISTRITO FEDERAL': 'DF',
  'ESPIRITO SANTO': 'ES',
  GOIAS: 'GO',
  MARANHAO: 'MA',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG',
  PARA: 'PA',
  PARAIBA: 'PB',
  PARANA: 'PR',
  PERNAMBUCO: 'PE',
  PIAUI: 'PI',
  'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS',
  RONDONIA: 'RO',
  RORAIMA: 'RR',
  'SANTA CATARINA': 'SC',
  'SAO PAULO': 'SP',
  SERGIPE: 'SE',
  TOCANTINS: 'TO',
}

function normalizarChave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/³/g, '3')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function normalizarTexto(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null

  const texto = normalizarChave(String(valor))
  return texto || null
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null

  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : null
}

function ufDoEstado(valor: unknown): string | null {
  const estado = normalizarTexto(valor)
  if (!estado) return null
  if (/^[A-Z]{2}$/.test(estado)) return estado
  return ESTADO_PARA_UF[estado] || null
}

function valorColuna(linha: Record<string, unknown>, ...nomes: string[]): unknown {
  for (const nome of nomes) {
    const valor = linha[normalizarChave(nome)]
    if (valor !== undefined && valor !== null && valor !== '') return valor
  }

  return null
}

function normalizarLinha(
  linhaBruta: Record<string, unknown>,
  abrangencia: AnpAbrangencia,
): AnpLinhaNormalizada | null {
  const linha = Object.fromEntries(
    Object.entries(linhaBruta).map(([chave, valor]) => [normalizarChave(chave), valor]),
  ) as Record<string, unknown>

  const produto = PRODUTO_MAP[normalizarTexto(valorColuna(linha, 'PRODUTO')) || '']
  const unidade = UNIDADE_MAP[normalizarChave(String(valorColuna(linha, 'UNIDADE DE MEDIDA') || ''))]
  const postosPesquisados = numero(
    valorColuna(linha, 'NÚMERO DE POSTOS PESQUISADOS'),
  )
  const precoMedio = numero(valorColuna(linha, 'PREÇO MÉDIO REVENDA'))
  const precoMinimo = numero(valorColuna(linha, 'PREÇO MÍNIMO REVENDA'))
  const precoMaximo = numero(valorColuna(linha, 'PREÇO MÁXIMO REVENDA'))

  if (
    !produto ||
    !unidade ||
    postosPesquisados === null ||
    !Number.isInteger(postosPesquisados) ||
    postosPesquisados < 0 ||
    precoMedio === null ||
    precoMinimo === null ||
    precoMaximo === null
  ) {
    return null
  }

  const estado = ufDoEstado(valorColuna(linha, 'ESTADO', 'ESTADOS'))
  const municipio = normalizarTexto(valorColuna(linha, 'MUNICÍPIO', 'MUNICIPIO'))
  const regiao = normalizarTexto(valorColuna(linha, 'REGIÃO', 'REGIAO'))

  let localidade: string | null = null
  let estadoNormalizado: string | null = null
  let municipioNormalizado: string | null = null
  let regiaoNormalizada: string | null = null

  if (abrangencia === 'BRASIL') {
    localidade = 'BRASIL'
  } else if (abrangencia === 'REGIOES') {
    localidade = regiao
    regiaoNormalizada = regiao
  } else if (abrangencia === 'ESTADOS') {
    localidade = estado
    estadoNormalizado = estado
  } else {
    estadoNormalizado = estado
    municipioNormalizado = municipio
    localidade = municipio && estado ? `${municipio} - ${estado}` : null
  }

  if (!localidade) return null

  return {
    abrangencia,
    produto,
    unidade,
    localidade,
    estado: estadoNormalizado,
    municipio: municipioNormalizado,
    regiao: regiaoNormalizada,
    postosPesquisados,
    precoMedio,
    desvioPadrao: numero(valorColuna(linha, 'DESVIO PADRÃO REVENDA')),
    precoMinimo,
    precoMaximo,
    coefVariacao: numero(valorColuna(linha, 'COEF DE VARIAÇÃO REVENDA')),
  }
}

export function parseAnpXlsx(buffer: Buffer): AnpResultadoParsing {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const abasEncontradas = ABAS_ESPERADAS.filter((aba) => Boolean(workbook.Sheets[aba]))
  const abasFaltantes = ABAS_ESPERADAS.filter((aba) => !workbook.Sheets[aba])

  if (abasEncontradas.length === 0) {
    throw new Error('XLSX da ANP não contém nenhuma das cinco abas esperadas.')
  }

  const linhas: AnpLinhaNormalizada[] = []
  let descartadas = 0

  for (const abrangencia of abasEncontradas) {
    const sheet = workbook.Sheets[abrangencia]
    const linhasBrutas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      range: 9,
      defval: null,
    })

    for (const linhaBruta of linhasBrutas) {
      const linha = normalizarLinha(linhaBruta, abrangencia)
      if (linha) linhas.push(linha)
      else descartadas += 1
    }
  }

  if (descartadas > 0) {
    console.warn(`Parser ANP descartou ${descartadas} linha(s) inválida(s).`)
  }

  return {
    linhas,
    abasEncontradas: [...abasEncontradas],
    abasFaltantes: [...abasFaltantes],
    totalLinhas: linhas.length,
  }
}
