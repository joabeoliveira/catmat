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
  historicoPrecos?: {
    quantidadeCompras: number
    periodoFim: string | null
    atualizadoEm: string
  } | null
}

export interface BuscaResponse {
  items: BuscaItem[]
  total: number
  pagina: number
  totalPaginas: number
  filtrosSugeridos?: {
    grupos: Array<{ codigo: number; nome: string; quantidade: number }>
    classes: Array<{ codigo: number; nome: string; quantidade: number }>
    pdms: Array<{ codigo: number; nome: string; quantidade: number }>
  }
  contagens?: {
    exato: number
    alta: number
    similar: number
  }
}

export interface UseBuscaItensOptions {
  initialData?: BuscaResponse | null
}

export function useBuscaItens(initialData?: BuscaResponse | null) {
  const [data, setData] = useState<BuscaResponse | null>(initialData ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const mutate = async (params: BuscaRequest) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const query = new URLSearchParams({
      q: params.termo || '',
      pagina: String(params.pagina || 1),
      limite: String(params.limite || 20),
    })

    if (params.filtros?.codigoGrupo?.length) {
      params.filtros.codigoGrupo.forEach((value) => query.append('grupo', String(value)))
    }
    if (params.filtros?.codigoClasse?.length) {
      params.filtros.codigoClasse.forEach((value) => query.append('classe', String(value)))
    }
    if (params.filtros?.codigoPdm?.length) {
      params.filtros.codigoPdm.forEach((value) => query.append('pdm', String(value)))
    }
    if (params.filtros?.aplicaMargemPreferencia !== undefined) {
      query.set('aplicaMargemPreferencia', String(params.filtros.aplicaMargemPreferencia))
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/catmat/buscar?${query.toString()}`, {
        method: 'GET',
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
