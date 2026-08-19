### Skill 4: `pesquisar_precos_e_unidades` (O Coração da Decisão)

**Objetivo:** Pesquisar preços e unidades de medida para um item específico, permitindo a escolha pelo usuário.

**Nome:** `pesquisar_precos_e_unidades`

**Parâmetros de Entrada:**
- `codigoItem` (integer, obrigatório): O código do item selecionado.
- `filtros_preco` (json, opcional): Filtros para a pesquisa de preços:
  ```json
  {
    "dataCompraInicio": "2025-01-01",
    "dataCompraFim": "2026-08-01",
    "codigoUasg": "158146"
  }
  ```

**Funcionamento:**

1. **Consulta a API de Preços:**
   - Usa `modulo-pesquisa-preco/1_consultarMaterial` para materiais ou `3_consultarServico` para serviços.
   - Retorna uma lista de compras com: `precoUnitario`, `nomeUnidadeFornecimento`, `niFornecedor`, `dataCompra`.

2. **Agrupa e Calcula Métricas:**
   ```json
   {
     "unidades_disponiveis": [
       {"sigla": "EMB", "nome": "EMBALAGEM", "capacidade": 50},
       {"sigla": "UN", "nome": "UNIDADE", "capacidade": 1}
     ],
     "metricas": {
       "media": 17.85,
       "mediana": 17.40,
       "menor": 15.20,
       "maior": 22.50,
       "numero_amostras": 127
     },
     "detalhes_compras": [
       {"fornecedor": "VANINHA UTILIDADES LTDA", "preco": 17.40, "unidade": "EMB", "data": "2026-07-20"},
       // ... mais compras
     ]
   }
   ```

3. **Permite a Escolha do Usuário:**
   - O frontend exibe as métricas e a lista de compras.
   - O usuário escolhe a unidade de medida e o preço (ou aceita a sugestão automática).

---
