# Plano de Salários no Brasil

Para estruturar a pesquisa de salários com CBO e atualização pelo INPC no seu MVP, você pode seguir uma arquitetura modular que se integra ao padrão existente do sistema (banco no EasyPanel, backend com caching/consultas otimizadas e frontend padronizado).

---

### 1. Modelagem do Banco de Dados & Carga CSV

Crie a tabela dedicada para armazenar a base de ocupações e faixas salariais:

```sql
CREATE TABLE IF NOT EXISTS salaries_cbo (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cbo_code VARCHAR(10) NOT NULL,
    occupation_title VARCHAR(255) NOT NULL,
    activity_description TEXT NULL,
    competence_date DATE NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    median_salary DECIMAL(12, 2) NULL,
    percentile_25 DECIMAL(12, 2) NULL,
    percentile_75 DECIMAL(12, 2) NULL,
    sample_size INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cbo (cbo_code),
    INDEX idx_occupation (occupation_title(50)),
    INDEX idx_competence (competence_date)
);

```

#### Script de Carga (CLI / Migration)

Para carregar o CSV via VPS/EasyPanel sem sobrecarregar a memória:

```php
// Exemplo de comando / job para streaming do CSV
$handle = fopen($csvPath, 'r');
$header = fgetcsv($handle, 1000, ';'); // ou ',' dependendo do arquivo

$batch = [];
while (($row = fgetcsv($handle, 1000, ';')) !== false) {
    $batch[] = [
        'cbo_code'           => trim($row[0]),
        'occupation_title'   => trim($row[1]),
        'activity_description' => $row[2] ?? null,
        'competence_date'    => $row[3],
        'base_salary'        => (float) str_replace(['.', ','], ['', '.'], $row[4]),
        // demais colunas...
    ];

    if (count($batch) >= 500) {
        DB::table('salaries_cbo')->insert($batch);
        $batch = [];
    }
}
if (!empty($batch)) {
    DB::table('salaries_cbo')->insert($batch);
}
fclose($handle);

```

#### Fonte dos dados: arquivo local ou MinIO (opção)

No projeto real (Next.js + Prisma + PostgreSQL), o CSV `dados/salariosBrasil_INPC.csv` pode ser carregado de duas formas:

**Opção 1 — Arquivo local (padrão, desenvolvimento):**

```bash
npm run import:salarios -- dados/salariosBrasil_INPC.csv
```

**Opção 2 — MinIO (produção):** com o CSV no bucket `catmat-dados`, o import baixa o objeto via S3 SDK e popula o banco sem precisar do arquivo no servidor:

```bash
npm run import:salarios
```

Variáveis de ambiente usadas quando presentes (fallback para o arquivo local caso contrário):

- `MINIO_ENDPOINT` — ex.: `https://s3.gptgov.com.br`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET` — ex.: `catmat-dados`
- `MINIO_CSV_KEY` — ex.: `salariosBrasil_INPC.csv`

---

### 2. Motor de Correção Monetária (INPC)

A tabela `SalariesCBO` já se encontra com os valores atualizados para cada ano. No entanto para os próximos anos esses valores podem ser atualizados automaticamente com base nos índices do INPC e uso de APIs externas do governo. Para atualizar os valores até a data presente, crie um serviço que consome a API oficial do Banco Central do Brasil (SGS - Série 188 do INPC) com cache:

```php
Para atualizar os valores até a data presente, crie um serviço que consome a API oficial do Banco Central do Brasil (SGS - Série 188 do INPC) com cache:

```php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class InpcService
{
    private const INPC_SERIES_CODE = 188;

    public function getCorrectionFactor(Carbon $fromDate, Carbon $toDate): float
    {
        $cacheKey = "inpc_factor_{$fromDate->format('Ym')}_{$toDate->format('Ym')}";

        return Cache::remember($cacheKey, 86400, function () use ($fromDate, $toDate) {
            $url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs." . self::INPC_SERIES_CODE . "/dados?formato=json&dataInicial={$fromDate->format('d/m/Y')}&dataFinal={$toDate->format('d/m/Y')}";
            
            $response = Http::timeout(10)->get($url);
            if (!$response->successful()) {
                return 1.0; // Fallback caso a API esteja indisponível
            }

            $rates = $response->json();
            $factor = 1.0;
            foreach ($rates as $rate) {
                $percentage = (float) str_replace(',', '.', $rate['valor']);
                $factor *= (1 + ($percentage / 100));
            }

            return $factor;
        });
    }
}

```

---

### 3. API & Exportação (CSV/XLSX)

* **Consulta Multicritério:** Permite buscar por texto parcial na descrição, código CBO exato/prefixo, e filtros de faixa salarial ou período.
* **Cálculo em Tempo Real:** Aplica o fator de correção do INPC antes de retornar a lista formatada para os cards ou para a exportação.
* **Exportação:** Reutilize as rotas de streaming do sistema (`FastExcel`, `PhpSpreadsheet` ou geração de CSV em buffer de saída) para manter o mesmo padrão de download.

---

### 4. Interface (Cards, Filtros e Ações)

A tela deve ser estruturada em três seções:

1. **Barra de Filtros Superior:**
* Campo de busca textual (CBO ou Descrição da Ocupação).
* Seletor de data de referência / competência base.
* Toggle: *"Aplicar atualização monetária (INPC) até o mês atual"*.
* Botões de exportação rápida (**Exportar CSV** e **Exportar Excel**).


2. **Grid de Resultados (Cards):**
* **Cabeçalho do Card:** Título da Ocupação + Badge com o código CBO.
* **Valores em Destaque:** Salário Médio / Mediana (valor original vs. valor corrigido pelo INPC em destaque).
* **Detalhamento:** 1º Quartil, 3º Quartil e Amostragem.
* **Rodapé:** Data da competência e link/botão para copiar dados ou adicionar à cesta de cotações.


3. **Paginação e Resumo:** Quantidade de registros encontrados e média ponderada do conjunto filtrado.

---

### 5. Prompt Pronto para o GitHub Copilot Agent

Copie e cole este prompt no chat do Copilot no VS Code para iniciar a codificação guiada:

```text
Atue como um Engenheiro Full Stack sênior. Preciso implementar uma nova tela e módulo de "Pesquisa Salarial por CBO com Atualização pelo INPC" neste projeto.

Diretrizes de implementação:
1. Migration & Model: Crie a tabela `salaries_cbo` com índices adequados (cbo_code, occupation_title, competence_date).
2. Service INPC: Crie um serviço que busca a série 188 do SGS/BCB com cache de 24h para calcular o fator acumulado de correção entre duas datas.
3. Controller & Query Builder: Endpoint de busca que aceite filtros por `search` (CBO ou Descrição), `competence_date` e um booleano `apply_inpc`.
4. Exportação: Reutilize o padrão de exportação CSV/XLSX existente no projeto para exportar os dados filtrados com os valores originais e corrigidos.
5. Interface (Frontend): Estruture a página mantendo a identidade visual do app (Tailwind/Blade/Vue), com formulário de busca, toggle do INPC, cards de resultados com badges de quartis/médias e paginação.

Por favor, comece gerando a migration e o comando de importação em streaming do CSV.

```