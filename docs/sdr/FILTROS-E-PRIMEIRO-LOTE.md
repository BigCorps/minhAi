# Filtros iniciais para validar a API

Use um exemplo do fornecedor escolhido, não todos os exemplos na mesma campanha. Os filtros abaixo são ponto de partida; adaptar região, segmento e cargo ao produto antes de importar. Rodar primeiro com limite inicial do sistema: cinco contatos, uma busca, um toque por email. Não há garantia de cobertura ou intenção de compra.

## Econodata v4 — organizadores de eventos em São Paulo

Para ConviteIA, validar a descrição do CNAE e a região desejada no painel Econodata:

```json
{"uf":["SP"],"cnaePrimario":["8230001"],"comEmailsValidados":true}
```

O código envolve esses filtros em `filtros`, pede `cadastro`/`contatosBasicos`, estima tokens e só depois reserva o consumo. O orçamento local precisa comportar a estimativa. Se a API devolver esquema/estimativa diferente, parar e ajustar o contrato do conector com base na documentação da conta, sem enviar contatos.

## Apollo — decisores comerciais no Brasil

```json
{"person_locations":["Brazil"],"person_titles":["owner","founder"],"organization_num_employees_ranges":["1,10","11,50"]}
```

Este exemplo é amplo: antes da abordagem, comprovar a aderência ao ConsultaTec ou FuncionarIA. Adicionar filtros de setor quando a conta confirmar a taxonomia. O conector usa busca e depois enriquecimento por ID, sem revelar telefone pessoal e sem waterfall. API key precisa ter os dois endpoints liberados; plano gratuito/trial não garante a permissão específica da conta.

## Hunter — empresas de impressão

```json
{"query":"Printing and graphic design companies in Brazil"}
```

O Discover transforma a consulta em filtros e o conector consulta um email por domínio, no máximo cinco empresas. A primeira página pode conter até 100 empresas, mas só cinco são trabalhadas; não existe paginação paga embutida como se fosse gratuita. Para Mídia.Pro adaptar a consulta a estabelecimentos/operadores de telas e revisar o perfil, pois um setor sozinho não prova que a empresa tenha telas disponíveis.

## MelhorIA

Usar critérios de empresas/equipes interessadas em rotina e hábitos. Não procurar pessoas por diagnóstico, vulnerabilidade, depressão, ansiedade ou dados de saúde. O código bloqueia termos evidentes nos filtros dessa campanha, mas a revisão do público continua necessária.

## Revisão de cada resultado

Registrar origem, empresa, contato profissional e uma hipótese objetiva de aderência. Exemplo: “Empresa organiza eventos corporativos; ConviteIA pode apoiar confirmação de presença. Precisa confirmar volume e solução atual.” Não escrever “precisa comprar” sem ter conversado.

Para comparar os três fornecedores, manter uma planilha ou a aba Resultados com data inicial, créditos gastos no extrato real, contatos válidos, respostas, oportunidades e pagamentos. Escolher a continuidade depois de revisar os casos sem atribuição automática. Não decidir só pelo tamanho da lista.
