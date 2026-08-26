'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TcePrPrecosTable } from '@/components/tcepr/TcePrPrecosTable'
import type { TcePrBuscaResponse } from '@/features/tcepr/tcepr.types'

interface Props {
  data: TcePrBuscaResponse | null
  isLoading: boolean
  error: string | null
  pagina: number
  onPagina: (pagina: number) => void
  onTentarNovamente: () => void
}

export function TcePrResults({ data, isLoading, error, pagina, onPagina, onTentarNovamente }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-700 dark:text-slate-300">
          <p>{error}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onTentarNovamente}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
          <p>
            Digite um termo ou aplique filtros para pesquisar itens de licitações homologadas no TCE-PR.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data.items.length) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
          <p>Nenhum resultado encontrado. Tente outro termo ou ajuste os filtros.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Encontrados <strong>{data.total}</strong> resultado{data.total === 1 ? '' : 's'} · página{' '}
        {data.pagina} de {data.totalPaginas}
        {data.apenasVencedores ? ' · somente vencedores' : ' · todas as propostas'}
      </p>

      <TcePrPrecosTable items={data.items} metricas={data.metricas} />

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Página {data.pagina} de {data.totalPaginas}
        </span>
        <Button variant="outline" disabled={data.pagina >= data.totalPaginas} onClick={() => onPagina(pagina + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  )
}
