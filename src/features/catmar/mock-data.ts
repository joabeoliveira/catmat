export interface CatmatItemSeed {
  codigoItem: number
  codigoGrupo: number
  nomeGrupo: string
  codigoClasse: number
  nomeClasse: string
  codigoPdm: number
  nomePdm: string
  descricaoItem: string
  codigoNcm: string | null
  aplicaMargemPreferencia: boolean
  dataHoraAtualizacao: string
}

export const catmatMockData: CatmatItemSeed[] = [
  {
    codigoItem: 1001,
    codigoGrupo: 70,
    nomeGrupo: 'Informática',
    codigoClasse: 7010,
    nomeClasse: 'Computadores',
    codigoPdm: 501,
    nomePdm: 'Equipamentos de informática',
    descricaoItem: 'Computador desktop de alto desempenho com processador i7',
    codigoNcm: '8471.30.00',
    aplicaMargemPreferencia: true,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1002,
    codigoGrupo: 70,
    nomeGrupo: 'Informática',
    codigoClasse: 7010,
    nomeClasse: 'Computadores',
    codigoPdm: 502,
    nomePdm: 'Equipamentos de informática',
    descricaoItem: 'Notebook ultrafino com tela de 14 polegadas',
    codigoNcm: '8471.41.00',
    aplicaMargemPreferencia: false,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1003,
    codigoGrupo: 93,
    nomeGrupo: 'Papéis',
    codigoClasse: 9310,
    nomeClasse: 'Papéis para impressão',
    codigoPdm: 601,
    nomePdm: 'Materiais gráficos',
    descricaoItem: 'Papel couche A4 115g para impressão offset',
    codigoNcm: '4802.56.10',
    aplicaMargemPreferencia: true,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1004,
    codigoGrupo: 93,
    nomeGrupo: 'Papéis',
    codigoClasse: 9310,
    nomeClasse: 'Papéis para impressão',
    codigoPdm: 602,
    nomePdm: 'Materiais gráficos',
    descricaoItem: 'Papel sulfite A4 75g para impressão comum',
    codigoNcm: '4802.40.90',
    aplicaMargemPreferencia: false,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1005,
    codigoGrupo: 74,
    nomeGrupo: 'Mobiliário',
    codigoClasse: 7410,
    nomeClasse: 'Cadeiras',
    codigoPdm: 701,
    nomePdm: 'Mobiliário de escritório',
    descricaoItem: 'Cadeira ergonômica para escritório com apoio lombar',
    codigoNcm: '9401.20.10',
    aplicaMargemPreferencia: true,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1006,
    codigoGrupo: 74,
    nomeGrupo: 'Mobiliário',
    codigoClasse: 7410,
    nomeClasse: 'Cadeiras',
    codigoPdm: 702,
    nomePdm: 'Mobiliário de escritório',
    descricaoItem: 'Cadeira executiva de couro para ambientes corporativos',
    codigoNcm: '9401.20.20',
    aplicaMargemPreferencia: false,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1007,
    codigoGrupo: 65,
    nomeGrupo: 'Materiais de limpeza',
    codigoClasse: 6510,
    nomeClasse: 'Produtos de higiene',
    codigoPdm: 801,
    nomePdm: 'Produtos de manutenção',
    descricaoItem: 'Desinfetante líquido concentrado para limpeza geral',
    codigoNcm: '3808.94.10',
    aplicaMargemPreferencia: true,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
  {
    codigoItem: 1008,
    codigoGrupo: 65,
    nomeGrupo: 'Materiais de limpeza',
    codigoClasse: 6510,
    nomeClasse: 'Produtos de higiene',
    codigoPdm: 802,
    nomePdm: 'Produtos de manutenção',
    descricaoItem: 'Álcool etílico 70% para higienização de superfícies',
    codigoNcm: '2208.90.00',
    aplicaMargemPreferencia: false,
    dataHoraAtualizacao: '2026-08-05T00:00:00.000Z',
  },
]
