### Skill 2: `sugerir_filtros_e_refinar` (A Busca Iterativa)

**Objetivo:** Ajudar o usuário a refinar a busca quando muitos resultados são encontrados.

**Nome:** `sugerir_filtros_e_refinar`

**Parâmetros de Entrada:**
- `termo_atual` (string, obrigatório): O termo que o usuário já está usando.
- `resultados_atuais` (array, obrigatório): A lista de resultados da busca anterior.
- `acao_usuario` (string, opcional): A ação que o usuário quer fazer (`"refinar"`, `"expandir"`, `"filtrar_por_grupo"`, etc.).

**Funcionamento (Lógica do LLM):**

O LLM analisa os resultados e sugere refinamentos inteligentes:

1. **Identifica Padrões:**
   - "Encontrei 150 resultados para 'papel'. Você quer refinar por gramatura, tamanho ou cor?"
   
2. **Sugere Filtros Baseados nos Dados:**
   ```json
   {
     "sugestoes": [
       {"tipo": "gramatura", "valores": ["75g/m²", "110g/m²", "180g/m²"]},
       {"tipo": "tamanho", "valores": ["A4", "A3", "Personalizado"]},
       {"tipo": "cor", "valores": ["Branco", "Colorido"]}
     ]
   }
   ```

3. **Permite Filtragem Iterativa:**
   - "Mostre apenas os de gramatura 110g/m²"
   - "Agora mostre os que são brancos também"

---
