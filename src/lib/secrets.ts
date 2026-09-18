import { timingSafeEqual } from 'node:crypto'

function compararSecret(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado) return false

  const recebidoBuffer = Buffer.from(recebido, 'utf8')
  const esperadoBuffer = Buffer.from(esperado, 'utf8')

  if (recebidoBuffer.length !== esperadoBuffer.length) return false

  return timingSafeEqual(recebidoBuffer, esperadoBuffer)
}

export function validarCronSecret(req: Request): boolean {
  return compararSecret(req.headers.get('x-cron-secret'), process.env.CRON_SECRET)
}

export function validarAdminSecret(req: Request): boolean {
  return compararSecret(req.headers.get('x-anp-admin-secret'), process.env.ANP_ADMIN_SECRET)
}
