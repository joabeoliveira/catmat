'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Props {
  onChange?: (filters?: Record<string, any>) => void
}

export function CatserFiltros({ onChange }: Props) {
  const [uf, setUf] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  function aplicar() {
    if (onChange) onChange({ uf, dataInicio, dataFim })
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <Select value={uf} onValueChange={(v) => setUf(String(v))} className="w-40">
        <option value="">UF</option>
        <option value="SP">SP</option>
        <option value="RJ">RJ</option>
        <option value="MG">MG</option>
      </Select>
      <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
      <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      <button type="button" className="rounded bg-cyan-600 px-3 py-1 text-white" onClick={aplicar}>Aplicar</button>
    </div>
  )
}
