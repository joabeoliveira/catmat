'use client'

import { useState } from 'react'

export interface BuscaRequest {
  termo: string
  filtros?: {
    codigoGrupo?: number[]
    codigoClasse?: number[]
    codigoPdm?: number[]
    statusItem?: boolean
    aplicaMargemPreferencia?: boolean
  }
  pagina?: number
  limite?: number
}

export interface BuscaItem {
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

export interface BuscaResponse {
  items: BuscaItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos?: {
    grupos: number[]
    classes: number[]
  }
}

export function useBuscaItens() {
  const [data, setData] = useState<BuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mutate = async (params: BuscaRequest) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/catmat/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Falha ao buscar itens')
      }

      const result = await response.json()
      setData(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, mutate }
}
