### Skill 5: `espurgar_precos` (O Filtro de Outliers)

**Objetivo:** Remover preços destoantes, como você descreveu.

**Nome:** `espurgar_precos`

**Parâmetros de Entrada:**
- `lista_precos` (array, obrigatório): A lista de preços retornada pela `pesquisar_precos_e_unidades`.
- `metodo_espurgo` (string, opcional): `"desvio_padrao"` (padrão), `"iqr"` (intervalo interquartil), `"percentil"`.
- `limiar` (number, opcional): O limiar para o método escolhido (ex: 2 para desvio padrão).

**Funcionamento:**

1. **Identifica Outliers:**
   - **Método do Desvio Padrão:** Remove preços com `|preco - media| > limiar * desvio_padrao`.
   - **Método IQR:** Remove preços fora de `[Q1 - 1.5*IQR, Q3 + 1.5*IQR]`.
   - **Método do Percentil:** Remove preços abaixo do percentil 5 ou acima do percentil 95.

2. **Retorna:**
   ```json
   {
     "precos_filtrados": [17.40, 17.85, 18.20, ...],
     "outliers": [45.00, 5.00, 32.50, ...],
     "preco_sugerido": 17.85,
     "nova_media": 17.85,
     "novo_limite_superior": 22.50,
     "novo_limite_inferior": 13.20
   }
   ```

---
