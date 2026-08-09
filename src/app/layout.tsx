import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { SiteHeader } from '@/components/shared/SiteHeader'
import { SiteFooter } from '@/components/shared/SiteFooter'
import { getSiteUrl } from '@/lib/site-config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura (evita flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('catmat:tema')==='light'){document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950`}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
