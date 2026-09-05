import type { Metadata } from 'next'
import { ArpSearch } from '@/components/arp/ArpSearch'

export const metadata: Metadata = {
  title: 'Busca ARP Inteligente',
  description: 'Busque Atas de Registro de Preços vigentes e oportunidades de adesão.',
}

export default function ArpPage() { return <ArpSearch /> }
