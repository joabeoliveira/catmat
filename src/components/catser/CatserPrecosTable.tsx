'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  metricas?: Record<string, any>
}

export function CatserPrecosTable({ metricas }: Props) {
  if (!metricas) {
    return null
  }

  const format = (v: number | null | undefined) => (typeof v === 'number' ? `R$ ${v.toFixed(2)}` : '—')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de preço</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Média</div>
            <div className="font-medium">{format(metricas.media)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Mediana</div>
            <div className="font-medium">{format(metricas.mediana)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Menor</div>
            <div className="font-medium">{format(metricas.min)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Maior</div>
            <div className="font-medium">{format(metricas.max)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
