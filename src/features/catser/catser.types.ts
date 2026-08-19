// Tipos compartilhados do módulo CATSER (frontend e API)

export interface CatserItem {
  codigoItem: number
  codigoGrupo: number
  nomeGrupo: string
  codigoClasse: string
  nomeClasse: string
  codigoServico: number
  nomeServico: string
  statusServico: boolean
  compatibilidade: number
}

export interface CatserFacet {
  codigo: number | string
  nome: string
  quantidade: number
}

export interface CatserBuscaResponse {
  items: CatserItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos: {
    grupos: CatserFacet[]
    classes: CatserFacet[]
  }
}

export interface CatserPrecoItem {
  idCompra: string | null
  idItemCompra: number | null
  forma: string | null
  modalidade: number | null
  criterioJulgamento: string | null
  numeroItemCompra: number | null
  descricaoItem: string
  codigoItemCatalogo: number | null
  nomeUnidadeMedida: string | null
  siglaUnidadeMedida: string | null
  quantidade: number | null
  precoUnitario: number | null
  percentualMaiorDesconto: number | null
  niFornecedor: string | null
  nomeFornecedor: string | null
  codigoUasg: string | null
  nomeUasg: string | null
  codigoMunicipio: number | null
  municipio: string | null
  estado: string | null
  codigoOrgao: number | null
  nomeOrgao: string | null
  poder: string | null
  esfera: string | null
  dataCompra: string | null
  objetoCompra: string | null
  descricaoDetalhadaItem: string | null
  /** Link direto no PNCP (editais/{cnpj}/{ano}/{numero}), quando resolvível. */
  linkPncp?: string | null
  /** Link de auditoria da compra no PNCP (resolução oficial) ou fallback textual. */
  link_evidencia?: string | null
}

export interface CatserMetricas {
  quantidade: number
  menor: number | null
  media: number | null
  mediana: number | null
  maior: number | null
}

export interface CatserPrecosResponse {
  codigoServico: number
  itens: CatserPrecoItem[]
  totalRegistros: number
  totalPaginas: number
  paginasRestantes: number
  metricas: CatserMetricas
}
