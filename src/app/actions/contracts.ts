'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { calculateContractAdjustment } from '@/lib/contract-adjustments'

export type ContractInput = {
  contractNumber: string
  description: string
  supplierName: string
  supplierDocument?: string
  initialValue: number
  indexName: string
  baseDateType: 'BUDGET_DATE' | 'PROPOSAL_DATE'
  baseDate: string
  startDate?: string
  endDate?: string
  uasgCode?: string
  organName?: string
}

function date(value?: string) { return value ? new Date(`${value}T12:00:00`) : undefined }

export async function listContracts() {
  return prisma.contract.findMany({ orderBy: { nextAdjustment: 'asc' }, include: { _count: { select: { adjustments: true } } } })
}

export async function createContract(input: ContractInput) {
  if (!input.contractNumber.trim() || !input.description.trim() || !input.supplierName.trim()) throw new Error('Preencha número, objeto e contratado.')
  if (!Number.isFinite(input.initialValue) || input.initialValue < 0) throw new Error('Informe um valor inicial válido.')
  const baseDate = date(input.baseDate)
  if (!baseDate) throw new Error('Informe a data-base.')
  const nextAdjustment = new Date(baseDate)
  nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1)
  const contract = await prisma.contract.create({ data: {
    contractNumber: input.contractNumber.trim(), description: input.description.trim(), supplierName: input.supplierName.trim(), supplierDocument: input.supplierDocument?.trim() || null,
    initialValue: input.initialValue, currentValue: input.initialValue, indexName: input.indexName, baseDateType: input.baseDateType, baseDate, nextAdjustment,
    startDate: date(input.startDate), endDate: date(input.endDate), uasgCode: input.uasgCode?.trim() || null, organName: input.organName?.trim() || null,
  } })
  revalidatePath('/contratos')
  return contract.id
}

export async function simulateAdjustment(input: { contractId: string; initialIndex: number; currentIndex: number; referenceDate: string }) {
  const contract = await prisma.contract.findUnique({ where: { id: input.contractId } })
  if (!contract) throw new Error('Contrato não encontrado.')
  const calculation = calculateContractAdjustment({ currentValue: contract.currentValue, initialIndex: input.initialIndex, currentIndex: input.currentIndex, baseDate: contract.baseDate, referenceDate: input.referenceDate })
  return { calculation, contract: { id: contract.id, number: contract.contractNumber, currentValue: contract.currentValue } }
}

export async function applyAdjustment(input: { contractId: string; initialIndex: number; currentIndex: number; referenceDate: string; notes?: string }) {
  const contract = await prisma.contract.findUnique({ where: { id: input.contractId } })
  if (!contract) throw new Error('Contrato não encontrado.')
  const calculation = calculateContractAdjustment({ currentValue: contract.currentValue, initialIndex: input.initialIndex, currentIndex: input.currentIndex, baseDate: contract.baseDate, referenceDate: input.referenceDate })
  if (!calculation.valid) throw new Error(calculation.message)
  const referenceDate = date(input.referenceDate)
  if (!referenceDate) throw new Error('Informe a data de referência.')
  await prisma.$transaction([
    prisma.adjustment.create({ data: { contractId: contract.id, referenceDate, appliedIndex: input.currentIndex, initialIndex: input.initialIndex, factor: calculation.factor, oldValue: contract.currentValue, newValue: calculation.newValue, status: 'APPLIED', notes: input.notes?.trim() || null } }),
    prisma.contract.update({ where: { id: contract.id }, data: { currentValue: calculation.newValue, nextAdjustment: new Date(referenceDate.getFullYear() + 1, referenceDate.getMonth(), referenceDate.getDate()) } }),
  ])
  revalidatePath('/contratos')
  return calculation
}
