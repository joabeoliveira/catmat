import type { Metadata } from 'next'
import { listContracts } from '@/app/actions/contracts'
import { ContratosContent } from '@/components/contratos/ContratosContent'

export const metadata: Metadata = { title: 'Reajuste de contratos', description: 'Gestão e cálculo de reajustes de contratos administrativos.' }
export const dynamic = 'force-dynamic'

export default async function ContratosPage() {
  const contracts = await listContracts()
  return <ContratosContent initialContracts={contracts.map((contract) => ({
    id: contract.id, contractNumber: contract.contractNumber, description: contract.description, supplierName: contract.supplierName,
    currentValue: contract.currentValue, indexName: contract.indexName, baseDate: contract.baseDate.toISOString(), nextAdjustment: contract.nextAdjustment.toISOString(), adjustments: contract._count.adjustments,
  }))} />
}
