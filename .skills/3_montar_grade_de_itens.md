### Skill 3: `montar_grade_de_itens` (A Seleção)

**Objetivo:** Gerenciar a seleção de múltiplos itens pelo usuário.

**Nome:** `montar_grade_de_itens`

**Parâmetros de Entrada:**
- `item_selecionado` (object, obrigatório): O item que o usuário escolheu na busca.
- `grade_atual` (array, opcional): A grade de itens já selecionados (persistida na sessão).
- `acao` (string, obrigatório): `"adicionar"`, `"remover"`, `"limpar"`.

**Funcionamento:**

1. Mantém uma lista na sessão do navegador (LocalStorage/SessionStorage).
2. Cada item adicionado contém: `codigoItem`, `descricaoItem`, `unidadeMedida` (se já definida), `precoReferencia` (se já definido).
3. Retorna a grade atualizada para exibição.

**Exemplo de Uso:**
- **Ação:** Usuário clica em "Adicionar" ao lado do item 461783.
- **Resultado:** O item é adicionado à grade, que agora contém: `[{codigoItem: 461783, descricao: "PAPEL PARA IMPRESSÃO FORMATADO..."}]`.

---
