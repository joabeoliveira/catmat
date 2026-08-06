import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://catmat.com.br'),
  title: {
    template: '%s | Consulta CATMAT',
    default: 'Consulta CATMAT — Catálogo de Materiais e Preços Públicos',
  },
  description: 'Consulta avançada para grade padronizada de CATMAT/CATSER com preços públicos e filtros de compatibilidade.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Consulta CATMAT — Catálogo de Materiais e Preços Públicos',
    description: 'Pesquise materiais CATMAT com compatibilidade, grade de cotação e filtros públicos.',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Consulta CATMAT — Catálogo de Materiais e Preços Públicos',
    description: 'Pesquise materiais CATMAT com compatibilidade, grade de cotação e filtros públicos.',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
