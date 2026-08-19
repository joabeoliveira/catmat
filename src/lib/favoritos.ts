// Favoritos no localStorage (client-only), espelhando o padrão da grade
export interface ItemFavorito {
  codigoItem: number
  descricaoItem: string
  nomePdm: string
}

const CHAVE = 'catmat:favoritos'
export const EVENTO_FAVORITOS = 'favoritosAtualizados'

export function listarFavoritos(): ItemFavorito[] {
  if (typeof window === 'undefined') return []
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export function ehFavorito(codigoItem: number): boolean {
  return listarFavoritos().some((item) => item.codigoItem === codigoItem)
}

export function alternarFavorito(item: ItemFavorito): boolean {
  const lista = listarFavoritos()
  const existe = lista.some((favorito) => favorito.codigoItem === item.codigoItem)
  const novaLista = existe
    ? lista.filter((favorito) => favorito.codigoItem !== item.codigoItem)
    : [...lista, item]
  localStorage.setItem(CHAVE, JSON.stringify(novaLista))
  window.dispatchEvent(new Event(EVENTO_FAVORITOS))
  return !existe
}
