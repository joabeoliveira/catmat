'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopiarCodigoButtonProps {
  codigo: number
}

export function CopiarCodigoButton({ codigo }: CopiarCodigoButtonProps) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(String(codigo))
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1200)
    } catch {
      // noop
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copiar}>
      {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copiado ? 'Copiado!' : 'Copiar código'}
    </Button>
  )
}
