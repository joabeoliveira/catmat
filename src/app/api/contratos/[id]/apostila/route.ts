import { NextRequest, NextResponse } from 'next/server'
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { prisma } from '@/lib/db'
import { calculateContractAdjustment, calculateRetroactive } from '@/lib/contract-adjustments'
import { findIndex } from '@/lib/economic-indexes'

export const dynamic = 'force-dynamic'

const blue = '0F4C81'
const gray = '667085'
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
const borders = { top: border, bottom: border, left: border, right: border }
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const date = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value))
const month = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(value))

const cell = (value: string, bold = false, color = '172B4D') => new TableCell({
  borders,
  children: [new Paragraph({ spacing: { before: 70, after: 70 }, children: [new TextRun({ text: value, bold, font: 'Aptos', size: 20, color })] })],
})

const header = (value: string) => new TableCell({
  borders,
  shading: { type: ShadingType.SOLID, fill: blue, color: blue },
  children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [new TextRun({ text: value, bold: true, font: 'Aptos', size: 19, color: 'FFFFFF' })] })],
})

const heading = (value: string) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  keepNext: true,
  children: [new TextRun({ text: value, bold: true, font: 'Aptos Display', size: 27, color: blue })],
})

const paragraph = (value: string, options?: { bold?: boolean; color?: string; center?: boolean }) => new Paragraph({
  alignment: options?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  spacing: { after: 140, line: 276 },
  children: [new TextRun({ text: value, font: 'Aptos', size: 21, bold: options?.bold, color: options?.color || '172B4D' })],
})

const clause = (number: number, title: string, value: string) => [heading(`${number}. CLÁUSULA ${title}`), paragraph(value)]

function formatOrganizationName(name: string, cnpj?: string | null) {
  return `${name}${cnpj ? `, inscrito(a) no CNPJ nº ${cnpj}` : ''}`
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({})) as { initialIndex?: number; currentIndex?: number; referenceDate?: string; applicationDate?: string }
    const contract = await prisma.contract.findUnique({
      where: { id: params.id },
      include: { organization: true, adjustments: { orderBy: { referenceDate: 'desc' }, take: 1 } },
    })
    if (!contract) return NextResponse.json({ message: 'Contrato não encontrado.' }, { status: 404 })

    const referenceDate = body.referenceDate ? new Date(body.referenceDate) : contract.nextAdjustment
    const [initialOfficial, currentOfficial] = await Promise.all([findIndex(contract.indexName, contract.baseDate), findIndex(contract.indexName, referenceDate)])
    const initialIndex = body.initialIndex || Number(initialOfficial?.value || contract.adjustments[0]?.initialIndex || 0)
    const currentIndex = body.currentIndex || Number(currentOfficial?.value || contract.adjustments[0]?.appliedIndex || 0)
    const calculation = calculateContractAdjustment({ currentValue: contract.currentValue, initialIndex, currentIndex, baseDate: contract.baseDate, referenceDate })
    if (!calculation.valid) return NextResponse.json({ message: calculation.message }, { status: 422 })

    const applicationDate = body.applicationDate ? new Date(body.applicationDate) : new Date()
    const monthlyValue = contract.currentValue / 12
    const retroactive = applicationDate > referenceDate ? calculateRetroactive({ monthlyValue, factor: calculation.factor, dueDate: referenceDate, applicationDate }) : null
    const hasRetroactive = Boolean(retroactive && retroactive.monthsOverdue > 0)
    const organization = contract.organization
    const organLocation = organization?.city && organization.state ? `${organization.city}/${organization.state}` : organization?.city || organization?.state || ''
    const organIdentification = organization ? `${formatOrganizationName(organization.name, organization.cnpj)}${organLocation ? `, com sede em ${organLocation}` : ''}` : contract.organName || 'órgão contratante não informado'
    const indexPeriod = `${date(contract.baseDate)} a ${date(referenceDate)}`

    const calculationTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [header('Parâmetro'), header('Valor'), header('Como foi obtido')] }),
        new TableRow({ children: [cell('Índice na data-base (I₀)', true), cell(initialIndex.toFixed(6)), cell(initialOfficial ? `Série oficial disponível em ${month(initialOfficial.date)}` : 'Valor informado na simulação')] }),
        new TableRow({ children: [cell('Índice na data de referência (I)', true), cell(currentIndex.toFixed(6)), cell(currentOfficial ? `Série oficial disponível em ${month(currentOfficial.date)}` : 'Valor informado na simulação')] }),
        new TableRow({ children: [cell('Fator de reajuste', true), cell(`${calculation.percentage.toFixed(4)}%`), cell('(I - I₀) / I₀')] }),
        new TableRow({ children: [cell('Valor do reajuste', true), cell(money(calculation.adjustmentValue), true), cell('Valor contratual anterior x fator')] }),
        new TableRow({ children: [cell('Novo valor contratual', true, blue), cell(money(calculation.newValue), true, blue), cell('Valor anterior + valor do reajuste', true)] }),
      ],
    })

    const valueTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [header('Descrição'), header('Antes do reajuste'), header('Após o reajuste'), header('Variação')] }),
        new TableRow({ children: [cell('Valor contratual anual', true), cell(money(contract.currentValue)), cell(money(calculation.newValue)), cell(money(calculation.adjustmentValue), true, 'B42318')] }),
        new TableRow({ children: [cell('Valor mensal estimado', true), cell(money(monthlyValue)), cell(money(calculation.newValue / 12)), cell(money(calculation.adjustmentValue / 12), true, 'B42318')] }),
      ],
    })

    const retroactiveChildren = hasRetroactive && retroactive ? [
      ...clause(4, 'DOS VALORES RETROATIVOS', `Em razão de o reajuste ter como data de referência ${date(referenceDate)} e de sua aplicação ocorrer em ${date(applicationDate)}, são devidos valores retroativos correspondentes a ${retroactive.monthsOverdue} competência(s), no total de ${money(retroactive.totalRetroactive)}. O cálculo considera a diferença entre o valor mensal anterior e o valor mensal reajustado em cada competência indicada abaixo.`),
      paragraph('A tabela apresenta a memória de cálculo de forma aberta. O total não inclui juros, multa ou correção monetária adicional, que somente poderão ser apurados se houver previsão legal, contratual ou determinação administrativa específica.'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [header('Competência'), header('Valor mensal anterior'), header('Valor mensal reajustado'), header('Diferença devida')] }),
          ...retroactive.breakdown.map((item) => new TableRow({ children: [cell(item.month), cell(money(item.originalValue)), cell(money(item.adjustedValue)), cell(money(item.difference), true, 'B42318')] })),
          new TableRow({ children: [cell('TOTAL RETROATIVO', true), cell(''), cell(''), cell(money(retroactive.totalRetroactive), true, 'B42318')] }),
        ],
      }),
      paragraph('O pagamento do retroativo deverá observar a liquidação da despesa, a conferência da execução contratual e a disponibilidade orçamentária do órgão contratante.'),
    ] : []

    const firstLaterClause = hasRetroactive ? 5 : 4
    const doc = new Document({
      creator: 'Consulta CATMAT',
      title: `Termo de Apostilamento - Contrato ${contract.contractNumber}`,
      subject: 'Reajuste contratual',
      sections: [{
        properties: { page: { margin: { top: 900, right: 1050, bottom: 900, left: 1050 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: organization?.name || 'ÓRGÃO CONTRATANTE', bold: true, font: 'Aptos Display', size: 28, color: blue })] }),
          organization?.cnpj ? paragraph(`CNPJ nº ${organization.cnpj}${organization.uasgCode ? ` · UASG ${organization.uasgCode}` : ''}`, { center: true, color: gray }) : paragraph(organization?.uasgCode ? `UASG ${organization.uasgCode}` : '', { center: true, color: gray }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 100 }, children: [new TextRun({ text: 'TERMO DE APOSTILAMENTO', bold: true, font: 'Aptos Display', size: 34, color: blue })] }),
          paragraph(`Reajuste contratual - Contrato nº ${contract.contractNumber}`, { center: true, color: gray }),
          new Paragraph({ spacing: { after: 260 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: blue } }, children: [] }),
          paragraph(`O ${organIdentification}, doravante denominado CONTRATANTE, e ${contract.supplierName}${contract.supplierDocument ? `, inscrito(a) no CNPJ/CPF nº ${contract.supplierDocument}` : ''}, doravante denominado(a) CONTRATADO(A), resolvem formalizar o presente Termo de Apostilamento ao Contrato nº ${contract.contractNumber}, cujo objeto é ${contract.description}, com fundamento na previsão contratual de reajuste e no art. 136 da Lei nº 14.133/2021, mediante as cláusulas seguintes.`),
          ...clause(1, 'DO OBJETO', `O presente Termo de Apostilamento tem por objeto formalizar o reajuste do valor contratual pela variação do índice ${contract.indexName} no período de ${indexPeriod}, conforme a data-base registrada no contrato e a memória de cálculo deste instrumento.`),
          ...clause(2, 'DO FUNDAMENTO E DA METODOLOGIA', 'O reajuste observa o interregno mínimo de doze meses e foi calculado pela fórmula R = V x (I - I₀) / I₀, em que V é o valor contratual anterior, I₀ é o índice na data-base e I é o índice na data de referência. Os índices utilizados são identificados na memória de cálculo e devem ser conferidos no processo administrativo.'),
          ...clause(3, 'DO VALOR E DOS PREÇOS', `O valor contratual anterior era de ${money(contract.currentValue)} e, após a aplicação do reajuste de ${calculation.percentage.toFixed(4)}%, passa a ser de ${money(calculation.newValue)}. A diferença decorrente do reajuste é de ${money(calculation.adjustmentValue)}. Os valores abaixo apresentam o impacto anual e a estimativa mensal, considerando doze meses.`),
          valueTable,
          heading('Memória de cálculo'),
          paragraph('A memória de cálculo detalha os índices, a fórmula aplicada e os valores resultantes, permitindo a conferência de cada etapa do reajuste.'),
          calculationTable,
          ...retroactiveChildren,
          ...clause(firstLaterClause, 'DA DOTAÇÃO ORÇAMENTÁRIA', 'As despesas decorrentes deste reajuste correrão à conta da dotação orçamentária própria do órgão contratante. O empenho e os documentos de liquidação deverão ser juntados ao processo administrativo, observadas a disponibilidade orçamentária e as regras aplicáveis ao exercício financeiro.'),
          ...clause(firstLaterClause + 1, 'DA RATIFICAÇÃO', 'Ficam ratificadas as demais cláusulas e condições do contrato original e de seus aditivos que não tenham sido alteradas por este Termo de Apostilamento.'),
          ...clause(firstLaterClause + 2, 'DA PUBLICAÇÃO E DA EFICÁCIA', 'O presente Termo de Apostilamento produzirá efeitos a partir da data definida no processo administrativo, sem prejuízo da observância das providências de publicidade e divulgação exigidas pela legislação aplicável.'),
          paragraph('E, para que produza seus efeitos jurídicos e administrativos, o presente instrumento é firmado pelo representante competente do CONTRATANTE, com ciência do(a) CONTRATADO(A), quando exigida pelo procedimento do órgão.', { bold: true }),
          new Paragraph({ spacing: { before: 550 }, children: [new TextRun({ text: 'Local e data: ________________________________________________', font: 'Aptos', size: 21 })] }),
          new Paragraph({ spacing: { before: 700 }, children: [new TextRun({ text: '____________________________________________________________', font: 'Aptos', size: 21 })] }),
          paragraph('Representante competente do órgão contratante', { center: true, color: gray }),
          new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: 'Ciente:', bold: true, font: 'Aptos', size: 21 })] }),
          new Paragraph({ spacing: { before: 450 }, children: [new TextRun({ text: '____________________________________________________________', font: 'Aptos', size: 21 })] }),
          paragraph(`${contract.supplierName}${contract.supplierDocument ? ` - CNPJ/CPF nº ${contract.supplierDocument}` : ''}`, { center: true, color: gray }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = `Apostilamento_${contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.docx`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('[Apostila]', error)
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Erro ao gerar apostilamento.' }, { status: 500 })
  }
}
