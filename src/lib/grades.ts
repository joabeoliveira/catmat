// Armazenamento das grades de cotação no localStorage, com ciclo de vida
// (criadaEm/atualizadaEm) e migração do formato antigo { nome: itens[] }.
export interface GradeRegistro {
  itens: Array<Record<string, unknown>>
  criadaEm: string
  atualizadaEm: string
}

const CHAVE = 'catmat:grades'
export const EVENTO_GRADE = 'gradeAtualizada'

function agora() {
  return new Date().toISOString()
}

function gradeVazia(): GradeRegistro {
  return { itens: [], criadaEm: agora(), atualizadaEm: agora() }
}

export function lerGrades(): Record<string, GradeRegistro> {
  if (typeof window === 'undefined') return { principal: gradeVazia() }
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '{}') as Record<string, unknown>
    const grades: Record<string, GradeRegistro> = {}
    for (const [nome, valor] of Object.entries(bruto || {})) {
      if (Array.isArray(valor)) {
        // Formato antigo: nome -> itens[] (sem metadados)
        grades[nome] = { itens: valor, criadaEm: agora(), atualizadaEm: agora() }
      } else if (valor && typeof valor === 'object' && Array.isArray((valor as GradeRegistro).itens)) {
        grades[nome] = valor as GradeRegistro
      }
    }
    if (!grades.principal) grades.principal = gradeVazia()
    return grades
  } catch {
    return { principal: gradeVazia() }
  }
}

function persistir(grades: Record<string, GradeRegistro>) {
  localStorage.setItem(CHAVE, JSON.stringify(grades))
  window.dispatchEvent(new Event(EVENTO_GRADE))
}

export function salvarItens(nome: string, itens: Array<Record<string, unknown>>): Record<string, GradeRegistro> {
  const grades = lerGrades()
  grades[nome] = {
    itens,
    criadaEm: grades[nome]?.criadaEm || agora(),
    atualizadaEm: agora(),
  }
  persistir(grades)
  return grades
}

// Esvazia a grade ativa e reinicia o ciclo de vida (nova cotação)
export function limparGrade(nome: string): Record<string, GradeRegistro> {
  const grades = lerGrades()
  grades[nome] = gradeVazia()
  persistir(grades)
  return grades
}

export function criarGrade(nome: string): Record<string, GradeRegistro> {
  const grades = lerGrades()
  if (!grades[nome]) {
    grades[nome] = gradeVazia()
    persistir(grades)
  }
  return grades
}

export function renomearGrade(de: string, para: string): Record<string, GradeRegistro> {
  const grades = lerGrades()
  if (!grades[de] || grades[para]) return grades
  grades[para] = grades[de]
  delete grades[de]
  persistir(grades)
  return grades
}

export function excluirGrade(nome: string): Record<string, GradeRegistro> {
  const grades = lerGrades()
  delete grades[nome]
  if (!grades.principal) grades.principal = gradeVazia()
  persistir(grades)
  return grades
}
