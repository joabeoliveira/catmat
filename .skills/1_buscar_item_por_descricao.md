## Sistema de Busca e Seleção de Itens do CATMAT/CATSER


### Skill 1: `buscar_item_por_descricao` (A Busca Inteligente)

**Objetivo:** Encontrar itens no CATMAT/CATSER a partir de uma descrição aproximada, usando técnicas de busca avançada.

**Nome:** `buscar_item_por_descricao`

**Parâmetros de Entrada:**
- `termo` (string, obrigatório): Descrição aproximada do item (ex: "papel couche", "cadeira gamer").
- `filtros` (json, opcional): Filtros adicionais para refinar a busca:
  ```json
  {
    "codigoGrupo": [70, 93],
    "statusItem": true,
    "codigoClasse": 9310
  }
  ```
- `pagina` (integer, opcional): Número da página.
- `limite` (integer, opcional): Quantos resultados por página (padrão: 20).

**Funcionamento (Lógica de Backend):**

Esta skill **NÃO** depende apenas da API do governo. Ela usa a tabela CSV importada para o banco de dados (PostgreSQL com extensão pg_trgm ou Elasticsearch).

1. **Busca no Banco Local:**
   ```sql
   SELECT * FROM catmat 
   WHERE 
     -- Busca fuzzy usando trigram
     word_similarity(descricaoItem, 'papel couche a4') > 0.3
     OR word_similarity(nomePdm, 'papel couche a4') > 0.3
   ORDER BY 
     word_similarity(descricaoItem, 'papel couche a4') DESC,
     codigoGrupo, codigoClasse
   LIMIT 20;
   ```

2. **Sugestão de Filtros:** O sistema também retorna sugestões de filtros baseados nos resultados encontrados:
   ```json
   {
     "filtros_sugeridos": {
       "grupos": [93, 70],
       "classes": [9310, 7010],
       "status": true
     }
   }
   ```

**Exemplo de Uso:**
- **Prompt do Usuário:** "quero papel couchê a4 110g"
- **Resultado da Skill:** Retorna uma lista de itens similares, ordenados por relevância, mostrando código, descrição, grupo e classe para o usuário escolher.

---
