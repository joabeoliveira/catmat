'use client'

import { useEffect, useRef, useState } from 'react'

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
  compatibilidade?: number
  faixa?: 'exato' | 'alta' | 'similar'
}

export interface BuscaResponse {
  items: BuscaItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos?: {
    grupos: Array<{ codigo: number; nome: string; quantidade: number }>
    classes: Array<{ codigo: number; nome: string; quantidade: number }>
  }
  contagens?: {
    exato: number
    alta: number
    similar: number
  }
}

export function useBuscaItens() {
  const [data, setData] = useState<BuscaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const mutate = async (params: BuscaRequest) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/catmat/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Falha ao buscar itens')
      }

      const result = await response.json()
      if (!controller.signal.aborted) {
        setData(result)
      }
      return result
    } catch (err) {
      if (controller.signal.aborted) {
        return null
      }
      setError('Não foi possível concluir a busca. Tente novamente.')
      throw err
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  return { data, isLoading, error, mutate }
}
