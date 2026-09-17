# FuncionarIA — Fase 7: Loja grátis + Mercado Livre + entrega local + modelo de 5%

**Status:** especificação aprovada para implementação  
**Data:** 2026-09-16  
**Produto:** FuncionarIA / minhAi  
**Objetivo:** introduzir a loja virtual gratuita como parte da base da FuncionarIA, permitir importação/sincronização de catálogo do Mercado Livre, oferecer entrega local integrada via Lalamove e suportar dois modelos comerciais de recebimento.

> Este documento complementa e, onde houver conflito, **substitui as regras anteriores** do `FUNCIONARIA_MASTER_SPEC.md` sobre vitrine, carrinho, pedidos, checkout e monetização da loja virtual.

---

## 1. Decisões congeladas

### 1.1 Loja virtual passa a fazer parte da base

A loja básica deixa de depender da habilidade paga `sales_orders` para existir.

A base gratuita pode incluir:

- subdomínio `empresa.funcionaria.net`;
- catálogo público;
- busca de produtos;
- página/listagem de produtos;
- carrinho;
- criação de pedido;
- checkout no modo gratuito BigCorps;
- FuncionarIA como widget da loja;
- identidade visual da empresa;
- importação inicial de produtos do Mercado Livre quando a conexão estiver ativa;
- cotação de entrega local em tempo real quando a empresa habilitar Lalamove.

Recursos operacionais avançados continuam separados e podem permanecer em habilidades/módulos pagos:

- gestão avançada de vendas;
- venda presencial/POS;
- estoque avançado;
- relatórios e automações;
- caixa operacional;
- fiscal;
- canais externos;
- IA generativa;
- voz/STT;
- integrações adicionais.

### 1.2 Dois modos comerciais de pagamento

Cada empresa terá um modo comercial para a loja:

#### `commission`

- sem mensalidade da loja;
- checkout usa infraestrutura BigCorps;
- PIX: conta BigCorps / Banco Inter;
- cartão: conta BigCorps / InfinitePay;
- comissão BigCorps: **5% da venda confirmada**;
- custos/taxas do meio de pagamento devem ser registrados separadamente da comissão comercial;
- saldo líquido do lojista é contabilizado no ledger/saldo da empresa;
- repasse/saque segue a infraestrutura já existente da minhAi/BigCorps.

#### `monthly_direct`

- empresa paga mensalidade da loja;
- recebe diretamente em sua própria conta/integrador compatível;
- não há comissão BigCorps de 5% sobre a venda da loja;
- IA, canais e outros serviços variáveis continuam cobrados separadamente conforme regras atuais.

O valor da mensalidade deve ficar configurável, sem ser congelado no código.

### 1.3 Downgrade sem tirar a loja do ar

Se o modo mensal deixar de estar ativo, a loja não deve ser despublicada automaticamente.

A estratégia preferida é retornar ao modo `commission`, preservando catálogo, URL e histórico, após o tratamento de cobrança/aviso aplicável.

### 1.4 Uma única fonte de produtos

Não criar outro catálogo para a loja.

`public.produtos_venda` continua sendo a fonte central para produto manual, produto importado do Mercado Livre, produto publicado depois no Mercado Livre, produto usado por loja pública e produto usado pela FuncionarIA.

### 1.5 Uma única FuncionarIA

Não criar um segundo assistente para a loja.

A pequena FuncionarIA exibida no canto é apenas outra apresentação do mesmo perfil, avatar, FAQ, funções e habilidades da empresa.

### 1.6 Entrega local Lalamove faz parte do storefront

A loja poderá oferecer entrega local sob demanda usando a infraestrutura Lalamove já existente na minhAi.

Regras comerciais congeladas:

- manter `LALAMOVE_MARKUP_PERCENT=50` como **default comercial** da BigCorps;
- o markup do frete é independente da comissão de **5% da venda**;
- o cliente vê o preço final do frete calculado no checkout;
- o lojista pode escolher frete pago pelo cliente, subsidiado/pago pela empresa ou regras promocionais futuras;
- pedido mínimo, raio máximo, horários, endereço de coleta e mensagem de entrega continuam configuráveis;
- não criar entrega real antes de o pagamento do pedido estar confirmado server-side;
- cotação pode ocorrer antes do pagamento, mas criação/despacho é uma ação server-authoritative;
- tracking/share link da Lalamove deve ficar vinculado ao pedido.

A integração atual será **endurecida antes de ser exposta ao storefront público**: autenticação de ações internas, `Request-ID`/idempotência, validação do payload/webhook, remoção de coordenadas/telefones placeholder e confirmação do contrato atual da API v3.

---

## 2. Regra por `workplace_mode`

A configuração atual `funcionaria_company_settings.workplace_mode` continua sendo a base.

### `online`

`empresa.funcionaria.net` abre a **loja** como experiência principal, com catálogo/carrinho em primeiro plano e FuncionarIA flutuante no canto.

### `ambos`

A mesma URL oferece **Loja** e **Atendimento**, alternáveis sem reload completo e sem perder carrinho/conversa.

Adicionar configuração `public_home_mode` com `store | assistant`.

Default de compatibilidade para empresas existentes: `assistant`.

### `presencial`

A raiz continua focada na FuncionarIA. A loja aparece apenas quando ativada.

---

## 3. Onboarding novo

Para `online` e `ambos`, deixar claro: **Sua loja virtual está incluída.**

Adicionar a pergunta **Já vende no Mercado Livre?** com opções:

- Sim, quero conectar e importar meus produtos;
- Não;
- Fazer depois.

Ao conectar Mercado Livre: OAuth existente → listar anúncios → importar todos/selecionados → mapear para `produtos_venda` → preview da loja → continuar personalização.

---

## 4. Loja pública

Reaproveitar:

- `components/funcionaria/public/FuncionarIAPublicSales.tsx`;
- `app/api/funcionaria/public-order/route.ts`;
- `/api/public/products`;
- perfil público FuncionarIA;
- `public/funcionaria-widget.js` / `FuncionarIAWidget`;
- `produtos_venda`, `pedidos`, `pedido_itens`.

A criação pública de pedido continua server-authoritative. Nunca confiar em preço, total, status de pagamento ou percentual de comissão enviados pelo browser.

---

## 5. Entrega local Lalamove

### 5.1 Reaproveitamento

Reaproveitar a infraestrutura existente:

- Edge `lalamove-delivery`;
- configuração de entrega já presente em `companies`;
- campos de entrega já presentes em `pedidos`;
- cotação, criação da entrega e tracking já existentes na minhAi.

### 5.2 Segurança e idempotência

Antes de abrir para a loja pública:

- fechar ações `quote` e `order` atrás de rotas server-side confiáveis;
- webhook deve validar autenticidade/assinatura conforme contrato atual da Lalamove;
- adicionar `Request-ID` único quando exigido pelo endpoint;
- não aceitar `company_id`, preço de frete, `quotation_id` ou estado de pagamento do browser como prova suficiente;
- criar entrega real somente para pedido pertencente à empresa e com pagamento confirmado;
- retries não podem criar duas entregas para o mesmo pedido;
- falhas depois de possível criação no provedor entram em estado indeterminado para reconciliação, sem duplicar pedido na Lalamove.

### 5.3 Preço do frete

- preço bruto Lalamove fica registrado separadamente;
- markup BigCorps default: **50%** (`LALAMOVE_MARKUP_PERCENT=50`);
- preço final do frete = preço bruto + markup;
- comissão de 5% da loja incide sobre a venda de produtos/pedido conforme regra financeira definida, sem misturar contabilmente com custo/markup do frete;
- o ledger precisa conseguir explicar separadamente: mercadoria, frete bruto, markup de frete, taxa de pagamento, comissão de venda e líquido do lojista.

### 5.4 UX da loja

Carrinho → CEP/endereço → cotação em tempo real → mostrar valor/ETA quando disponível → incluir no total → pagamento → criação/despacho da entrega → link de acompanhamento.

---

## 6. Pagamentos e comissão

### 6.1 Ledger obrigatório

Registrar por venda confirmada: empresa, pedido, provedor, ID externo, valor bruto, taxa do provedor, comissão BigCorps, BPS da comissão, valor líquido do lojista, moeda, status, timestamps, chave de idempotência e metadata.

### 6.2 Comissão

No modo `commission`:

- **500 bps = 5%**;
- calculado somente no servidor;
- aplicado sobre venda confirmada;
- webhook repetido não duplica comissão;
- um pagamento externo não liquida dois pedidos;
- retries não geram dupla liquidação.

### 6.3 Separação de valores

Nunca misturar taxa do provedor, comissão comercial BigCorps e valor líquido do lojista.

### 6.4 Migração natural para mensal

Dashboard poderá comparar dados reais dos últimos 30 dias e mostrar quando a mensalidade ficou economicamente melhor que os 5%.

---

## 7. Mercado Livre → FuncionarIA

### 7.1 Importação inicial

1. obter `seller_id`;
2. listar anúncios;
3. buscar detalhes em lote;
4. normalizar;
5. upsert em `produtos_venda`;
6. preservar `ml_item_id`;
7. importar imagens/título/descrição/preço/estoque/status quando disponíveis;
8. mapear categoria/tipo de anúncio;
9. mapear variações para opções quando viável.

### 7.2 Idempotência

Adicionar unicidade para `(company_id, ml_item_id)` quando `ml_item_id IS NOT NULL`.

Reimportação atualiza, não duplica.

### 7.3 Origem/fonte mestre

Adicionar metadados equivalentes a:

- `source: manual | mercadolivre`;
- `sync_source: local | mercadolivre | bidirectional`;
- `ml_last_synced_at`;
- hash/versionamento de sync.

Produto importado começa como `mercadolivre -> FuncionarIA`.

### 7.4 Sincronização contínua

Após importação, notificações oficiais atualizam preço, estoque, status e outros dados relevantes. Evitar polling agressivo e loops de sincronização.

---

## 8. Funil Mercado Livre

Mensagem: **Já vende no Mercado Livre? Importe seus produtos e ganhe sua própria loja virtual.**

Fluxo curto: cadastro → online/ambos → conectar ML → importar → logo/cores → publicar → depois apresentar IA, WhatsApp, Instagram/Facebook e demais habilidades.

---

## 9. Google Play

A FuncionarIA já está publicada. Usar `/cards/play.png` na landing.

Package: `net.funcionaria.twa`  
URL: `https://play.google.com/store/apps/details?id=net.funcionaria.twa`

---

## 10. Segurança

Obrigatório preservar o hardening já concluído:

- preços e totais calculados no servidor;
- pagamento confirmado apenas server-side;
- tokens ML nunca no browser;
- importação/sync somente server-side/worker;
- webhooks idempotentes;
- comissão apenas após confirmação real;
- nenhuma reabertura de DML público;
- API pública de produto por whitelist;
- IDs internos ML, custos e credenciais fora da API pública.

---

## 11. Fases de implementação

### 7A — Produto e documentação
- [x] estratégia congelada;
- [x] especificação Fase 7;
- [x] aditivo ao Master Spec/JSON preparado;
- [x] continuidade preparada.

### 7B — Landing + Play Store + onboarding
- [x] badge Play Store preparado;
- [ ] copy de loja incluída para online/ambos;
- [ ] pergunta Mercado Livre;
- [ ] CTA de importação;
- [ ] regressão do onboarding.

### 7C — Shell público por modo
- [ ] online = loja + widget;
- [ ] ambos = loja/atendimento alternável;
- [ ] presencial = atendimento, loja opcional;
- [ ] `public_home_mode`;
- [ ] preservar `/vendas`, `/fila` e links existentes.

### 7D — Storefront grátis
- [ ] remover dependência de `sales_orders` para storefront básico;
- [ ] catálogo/carrinho/pedido básicos incluídos;
- [ ] recursos avançados continuam por entitlement;
- [ ] pedido público server-authoritative.

### 7E — Entrega local Lalamove
- [ ] hardening da Edge/rotas server-side;
- [ ] cotação por CEP/endereço;
- [ ] pedido mínimo/raio/horário;
- [ ] `LALAMOVE_MARKUP_PERCENT=50` preservado como default;
- [ ] criação só após pagamento confirmado;
- [ ] idempotência de despacho;
- [ ] tracking/share link;
- [ ] webhook autenticado e reconciliação.

### 7F — Checkout BigCorps 5%
- [ ] `commission`;
- [ ] PIX Inter BigCorps;
- [ ] cartão InfinitePay BigCorps;
- [ ] ledger financeiro;
- [ ] 5% server-side;
- [ ] saldo líquido;
- [ ] separar mercadoria/frete/taxas/comissão;
- [ ] idempotência/webhooks.

### 7G — Plano mensal / conta própria
- [ ] `monthly_direct`;
- [ ] conta própria;
- [ ] mensalidade configurável;
- [ ] zero comissão de 5%;
- [ ] fallback ao gratuito;
- [ ] comparador de economia.

### 7H — Importação Mercado Livre → FuncionarIA
- [ ] listagem dos anúncios do seller;
- [ ] importação selecionada/todos;
- [ ] upsert idempotente;
- [ ] imagens, preço, estoque, status e variações.

### 7I — Sincronização contínua Mercado Livre
- [ ] webhooks/notificações;
- [ ] fonte mestre;
- [ ] prevenção de loop;
- [ ] reconciliação.

### 7J — Funil específico Mercado Livre
- [ ] pergunta no onboarding;
- [ ] conectar → importar → personalizar → publicar;
- [ ] cross-sell de IA/canais/habilidades.

### 7K — QA e produção
- [ ] online/ambos/presencial;
- [ ] mobile/desktop/PWA;
- [ ] loja/carrinho/pedido;
- [ ] PIX/cartão/5%;
- [ ] Lalamove quote/order/tracking/retry;
- [ ] ML import/sync/reimport;
- [ ] upgrade/downgrade mensal;
- [ ] regressão das empresas existentes.

---

## 11. Roadmap depois da Fase 7

1. Fase 8 — Telefone / Pipecat + STT > 1 minuto;
2. Fase 9 — QA final desktop/mobile/app;
3. Fase 10 — regressão completa BigCorps;
4. Fase 11 — auditoria global de pagamentos/créditos/saldo insuficiente;
5. Fase 12 — logs/advisories/observabilidade;
6. Fase 13 — CI permanente e gates automáticos.

---

## 12. Critério de conclusão

Fase 7 só fecha quando online publica loja sem mensalidade; ambos alterna loja/atendimento; presencial não muda sem optar; pedidos continuam server-authoritative; modo gratuito registra exatamente 5% uma única vez; modo mensal não cobra 5%; Lalamove cota com markup default de 50%, despacha uma única vez somente após pagamento confirmado e mantém tracking; Mercado Livre importa sem duplicação; sync atualiza sem duplicar; widget usa a mesma FuncionarIA; e desktop/mobile/TWA passam no QA.
