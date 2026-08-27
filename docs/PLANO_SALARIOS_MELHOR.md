# Plano de Salários Melhor

## Objetivo

Melhorar os resultados nas pesquisas salariais. O pessoal tem gostado bastante da funcionalidade, e isso tem contribuído para uma maior satisfação e retenção dos clientes.

Para melhorar mais ainda o sistema, pensei em implementar a possibilidade do usuário incluir no resultado da pesquisa informações adicionais, como atividades para o posto de trabalho. 

Existe uma tabela onde essas informações adicionais podem ser incluídas, permitindo uma visão mais completa das atividades e responsabilidades associadas a cada posto de trabalho.

## Dados

Os dados devem ser enviados para o banco por meio do csv `data\cbo_perfilocupacional.csv` com auxílio do MinIO, conforme ocorreu cargas para a funcionalidade de salários anteriormente implementada.

## Estrutura do CSV

| COD_GRANDE_GRUPO | COD_SUBGRUPO_PRINCIPAL | COD_SUBGRUPO | COD_FAMILIA | COD_OCUPACAO | SGL_GRANDE_AREA | NOME_GRANDE_AREA | COD_ATIVIDADE | NOME_ATIVIDADE |

|------------------|------------------------|--------------|-------------|--------------|-----------------|------------------|---------------|----------------|
| 0 | 2 | 20 | 201 | 20105 | A | COMANDAR UNIDADES DE POLÍCIA MILITAR | 1 | Desenvolver atividades de polícia ostensiva |
| 0 | 2 | 20 | 201 | 20105 | A | COMANDAR UNIDADES DE POLÍCIA MILITAR | 2 | Realizar estudos de situação |
| 0 | 2 | 20 | 201 | 20105 | A | COMANDAR UNIDADES DE POLÍCIA MILITAR | 3 | Coordenar atividades de inteligência |
| 0 | 2 | 20 | 201 | 20105 | A | COMANDAR UNIDADES DE POLÍCIA MILITAR | 4 | Coordenar ações de defesa civil |

---

## Explicação das colunas:

- **COD_GRANDE_GRUPO**: Código do grande grupo ocupacional  
- **COD_SUBGRUPO_PRINCIPAL**: Código do subgrupo principal  
- **COD_SUBGRUPO**: Código do subgrupo  
- **COD_FAMILIA**: Código da família ocupacional  
- **COD_OCUPACAO**: Código da ocupação  
- **SGL_GRANDE_AREA**: Sigla da grande área de atuação  
- **NOME_GRANDE_AREA**: Nome da grande área de atuação  
- **COD_ATIVIDADE**: Código da atividade  
- **NOME_ATIVIDADE**: Descrição da atividade

---

## Complemento da IA

Coloque aqui as informações de planejamento

