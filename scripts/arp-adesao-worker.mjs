import { sincronizar } from './sync-arp-adesao.mjs'

const hora = Number(process.env.ARP_SYNC_HORA || 2)
const intervalo = Number(process.env.ARP_SYNC_INTERVALO_MS || 15000)
let ultimoDia

function agoraBrasilia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).reduce((acc, item) => ({ ...acc, [item.type]: item.value }), {})
}

async function verificar() {
  const agora = agoraBrasilia()
  const dia = `${agora.year}-${agora.month}-${agora.day}`
  if (Number(agora.hour) === hora && Number(agora.minute) === 0 && ultimoDia !== dia) {
    ultimoDia = dia
    try { console.log('Iniciando carga noturna de ARP adesão.'); console.log(await sincronizar({ intervalo })) }
    catch (error) { console.error('Falha na carga noturna de ARP adesão:', error) }
  }
}

console.log(`Worker ARP adesão ativo. Execução diária às ${String(hora).padStart(2, '0')}:00 (America/Sao_Paulo).`)
await verificar()
setInterval(verificar, 60_000)
