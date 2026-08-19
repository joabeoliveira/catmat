'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  resultados: any[]
  carregando?: boolean
  onReload?: () => void
}

export function CatserResults({ resultados, carregando, onReload }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Nenhum resultado. Tente outro termo ou ajuste os filtros.</div>
          ) : (
            <div className="grid gap-3">
              {resultados.map((item) => (
                <div key={item.codigoServico || item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{item.descricao || item.nome || '—'}</div>
                    <div className="text-xs text-slate-500">Código: {item.codigoServico ?? item.codigo ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { if (onReload) onReload() }}>Atualizar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
