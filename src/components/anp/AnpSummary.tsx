import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AnpResumoProduto = {
  produto: string
  unidade: string
  precoMedio: number
  precoMinimo: number
  precoMaximo: number
}

type AnpSummaryProps = {
  semana: { dataInicio: string; dataFim: string } | null
  resumo: {
    produtos: AnpResumoProduto[]
    totalLocalidades: number
    totalProdutos: number
  } | null
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatarData(data: string): string {
  const valor = new Date(data)
  return Number.isNaN(valor.getTime())
    ? '—'
    : valor.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function mediaNacional(resumo: AnpSummaryProps['resumo']): string {
  if (!resumo?.produtos.length) return '—'

  const valores = resumo.produtos
    .map((produto) => produto.precoMedio)
    .filter((valor) => Number.isFinite(valor))

  if (!valores.length) return '—'
  return moeda.format(valores.reduce((total, valor) => total + valor, 0) / valores.length)
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold text-slate-900 dark:text-white">{valor}</p>
      </CardContent>
    </Card>
  )
}

export function AnpSummary({ semana, resumo }: AnpSummaryProps) {
  const periodo = semana
    ? `${formatarData(semana.dataInicio)} a ${formatarData(semana.dataFim)}`
    : '—'

  return (
    <section aria-label="Resumo dos preços ANP" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ResumoCard titulo="Período da semana" valor={periodo} />
      <ResumoCard titulo="Produtos" valor={resumo ? String(resumo.totalProdutos) : '—'} />
      <ResumoCard titulo="Localidades" valor={resumo ? String(resumo.totalLocalidades) : '—'} />
      <ResumoCard titulo="Preço médio nacional" valor={mediaNacional(resumo)} />
    </section>
  )
}
