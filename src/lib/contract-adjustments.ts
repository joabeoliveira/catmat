export type AdjustmentCalculation = {
  valid: boolean
  message?: string
  factor: number
  percentage: number
  adjustmentValue: number
  newValue: number
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateContractAdjustment(input: {
  currentValue: number
  initialIndex: number
  currentIndex: number
  baseDate: string | Date
  referenceDate: string | Date
}): AdjustmentCalculation {
  const base = new Date(input.baseDate)
  const reference = new Date(input.referenceDate)
  const months = (reference.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 30.44)

  if (!Number.isFinite(input.currentValue) || input.currentValue < 0) {
    return { valid: false, message: 'Informe um valor contratual válido.', factor: 0, percentage: 0, adjustmentValue: 0, newValue: 0 }
  }
  if (!Number.isFinite(input.initialIndex) || !Number.isFinite(input.currentIndex) || input.initialIndex <= 0 || input.currentIndex <= 0) {
    return { valid: false, message: 'Informe índices maiores que zero.', factor: 0, percentage: 0, adjustmentValue: 0, newValue: 0 }
  }
  if (months < 11.5) {
    return { valid: false, message: 'O interregno mínimo de 12 meses ainda não foi cumprido.', factor: 0, percentage: 0, adjustmentValue: 0, newValue: 0 }
  }

  const factor = (input.currentIndex - input.initialIndex) / input.initialIndex
  const adjustmentValue = money(input.currentValue * factor)
  return {
    valid: true,
    factor,
    percentage: factor * 100,
    adjustmentValue,
    newValue: money(input.currentValue + adjustmentValue),
  }
}
