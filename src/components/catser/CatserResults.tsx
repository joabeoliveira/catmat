'use client'

import { useState } from 'react'
import { ChevronUp, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CatserPrecosPanel } from '@/components/catser/CatserPrecosPanel'
import type { CatserBuscaResponse } from '@/features/catser/catser.types'

interface Props {
  data: CatserBuscaResponse | null
  isLoading: boolean
  error: string | null
  pagina: number
  onPagina: (pagina: number) => void
  onTentarNovamente: () => void
}

export function CatserResults({ data, isLoading, error, pagina, onPagina, onTentarNovamente }: Props) {
  const [precosAbertos, setPrecosAbertos] = useState<Record<number, boolean>>({})

  function alternarPrecos(codigoServico: number) {
    setPrecosAbertos((prev) => ({ ...prev, [codigoServico]: !prev[codigoServico] }))
  }

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
          <p>Digite um termo acima para pesquisar no catálogo CATSER — por descrição do serviço.</p>
        </CardContent>
      </Card>
    )
  }

  if (!data.items.length) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-400">
          <p>Nenhum resultado encontrado para o termo informado. Tente outro termo.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Encontrados <strong>{data.total}</strong> resultados · página {data.pagina} de {data.totalPaginas}
      </p>

      {data.items.map((item) => {
        const precoAberto = !!precosAbertos[item.codigoServico]
        return (
          <Card key={item.codigoServico}>
            <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.codigoServico}</Badge>
                  {item.statusServico ? (
                    <Badge variant="secondary">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <p className="font-medium text-slate-900 dark:text-white">{item.nomeServico}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span>{item.codigoGrupo} - {item.nomeGrupo}</span>
                  <span>/</span>
                  <span>{item.codigoClasse} - {item.nomeClasse}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.compatibilidade !== undefined ? (
                  <Badge className="border-emerald-500/40 bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300">
                    {item.compatibilidade}% compatível
                  </Badge>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => alternarPrecos(item.codigoServico)}>
                  {precoAberto ? (
                    <ChevronUp className="mr-2 h-4 w-4" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  {precoAberto ? 'Fechar preços' : 'Consultar preços'}
                </Button>
              </div>
            </CardContent>

            {precoAberto ? (
              <div className="border-t border-slate-200 dark:border-slate-800">
                <CatserPrecosPanel servico={item} />
              </div>
            ) : null}
          </Card>
        )
      })}

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
