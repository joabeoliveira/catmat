export interface MedicamentoCatmatItem {
  id: number
  codigoBr: string
  catmat: string
  principioAtivo: string
  concentracao: string
  formaFarmaceutica: string
  unidadeFornecimento: string
  compatibilidade: number
}

export interface MedicamentosBuscaResponse {
  items: MedicamentoCatmatItem[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
}
