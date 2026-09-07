import { NextRequest, NextResponse } from 'next/server'
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { prisma } from '@/lib/db'
import { calculateContractAdjustment, calculateRetroactive } from '@/lib/contract-adjustments'
import { findIndex } from '@/lib/economic-indexes'

export const dynamic = 'force-dynamic'
const blue = '0F4C81'; const lightBlue = 'EAF3F8'; const gray = '667085'
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
const borders = { top: border, bottom: border, left: border, right: border }
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const date = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value))
const month = (value: Date | string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
const cell = (text: string, bold = false, color = '172B4D') => new TableCell({ borders, children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, bold, font: 'Aptos', size: 20, color })] })] })
const header = (text: string) => new TableCell({ borders, shading: { type: ShadingType.SOLID, fill: blue, color: blue }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 70, after: 70 }, children: [new TextRun({ text, bold: true, font: 'Aptos', size: 19, color: 'FFFFFF' })] })] })
const title = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 140 }, children: [new TextRun({ text, bold: true, font: 'Aptos Display', size: 27, color: blue })] })
const text = (value: string, options?: { bold?: boolean; color?: string; center?: boolean }) => new Paragraph({ alignment: options?.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 120 }, children: [new TextRun({ text: value, font: 'Aptos', size: 21, bold: options?.bold, color: options?.color || '172B4D' })] })

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({})) as { initialIndex?: number; currentIndex?: number; referenceDate?: string; applicationDate?: string }
    const contract = await prisma.contract.findUnique({ where: { id: params.id }, include: { adjustments: { orderBy: { referenceDate: 'desc' }, take: 1 } } })
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
    const calculationRows: [string, string, string][] = [
      ['Índice na data-base (I₀)', initialIndex.toFixed(6), `Referência disponível até ${initialOfficial ? month(initialOfficial.date) : 'informada na simulação'}`],
      ['Índice atual (I)', currentIndex.toFixed(6), `Referência disponível até ${currentOfficial ? month(currentOfficial.date) : 'informada na simulação'}`],
      ['Fator de reajuste', `${calculation.percentage.toFixed(4)}%`, '(I − I₀) / I₀'],
      ['Valor do reajuste (R)', money(calculation.adjustmentValue), 'V × fator'],
      ['NOVO VALOR CONTRATUAL', money(calculation.newValue), 'Valor anterior + reajuste'],
    ]
    const doc = new Document({ creator: 'Consulta CATMAT', title: `Apostilamento - ${contract.contractNumber}`, subject: 'Reajuste contratual', sections: [{ properties: { page: { margin: { top: 900, right: 1050, bottom: 900, left: 1050 } } }, children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'CONSULTA CATMAT', bold: true, font: 'Aptos Display', size: 28, color: blue })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'TERMO DE APOSTILAMENTO', bold: true, font: 'Aptos Display', size: 34, color: blue })] }),
      text('Reajuste em sentido estrito · Lei nº 14.133/2021, art. 136', { center: true, color: gray }),
      new Paragraph({ spacing: { after: 260 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: blue } }, children: [] }),
      text(`Documento gerado em ${date(new Date())}`, { center: true, color: gray }),
      title('1. Identificação do contrato'),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        ['Número do contrato', contract.contractNumber], ['Objeto', contract.description], ['Contratado', contract.supplierName], ['CNPJ/CPF', contract.supplierDocument || 'Não informado'], ['Órgão / UASG', `${contract.organName || 'Não informado'}${contract.uasgCode ? ` / ${contract.uasgCode}` : ''}`], ['Índice de reajuste', contract.indexName], ['Data-base', date(contract.baseDate)], ['Data de referência', date(referenceDate)], ['Valor atual antes do reajuste', money(contract.currentValue)],
      ].map(([label, value]) => new TableRow({ children: [cell(label, true), cell(value)] })) }),
      title('2. Memória de cálculo'),
      text('O reajuste foi calculado pela fórmula R = V × (I − I₀) / I₀, mantendo a precisão dos índices e arredondando somente os valores monetários finais.'),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [header('Parâmetro'), header('Valor'), header('Observação')] }), ...calculationRows.map(([label, value, note]) => new TableRow({ children: [cell(label, true), cell(value, true, label === 'NOVO VALOR CONTRATUAL' ? blue : undefined), cell(note)] }))] }),
      ...(retroactive && retroactive.monthsOverdue > 0 ? [title('3. Retroativos'), text(`Considerando a aplicação em ${date(applicationDate)}, foram identificados ${retroactive.monthsOverdue} mês(es) de retroatividade. O total abaixo não inclui juros ou correção monetária adicional.`), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [header('Competência'), header('Valor pago'), header('Valor reajustado'), header('Diferença')] }), ...retroactive.breakdown.map((item) => new TableRow({ children: [cell(item.month), cell(money(item.originalValue)), cell(money(item.adjustedValue)), cell(money(item.difference), true, 'B42318')] })), new TableRow({ children: [cell('TOTAL RETROATIVO', true), cell(''), cell(''), cell(money(retroactive.totalRetroactive), true, 'B42318')] })] })] : []),
      title(retroactive && retroactive.monthsOverdue > 0 ? '4. Fundamentação e providências' : '3. Fundamentação e providências'),
      text('O presente apostilamento formaliza o reajuste previsto contratualmente, sem alteração do objeto, com fundamento no art. 136 da Lei nº 14.133/2021. A memória de cálculo deve ser conferida pelo gestor e juntada ao processo administrativo.'),
      new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: 'Local e data: ________________________________________________', font: 'Aptos', size: 21 })] }),
      new Paragraph({ spacing: { before: 650 }, children: [new TextRun({ text: '____________________________________________________________', font: 'Aptos', size: 21 })] }),
      text('Responsável pela gestão/fiscalização do contrato', { center: true, color: gray }),
    ] }] })
    const buffer = await Packer.toBuffer(doc)
    const filename = `Apostilamento_${contract.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.docx`
    return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(buffer.byteLength) } })
  } catch (error) { console.error('[Apostila]', error); return NextResponse.json({ message: error instanceof Error ? error.message : 'Erro ao gerar apostilamento.' }, { status: 500 }) }
}
