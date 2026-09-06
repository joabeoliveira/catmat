'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'

export function CnpjLink({ cnpj }: { cnpj?: string | null }) {
  const digits = String(cnpj || '').replace(/\D/g, '')
  if (digits.length !== 14) return <>{cnpj || 'Não informado'}</>
  return <span className="inline-flex items-center gap-2"><span>{digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</span><Link href={`/cnpj?cnpj=${digits}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-300" aria-label={`Consultar CNPJ ${digits}`}><Search className="h-3.5 w-3.5" />Consultar</Link></span>
}
