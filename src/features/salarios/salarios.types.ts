// Tipos compartilhados do módulo Salários (CBO/INPC) — frontend e API

export const ANOS_SALARIOS = [2023, 2024, 2025, 2026] as const
export type AnoSalario = (typeof ANOS_SALARIOS)[number]

export interface SalarioFiltros {
  uf?: string
  ano?: AnoSalario
  /** Aplica a correção monetária (INPC) até o mês atual. */
  aplicarInpc?: boolean
  grandeGrupo?: string
  subgrupoPrincipal?: string
  familia?: string
  palavrasObrigatorias?: string
  palavrasExcluidas?: string
  salarioMinimo?: number
  salarioMaximo?: number
  minimoUfs?: number
  referenciaSalarial?: ReferenciaSalarial
  ordenarPor?: OrdenacaoSalarios
}

export type ReferenciaSalarial = 'mediana' | 'media' | 'p25' | 'p75'
export type OrdenacaoSalarios = 'relevancia' | 'salario_asc' | 'salario_desc' | 'ufs_desc' | 'amplitude_asc' | 'titulo'
export type TipoCorrespondencia = 'codigo' | 'titulo' | 'sinonimo' | 'hierarquia' | 'perfil' | 'geral'
export type NivelConfianca = 'alta' | 'media' | 'baixa'

export interface SalarioBuscaParams {
  termo: string
  pagina?: number
  limite?: number
  filtros?: SalarioFiltros
}

export interface EstatisticasSalario {
  menor: number | null
  media: number | null
  mediana: number | null
  maior: number | null
  /** Quantidade de UFs com valor positivo no ano selecionado. */
  ufCount: number
}

export interface SalarioCard {
  cbo: number
  titulo: string
  tituloOficial?: string
  ufCount: number
  /** Valores exibidos (corrigidos pelo INPC quando aplicarInpc=true). */
  estatisticas: EstatisticasSalario
  /** Presente quando aplicarInpc=true — estatísticas com os valores originais do CSV. */
  estatisticasOriginal?: EstatisticasSalario
  hierarquia?: SalarioHierarquia
  percentis?: SalarioPercentis
  sinonimos?: string[]
  correspondencia?: {
    tipo: TipoCorrespondencia
    descricao: string
    termoEncontrado?: string
    aderencia: number
  }
  qualidade?: {
    confianca: NivelConfianca
    amplitude: number | null
    amplitudePercentual: number | null
  }
}

export type CriterioSalarioGrade = 'p25' | 'mediana' | 'media' | 'p75' | 'personalizado'

/** Linha escolhida pelo usuário para compor sua estimativa de postos de trabalho. */
export interface SalarioGradeItem extends SalarioCard {
  quantidade: number
  criterioReferencia: CriterioSalarioGrade
  salarioReferencia: number | null
  observacao?: string
}

export interface SalarioHierarquia {
  grandeGrupo?: string | null
  subgrupoPrincipal?: string | null
  familia?: string | null
  perfilOcupacional?: string | null
  fonte?: string | null
}

export interface SalarioPercentis {
  observacoes: number
  p10: number | null
  p25: number | null
  p50: number | null
  p75: number | null
  p90: number | null
  media: number | null
  minimo: number | null
  maximo: number | null
}

export interface SalarioBuscaResponse {
  items: SalarioCard[]
  total: number
  pagina: number
  totalPaginas: number
  ano: AnoSalario
  aplicarInpc: boolean
  /** Fator aplicado (1 quando não corrige). */
  fatorInpc: number
}

export interface SalarioSugestao {
  cbo: number
  titulo: string
}

export interface SalarioUf {
  uf: string
  estado: string
}

export interface SalarioValorUf {
  uf: string
  estado: string
  salario: number | null
}

export interface SalarioDetalheResponse {
  cbo: number
  titulo: string
  ano: AnoSalario
  aplicarInpc: boolean
  fatorInpc: number
  estatisticas: EstatisticasSalario
  valoresPorUf: SalarioValorUf[]
  hierarquia?: SalarioHierarquia
  sinonimos: string[]
  historico: Array<{ ano: number; uf: string; estado: string; salario: number }>
  percentis: Array<SalarioPercentis & { ano: number }>
}

export interface SalarioHierarquiaOpcao {
  grandeGrupo: string
  grandeGrupoCodigo?: string
  subgrupoPrincipal: string
  subgrupoPrincipalCodigo?: string
  familia: string
  familiaCodigo?: string
}
