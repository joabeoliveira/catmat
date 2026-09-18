// Tipos compartilhados do módulo ANP.

export type AnpAbrangencia = 'CAPITAIS' | 'MUNICIPIOS' | 'ESTADOS' | 'REGIOES' | 'BRASIL'

export type AnpProduto =
  | 'ETANOL_HIDRATADO'
  | 'GASOLINA_COMUM'
  | 'GASOLINA_ADITIVADA'
  | 'OLEO_DIESEL'
  | 'OLEO_DIESEL_S10'
  | 'GLP'
  | 'GNV'

export type AnpUnidade = 'LITRO' | 'TREZE_KG' | 'METRO_CUBICO'

export type AnpImportacaoStatus = 'PENDENTE' | 'PROCESSANDO' | 'SUCESSO' | 'ERRO'

export type AnpLinhaNormalizada = {
  abrangencia: AnpAbrangencia
  produto: AnpProduto
  unidade: AnpUnidade
  localidade: string
  estado: string | null
  municipio: string | null
  regiao: string | null
  postosPesquisados: number
  precoMedio: number
  desvioPadrao: number | null
  precoMinimo: number
  precoMaximo: number
  coefVariacao: number | null
}

export type AnpResultadoParsing = {
  linhas: AnpLinhaNormalizada[]
  abasEncontradas: string[]
  abasFaltantes: string[]
  totalLinhas: number
}

export type AnpFiltros = {
  semanaId?: string
  dataInicio?: string
  dataFim?: string
  abrangencia?: AnpAbrangencia
  produto?: AnpProduto
  unidade?: AnpUnidade
  estado?: string
  municipio?: string
  regiao?: string
  pagina?: number
  limite?: number
}

export type AnpResumoSincronizacao = {
  semanaId: string
  dataInicio: string
  dataFim: string
  objectKey: string
  hashSha256: string
  tamanhoBytes: number
  linhasLidas: number
  precosGravados: number
  status: AnpImportacaoStatus
}
