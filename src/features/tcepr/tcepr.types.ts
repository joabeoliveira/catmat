// Tipos compartilhados do módulo TCE-PR — frontend e API
// Fonte: XMLs de licitações municipais homologadas no TCE-PR (LicitacaoVencedor).

export type OrdenacaoTcePr =
  | 'relevancia'
  | 'preco_asc'
  | 'preco_desc'
  | 'data_desc'
  | 'data_asc'
  | 'municipio'

export const ORDENACOES_TCEPR: OrdenacaoTcePr[] = [
  'relevancia',
  'preco_asc',
  'preco_desc',
  'data_desc',
  'data_asc',
  'municipio',
]

export interface TcePrFiltros {
  /** Código IBGE do município (7 dígitos). */
  cdIbge?: string
  /** Nome do município (busca parcial). */
  municipio?: string
  /** Palavras obrigatórias para refinar a busca no descritivo do item (todas devem aparecer). */
  refinar?: string
  /** Modalidade da licitação (ex.: Pregão, Processo Dispensa). */
  modalidade?: string
  /** Ano da licitação. */
  anoLicitacao?: number
  /** Data inicial de homologação (YYYY-MM-DD). */
  dtHomologacaoInicio?: string
  /** Data final de homologação (YYYY-MM-DD). */
  dtHomologacaoFim?: string
  /** Nome do fornecedor (busca parcial). */
  fornecedor?: string
  /** CNPJ/CPF do fornecedor. */
  nrDocumento?: string
  /** Se true (default), retorna apenas nrClassificacao = 1 (vencedores). */
  apenasVencedores?: boolean
  /** Preço mínimo (vlLicitacaoVencedor). */
  valorMin?: number
  /** Preço máximo (vlLicitacaoVencedor). */
  valorMax?: number
  /** Ordenação dos resultados. */
  ordenarPor?: OrdenacaoTcePr
}

export interface TcePrBuscaParams {
  termo: string
  pagina?: number
  limite?: number
  filtros?: TcePrFiltros
}

export interface TcePrItem {
  id: number
  cdIbge: string | null
  nmMunicipio: string
  idPessoa: number | null
  nmEntidade: string
  idLicitacao: number
  nrAnoLicitacao: number | null
  nrLicitacao: number | null
  dsModalidadeLicitacao: string
  dtHomologacao: string | null
  nrDocumento: string
  nmPessoa: string
  nrLote: number
  nrItem: number
  dsItem: string
  idUnidadeMedida: number | null
  dsUnidadeMedida: string | null
  nrQuantidade: number | null
  vlMinimoUnitarioItem: number | null
  vlMinimoTotal: number | null
  vlMaximoUnitarioItem: number | null
  vlMaximoTotal: number | null
  nrQuantidadeProposta: number | null
  vlPropostaItem: number | null
  nrQuantidadeVencedor: number | null
  vlLicitacaoVencedor: number | null
  nrClassificacao: number
  dsFormaPagamento: string | null
  nrPrazoLimiteEntrega: number | null
  idTipoEntregaProduto: number | null
  dsTipoEntregaProduto: string | null
  dtValidadeProposta: string | null
  dtPrazoEntregaProposta: string | null
  ultimoEnvioSimam: string | null
  dataReferencia: string | null
  /** Pontuação de relevância (0 quando não há termo). */
  score: number
  /** Aderência 0–100 ao termo pesquisado. */
  compatibilidade: number
  /** Link para o processo licitatório no portal TCE-PR (PIT). */
  linkTcePr: string | null
}

export interface TcePrMetricas {
  quantidade: number
  menor: number | null
  media: number | null
  mediana: number | null
  maior: number | null
}

export interface TcePrFacet {
  valor: string
  quantidade: number
}

export interface TcePrFiltrosSugeridos {
  municipios: TcePrFacet[]
  modalidades: TcePrFacet[]
  anos: TcePrFacet[]
  fornecedores: TcePrFacet[]
}

export interface TcePrBuscaResponse {
  items: TcePrItem[]
  total: number
  pagina: number
  totalPaginas: number
  metricas: TcePrMetricas | null
  filtrosSugeridos: TcePrFiltrosSugeridos
  apenasVencedores: boolean
}
