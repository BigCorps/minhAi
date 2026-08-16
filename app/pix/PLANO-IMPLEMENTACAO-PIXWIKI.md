# PixWiki — Plano de Implementação e Evolução

> Documento mestre de execução para transformar o PixWiki em um produto de confirmação de Pix, links de cobrança, notificações e automação empresarial.
>
> **Regra:** toda nova implementação do PixWiki deve ser conferida contra esta checklist antes de ser considerada concluída.

---

## 1. Objetivo do PixWiki

O PixWiki não será uma carteira digital e não ficará com o dinheiro do cliente.

A proposta é:

> **PixWiki é a inteligência em cima do Pix que a empresa já usa.**

O dinheiro continua caindo diretamente na conta Mercado Pago conectada pelo usuário.

O PixWiki monetiza:

- confirmação automática de recebimentos;
- painel e histórico;
- notificações;
- links de pagamento;
- subdomínio personalizado;
- relatórios;
- multiempresa;
- API;
- webhooks para integrações.

### Princípio comercial

**O PixWiki não cobra percentual sobre as vendas.**

Quando houver tarifa de processamento no **Pix Link**, ela é cobrada diretamente pelo Mercado Pago na conta do usuário.

---

## 2. Formas de receber

O usuário poderá receber de duas maneiras diferentes.

### 2.1. Chave Pix

Fluxo:

```text
cliente recebe a chave Pix → informa o valor → paga
```

Características:

- pagamento direto para a chave Pix Mercado Pago;
- sem necessidade de gerar cobrança;
- sem página de pagamento;
- sem valor pré-preenchido;
- confirmação automática pelo PixWiki;
- aparece no dashboard;
- pode gerar Push, e-mail e WhatsApp conforme o plano;
- **PixWiki não cobra tarifa sobre a transação**;
- no fluxo direto já testado, o Pix chegou integralmente à conta Mercado Pago.

Texto sugerido:

> **Chave Pix — receba diretamente**  
> Ideal para balcão, clientes recorrentes e pagamentos em que você pode simplesmente compartilhar sua chave.  
> O cliente informa o valor manualmente.

### 2.2. Pix Link

Exemplos:

```text
loja.pix.wiki
```

```text
loja.pix.wiki/49.90
```

Características:

- página profissional PixWiki;
- identidade da empresa;
- valor opcionalmente pré-preenchido;
- QR Code;
- Pix copia e cola;
- confirmação automática;
- histórico;
- notificações;
- maior facilidade para WhatsApp, Instagram, redes sociais e vendas à distância.

### Tarifa do Pix Link

A tarifa de processamento do Pix Link é do **Mercado Pago**, não do PixWiki.

A interface deve deixar isso explícito:

> **O PixWiki não cobra nenhuma taxa sobre esta venda.**  
> O Mercado Pago poderá descontar a tarifa de processamento vigente diretamente da sua conta.

Enquanto a tarifa praticada estiver em aproximadamente 1%, podemos mostrar:

> Tarifa estimada Mercado Pago: aproximadamente 1%.

O sistema deve priorizar sempre os valores reais retornados pela API do Mercado Pago quando disponíveis.

### Nunca apresentar

Evitar qualquer texto como:

```text
Taxa PixWiki: 1%
```

ou qualquer linguagem que faça parecer que a tarifa do Mercado Pago pertence ao PixWiki.

---

## 3. Comparativo dentro do produto

| Recurso | Chave Pix | Pix Link |
|---|---|---|
| Cliente informa a chave | Sim | Não |
| Valor preenchido automaticamente | Não | Sim |
| Página personalizada | Não | Sim |
| QR Code da cobrança | Não | Sim |
| Confirmação PixWiki | Sim | Sim |
| Push | Sim | Sim |
| E-mail | Sim | Sim |
| WhatsApp no Pro | Sim | Sim |
| Taxa PixWiki por venda | R$ 0 | R$ 0 |
| Tarifa Mercado Pago | Pix direto conforme conta | Tarifa de processamento vigente |

O usuário deve poder decidir em cada venda qual opção vale mais a pena.

---

# 4. Planos comerciais

Ter no máximo **3 planos**, fáceis de entender.

## 4.1. Pix Grátis

**Preço:** R$ 0

> **Sua chave Pix, agora inteligente.**

Inclui:

- 1 empresa / configuração Pix;
- conexão Mercado Pago;
- confirmação automática de Pix recebido pela chave;
- dashboard;
- histórico básico;
- notificação Push PixWiki;
- notificação por e-mail;
- visualização do valor recebido;
- identificação de recebimento por Chave Pix;
- sem cobrança percentual do PixWiki.

Não inclui:

- subdomínio;
- Pix Link profissional;
- WhatsApp;
- multiempresa;
- API;
- relatórios avançados.

## 4.2. Pix Link

**Preço:** R$ 29,90/mês

> **Seu endereço profissional para receber Pix.**

Inclui tudo do Pix Grátis, mais:

- subdomínio personalizado `suaempresa.pix.wiki`;
- página de recebimento personalizada;
- logo;
- nome da empresa;
- identidade visual;
- QR Code;
- Pix copia e cola;
- link sem valor;
- link com valor: `suaempresa.pix.wiki/49.90`;
- histórico completo;
- diferenciação Chave Pix × Pix Link;
- informações de bruto, tarifa do provedor e líquido;
- compartilhamento rápido;
- QR Code para impressão/exibição.

Destaque comercial: **Mais popular**.

## 4.3. Pix Pro

**Preço:** R$ 99,90/mês

> **Pix profissional para sua operação.**

Inclui tudo do Pix Link, mais:

- notificações por WhatsApp;
- WhatsApp ilimitado sujeito a política de uso justo;
- 1 número de notificação para cada Pix/empresa configurado;
- multiempresa;
- múltiplas conexões Mercado Pago;
- dashboard consolidado;
- relatórios avançados;
- exportações;
- API PixWiki;
- Webhooks PixWiki;
- integração com sistemas externos;
- histórico avançado;
- filtros avançados;
- visão por empresa;
- visão consolidada da conta.

Nos termos:

> Sujeito à Política de Uso Justo e às regras e limites da plataforma WhatsApp/Meta.

---

# 5. Arquitetura de recebimentos

## 5.1. Pix gerado pelo PixWiki

O fluxo atual já gera cobranças através do Mercado Pago e registra em:

```text
pix_transactions
```

O `txid` corresponde ao ID do pagamento Mercado Pago.

Se o ID Mercado Pago existir em `pix_transactions.txid`, classificar como:

```text
pixwiki_link
```

Exibir como **Pix Link**.

## 5.2. Pix recebido diretamente pela chave

Já foi validado em produção que:

```text
GET /v1/payments/search
```

consegue encontrar Pix enviados diretamente para a chave Mercado Pago, mesmo quando a cobrança não foi gerada pelo PixWiki.

Exemplos reais já testados:

- R$ 1,37;
- R$ 1,39.

Os pagamentos apareceram como Pix aprovado, do tipo transferência bancária.

Se o pagamento Mercado Pago:

- é Pix;
- está aprovado;
- não existe em `pix_transactions.txid`;

classificar como:

```text
pix_key
```

Exibir como **Chave Pix**.

---

# 6. Sincronização Mercado Pago

Criar Edge Function:

```text
pixwiki-sync-mp-receipts
```

Responsabilidades:

1. localizar conexões Mercado Pago ativas;
2. obter token válido;
3. renovar token quando necessário;
4. consultar `/v1/payments/search`;
5. buscar somente período recente;
6. identificar Pix aprovados;
7. deduplicar por `mp_payment_id`;
8. comparar com `pix_transactions.txid`;
9. classificar origem;
10. salvar recebimento;
11. disparar notificações;
12. atualizar `last_sync_at`.

### Frequência inicial

Executar inicialmente:

```text
a cada 1 minuto
```

A frequência pode ser revisada conforme volume, limites da API Mercado Pago e custo Supabase.

## Webhook Mercado Pago

Resultado dos testes:

- webhook simulado: funcionou;
- Pix real enviado diretamente para a chave: não disparou webhook;
- `/v1/payments/search`: encontrou o pagamento.

Portanto:

- **Pix direto na chave:** `/v1/payments/search` é a fonte principal;
- **Pix Link:** manter confirmação atual e usar webhook apenas como complemento quando aplicável;
- não depender de webhook para Pix espontâneo.

---

# 7. Tabela de recebimentos Mercado Pago

Criar, por exemplo:

```text
mp_received_payments
```

Campos recomendados:

```text
id uuid
mp_payment_id text UNIQUE
user_id uuid
company_id uuid
mp_connection_id uuid
amount_cents integer
net_amount_cents integer
fee_amount_cents integer
currency text
status text
payment_method_id text
payment_type_id text
operation_type text
interaction_type text
interaction_subtype text
source text -- pix_key | pixwiki_link
payer_bank text
date_created timestamptz
date_approved timestamptz
date_last_updated timestamptz
raw_metadata jsonb
created_at timestamptz
updated_at timestamptz
notified_at timestamptz
```

Regras:

- `mp_payment_id` único;
- nunca gerar notificação duplicada;
- não alterar saldo financeiro;
- o dinheiro nunca passa pelo PixWiki.

---

# 8. View unificada de recebimentos

Criar view/RPC:

```text
pixwiki_receipts
```

Combinar:

- `pix_transactions` confirmadas;
- `mp_received_payments`.

Retornar pelo menos:

```text
id
company_id
amount_cents
fee_amount_cents
net_amount_cents
source
status
received_at
provider
```

Badge:

```text
Chave Pix
```

ou:

```text
Pix Link
```

---

# 9. Token Mercado Pago

Criar helper backend:

```text
getValidMercadoPagoToken()
```

Responsabilidades:

1. consultar conexão;
2. verificar `expires_at`;
3. usar `refresh_token` se necessário;
4. persistir novo `access_token`;
5. persistir novo `refresh_token` se retornado;
6. atualizar `expires_at`;
7. nunca logar tokens.

---

# 10. Multiempresa

Hoje `mp_connections.user_id` é único, permitindo apenas uma conexão MP por usuário.

No Pro precisamos permitir:

```text
Usuário
 ├── Empresa A
 │    ├── Mercado Pago A
 │    ├── Chave Pix A
 │    └── WhatsApp A
 │
 └── Empresa B
      ├── Mercado Pago B
      ├── Chave Pix B
      └── WhatsApp B
```

Associar a conexão Mercado Pago explicitamente a `company_id`, preservando a conexão existente como empresa principal.

Nunca apagar nem desconectar usuários existentes durante a migração.

---

# 11. Configuração Pix por empresa

Evitar usar `withdrawal_pix_key` semanticamente como chave de recebimento PixWiki.

Criar estrutura própria, por exemplo:

```text
pixwiki_payment_settings
```

Campos sugeridos:

```text
company_id
mp_connection_id
pix_key
pix_key_type
notification_email
notification_phone
push_enabled
email_enabled
whatsapp_enabled
last_sync_at
created_at
updated_at
```

---

# 12. Push PixWiki

A infraestrutura atual do minhAi usa OneSignal e associa a assinatura ao `auth.users.id`.

A lógica pode ser reaproveitada, mas o PixWiki deve ter um app OneSignal próprio para `https://pix.wiki`.

Variáveis recomendadas:

```text
NEXT_PUBLIC_PIXWIKI_ONESIGNAL_APP_ID
PIXWIKI_ONESIGNAL_REST_API_KEY
```

Solicitar a permissão de Push no dashboard `pix.wiki`, não em cada subdomínio.

Exemplo de notificação:

```text
Pix recebido ✅

R$ 85,00
Loja de Serviços
Pagamento confirmado
```

Clique deve abrir o dashboard PixWiki.

---

# 13. E-mail PixWiki

Todos os planos possuem e-mail.

Não exigir que cada usuário conecte uma conta Google para receber alertas.

Reaproveitar o padrão de conta de sistema/Gmail API já existente e criar função específica, por exemplo:

```text
pixwiki-send-email
```

Exemplo:

```text
Assunto: Pix recebido: R$ 85,00 ✅

Pix recebido com sucesso
Empresa: Loja de Serviços
Valor: R$ 85,00
Forma: Chave Pix
Horário: 11:42

O dinheiro foi recebido diretamente na sua conta Mercado Pago.
PixWiki não cobra taxa sobre esta transação.
```

Para Pix Link, mostrar bruto, tarifa Mercado Pago e líquido usando valores reais da API quando disponíveis.

---

# 14. WhatsApp Pix Pro

Reaproveitar o sistema atual do minhAi.

### Janela aberta

Enviar diretamente a confirmação.

### Janela fechada

Enviar o template existente:

```text
confirmacao_pix_recebido
```

com botão para confirmação/reativação.

Após a interação do usuário, continuar o fluxo normal de notificações.

**Não substituir esse mecanismo por uma implementação nova sem necessidade.**

Usar o fluxo real do slug `loja` como regressão obrigatória.

---

# 15. Motor central de notificações

Criar Edge Function:

```text
pixwiki-notify
```

### Pix Grátis

- Push;
- E-mail.

### Pix Link

- Push;
- E-mail.

### Pix Pro

- Push;
- E-mail;
- WhatsApp.

Regras:

- idempotência;
- sem duplicação;
- registrar tentativa/sucesso/falha;
- retry controlado;
- falha de um canal não bloqueia os outros.

Criar tabela:

```text
pixwiki_notification_logs
```

Campos:

```text
id
receipt_id
company_id
channel
status
provider_message_id
error
attempts
sent_at
created_at
```

Canais:

```text
push
email
whatsapp
```

---

# 16. Subdomínios PixWiki

Padrão atual:

```text
pix.wiki/slug
```

Novo padrão comercial:

```text
slug.pix.wiki
```

Exemplos:

```text
loja.pix.wiki
loja.pix.wiki/100
loja.pix.wiki/100.50
```

Reaproveitar a lógica de subdomínio já usada pela ConviteIA.

Manter `pix.wiki/slug` funcionando temporariamente por compatibilidade, mas divulgar sempre o subdomínio.

### DNS/Vercel

Configurar wildcard:

```text
*.pix.wiki
```

Validar `teste.pix.wiki` antes de liberar slugs aos usuários.

### Slugs reservados

Bloquear palavras como:

```text
www api app admin dashboard login conta suporte ajuda status mail smtp
pix pixwiki minhai bigcorps teste demo dev staging
```

Validação deve existir no backend.

---

# 17. Página Pix Link

A página pública deve mostrar:

- logo;
- nome da empresa;
- valor, quando presente;
- campo para valor quando ausente;
- botão gerar Pix;
- QR Code;
- Pix copia e cola;
- status da cobrança;
- confirmação visual;
- marca PixWiki discreta;
- texto transparente sobre tarifa Mercado Pago.

Texto antes de gerar:

> O PixWiki não cobra taxa sobre sua venda. O Mercado Pago poderá aplicar a tarifa de processamento vigente diretamente na conta do recebedor.

---

# 18. Dashboard PixWiki

## Home

Mostrar:

- total recebido hoje;
- quantidade de Pix;
- total por Chave Pix;
- total por Pix Link;
- valor líquido;
- tarifas Mercado Pago;
- status da conexão Mercado Pago;
- plano atual.

## Recebimentos

Exemplos:

```text
R$ 85,00
Chave Pix
Confirmado
11:42
```

```text
R$ 149,90
Pix Link
Confirmado
11:38
Tarifa Mercado Pago: R$ 1,49
Líquido: R$ 148,41
```

Filtros:

- Hoje;
- 7 dias;
- 30 dias;
- período;
- Chave Pix;
- Pix Link;
- empresa;
- valor.

---

# 19. Tela “Como cobrar?”

## Chave Pix — direta

> Ideal para balcão e clientes recorrentes.

Botões:

```text
Copiar chave Pix
Mostrar QR da chave
```

## Pix Link — profissional

> Ideal para WhatsApp, Instagram e vendas à distância.

Campo:

```text
Valor
R$ 149,90
```

Botão:

```text
Criar Pix Link
```

Resultado:

```text
https://loja.pix.wiki/149.90
```

Mostrar estimativa:

```text
Valor da venda: R$ 149,90
Tarifa estimada Mercado Pago: R$ 1,50
PixWiki: R$ 0,00
```

No histórico, substituir estimativa pelo valor real quando a API retornar a tarifa efetiva.

---

# 20. Relatórios Pix Pro

Exemplo:

```text
Resumo do mês

Chave Pix
R$ 8.420,00

Pix Link
R$ 4.850,00

Tarifas Mercado Pago
R$ 48,50

Tarifas PixWiki
R$ 0,00

Total líquido
R$ 13.221,50
```

Relatórios:

- diário;
- semanal;
- mensal;
- personalizado;
- por empresa;
- por origem;
- bruto;
- taxas;
- líquido.

Exportação:

```text
CSV
PDF
```

---

# 21. API PixWiki — Pro

Possíveis endpoints:

```text
GET /api/pixwiki/v1/receipts
GET /api/pixwiki/v1/receipts/:id
GET /api/pixwiki/v1/companies
GET /api/pixwiki/v1/summary
```

Segurança:

- chave de API por conta;
- hash no banco;
- rotação;
- revogação;
- rate limit;
- logs;
- nunca expor token Mercado Pago.

---

# 22. Webhooks PixWiki — Pro

Permitir cadastro de URL do cliente.

Evento:

```text
pix.received
```

Payload sugerido:

```json
{
  "event": "pix.received",
  "id": "receipt_uuid",
  "company_id": "uuid",
  "source": "pix_key",
  "amount": 85.00,
  "fee": 0,
  "net_amount": 85.00,
  "received_at": "..."
}
```

Segurança:

- assinatura HMAC;
- retry;
- idempotência;
- timeout;
- logs.

---

# 23. Planos no backend

Nunca bloquear recursos somente no frontend.

Criar controle de plano no banco, por exemplo:

```text
pixwiki_subscriptions
```

Planos:

```text
free
link
pro
```

Backend deve validar:

- criação de subdomínio;
- criação de segunda empresa;
- uso de WhatsApp;
- acesso a relatórios;
- API;
- webhooks externos.

---

# 24. Cobrança mensal

Reaproveitar o padrão da ConviteIA.

Preços:

```text
free = 0
link = 2990
pro  = 9990
```

Fluxo:

```text
Usuário escolhe plano
        ↓
Gera Pix da mensalidade
        ↓
pix_transactions
        ↓
Confirma pagamento
        ↓
Ativa/renova plano
```

### Downgrade/expiração

Link → Free:

- não apagar empresa;
- não apagar histórico;
- suspender subdomínio premium;
- manter confirmação da chave;
- manter Push;
- manter e-mail.

Pro → Link/Free:

- preservar configurações;
- suspender WhatsApp;
- suspender API;
- suspender recursos multiempresa conforme regra;
- nunca apagar dados automaticamente.

---

# 25. Onboarding PixWiki

Fluxo ideal:

1. Criar conta.
2. Criar primeira empresa.
3. Conectar Mercado Pago.
4. Informar/confirmar chave Pix Mercado Pago.
5. Ativar Push.
6. Confirmar e-mail de notificações.
7. Solicitar Pix de teste para a própria chave.
8. Ao detectar, mostrar “Tudo pronto”.
9. Fazer upsell do Pix Link.

Texto de upsell:

> Quer um endereço profissional como `suaempresa.pix.wiki`? Conheça o Pix Link.

Se o usuário negar Push:

- não bloquear uso;
- manter e-mail;
- permitir ativar depois.

---

# 26. Configurações por empresa

- nome;
- logo;
- chave Pix;
- tipo da chave;
- Mercado Pago conectado;
- Push ligado/desligado;
- e-mail ligado/desligado;
- endereço de e-mail;
- WhatsApp no Pro;
- telefone no Pro;
- slug no Link/Pro.

---

# 27. Histórico e retenção

Sugestão inicial:

### Free

```text
30 dias
```

### Link

Histórico completo da assinatura.

### Pro

Histórico completo + relatórios.

Não apagar dados antigos imediatamente em downgrade; limitar visualização conforme política definida.

---

# 28. Segurança

Obrigatório:

- RLS;
- service role somente backend;
- nunca expor access/refresh token Mercado Pago;
- nunca expor tokens Google;
- nunca expor REST API Key OneSignal;
- logs sem credenciais;
- API PixWiki com hash de chave;
- idempotência;
- índices únicos para pagamentos.

---

# 29. Observabilidade

Criar logs para:

- sincronização MP;
- pagamentos novos;
- pagamentos duplicados;
- refresh token;
- push;
- e-mail;
- WhatsApp;
- API;
- webhook externo.

Futuro painel administrativo pode mostrar:

```text
última sincronização
último Pix detectado
última notificação
falhas
```

---

# 30. Testes obrigatórios

## Pix Grátis

```text
Conecta Mercado Pago
↓
Configura chave
↓
Ativa Push
↓
Envia Pix direto para a chave
↓
Sincronizador detecta
↓
Dashboard mostra
↓
E-mail chega
↓
Push chega
```

Critério: **nenhum Pix duplicado**.

## Pix Link

- ativar plano;
- testar `teste.pix.wiki`;
- criar `teste.pix.wiki/1.50`;
- pagar;
- validar confirmação;
- validar origem `pixwiki_link`;
- validar bruto/tarifa/líquido;
- validar dashboard/e-mail/push.

## Pix Pro

Testar:

- WhatsApp com janela aberta;
- WhatsApp com janela fechada;
- template de confirmação;
- botão do template;
- recebimento após reativação;
- segunda empresa;
- segunda conexão Mercado Pago;
- número de WhatsApp diferente;
- relatório consolidado;
- API;
- webhook PixWiki.

---

# 31. Caso real para regressão

Usar como referência:

```text
slug: loja
email: ljcasaverde@gmail.com
```

O fluxo de WhatsApp existente dessa empresa não deve ser quebrado.

Antes de alterar componentes compartilhados de WhatsApp, testar compatibilidade.

---

# 32. Separação de responsabilidades

## Backend — executar via MCP

Inclui:

- migrations;
- tabelas;
- índices;
- constraints;
- RLS;
- RPCs;
- views;
- Edge Functions;
- cron;
- sincronização Mercado Pago;
- token refresh;
- notificações;
- planos;
- relatórios backend;
- API backend;
- webhooks backend.

## Frontend/repositório — entregar ZIP

Alterações do Next.js serão entregues em ZIP com:

- arquivos completos;
- caminhos corretos desde a raiz do repositório;
- nunca apenas diff.

Exemplo:

```text
pixwiki-update.zip
├── middleware.ts
├── app/
│   └── pix/
│       ├── page.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       └── ...
├── components/
│   └── pixwiki/
│       └── ...
└── lib/
    └── ...
```

---

# 33. Etapas manuais externas

## OneSignal

Criar app:

```text
PixWiki
```

Site:

```text
https://pix.wiki
```

Adicionar variáveis correspondentes no Vercel.

## DNS

Criar wildcard:

```text
*.pix.wiki
```

## Mercado Pago

Manter OAuth funcional e não depender do webhook para Pix espontâneo.

---

# 34. Ordem oficial de implementação

## FASE 1 — Base de recebimentos

- [ ] Criar `mp_received_payments`
- [ ] Criar índices
- [ ] Criar RLS
- [ ] Criar helper de token Mercado Pago
- [ ] Criar `pixwiki-sync-mp-receipts`
- [ ] Configurar cron
- [ ] Deduplicar pagamentos
- [ ] Classificar Chave Pix × Pix Link
- [ ] Criar view/RPC unificada
- [ ] Testar com conta real

**Resultado esperado:** Pix direto aparece automaticamente no backend PixWiki.

## FASE 2 — Notificações gratuitas

- [ ] Criar `pixwiki_notification_logs`
- [ ] Criar `pixwiki-notify`
- [ ] Criar e-mail PixWiki
- [ ] Criar app OneSignal PixWiki
- [ ] Integrar Push
- [ ] Garantir idempotência
- [ ] Testar Push + E-mail

**Resultado esperado:** Pix Grátis funcional.

## FASE 3 — Planos

- [ ] Criar estrutura de planos
- [ ] Pix Grátis
- [ ] Pix Link R$ 29,90
- [ ] Pix Pro R$ 99,90
- [ ] Mensalidades
- [ ] Upgrade
- [ ] Renovação
- [ ] Downgrade
- [ ] Expiração
- [ ] Validar recursos no backend

**Resultado esperado:** monetização funcional.

## FASE 4 — Subdomínios

- [ ] Adicionar `.pix.wiki` ao middleware
- [ ] Configurar wildcard DNS
- [ ] Configurar Vercel
- [ ] Reservar slugs
- [ ] Criar slug único
- [ ] Manter compatibilidade `/slug`
- [ ] Testar `teste.pix.wiki`
- [ ] Testar valor na URL

**Resultado esperado:** Pix Link pronto.

## FASE 5 — Dashboard novo

- [ ] Home
- [ ] Recebimentos
- [ ] Badge Chave Pix
- [ ] Badge Pix Link
- [ ] Bruto
- [ ] Tarifa Mercado Pago
- [ ] Líquido
- [ ] Tela “Como cobrar?”
- [ ] Copiar chave
- [ ] Criar link
- [ ] QR Code
- [ ] Planos
- [ ] Configurações
- [ ] Push
- [ ] E-mail
- [ ] Responsivo mobile

**Resultado esperado:** primeira versão comercial completa.

## FASE 6 — WhatsApp Pix Pro

- [ ] Integrar `enviar-whatsapp`
- [ ] Reaproveitar janela atual
- [ ] Reaproveitar template
- [ ] Reaproveitar botão de confirmação
- [ ] Criar telefone por empresa
- [ ] Logs
- [ ] Retry
- [ ] Testar com slug `loja`

**Resultado esperado:** Pro com WhatsApp.

## FASE 7 — Multiempresa

- [ ] Alterar relação `mp_connections`
- [ ] Adicionar `company_id`
- [ ] Preservar conexão existente
- [ ] Permitir múltiplas empresas no Pro
- [ ] Conectar Mercado Pago por empresa
- [ ] Configurar chave por empresa
- [ ] Configurar WhatsApp por empresa
- [ ] Dashboard consolidado

**Resultado esperado:** Pix Pro empresarial.

## FASE 8 — Relatórios

- [ ] Diário
- [ ] Semanal
- [ ] Mensal
- [ ] Período customizado
- [ ] Por empresa
- [ ] Chave Pix × Pix Link
- [ ] Bruto
- [ ] Tarifa
- [ ] Líquido
- [ ] CSV
- [ ] PDF

## FASE 9 — API e Webhooks PixWiki

- [ ] Chaves de API
- [ ] Hash
- [ ] Revogação
- [ ] Rate limit
- [ ] Endpoint de recebimentos
- [ ] Endpoint de resumo
- [ ] Endpoint de empresas
- [ ] Webhook `pix.received`
- [ ] HMAC
- [ ] Retry
- [ ] Logs

## FASE 10 — QA e lançamento

- [ ] Conta nova Free
- [ ] Pix direto
- [ ] Push
- [ ] E-mail
- [ ] Plano Link
- [ ] Subdomínio
- [ ] Pix Link
- [ ] Tarifas corretas
- [ ] Plano Pro
- [ ] WhatsApp
- [ ] Janela aberta
- [ ] Janela fechada
- [ ] Multiempresa
- [ ] API
- [ ] Relatórios
- [ ] Mobile
- [ ] Desktop
- [ ] Build
- [ ] Deploy
- [ ] Monitorar logs

---

# 35. Limpeza após conclusão

- [ ] remover/desativar `mp-webhook-test`;
- [ ] remover `mp_webhook_test_events` se não tiver mais utilidade;
- [ ] garantir que a URL Mercado Pago não dependa do proxy temporário;
- [ ] manter webhook original do Mercado Livre funcionando;
- [ ] atualizar `README-PIXWIKI.md`;
- [ ] remover documentação antiga do modelo de saldo/saque que não se aplica mais.

---

# 36. Critérios de aceite

## Pix Grátis

- [ ] usuário cria conta;
- [ ] conecta Mercado Pago;
- [ ] informa/confirma chave Pix;
- [ ] recebe Pix direto;
- [ ] pagamento aparece em aproximadamente 1 minuto;
- [ ] e-mail chega;
- [ ] Push chega;
- [ ] dinheiro permanece no Mercado Pago.

## Pix Link

- [ ] usuário paga R$ 29,90;
- [ ] escolhe slug;
- [ ] `slug.pix.wiki` funciona;
- [ ] cria link com valor;
- [ ] cliente paga;
- [ ] dashboard classifica como Pix Link;
- [ ] tarifa Mercado Pago aparece separadamente;
- [ ] PixWiki mostra taxa própria como R$ 0.

## Pix Pro

- [ ] usuário paga R$ 99,90;
- [ ] ativa WhatsApp;
- [ ] recebe alertas;
- [ ] template funciona fora da janela;
- [ ] botão reativa fluxo;
- [ ] múltiplas empresas funcionam;
- [ ] API funciona;
- [ ] relatórios funcionam.

---

# 37. Mensagens comerciais sugeridas

### Headline

> **Recebeu Pix? O PixWiki confirma.**

### Complemento

> Sua chave continua sendo sua.  
> Seu dinheiro cai direto na sua conta.  
> O PixWiki cuida da confirmação e da automação.

### Pix Grátis

> **Sua chave Pix, agora inteligente.**

### Pix Link

> **Seu endereço profissional para receber Pix.**

### Pix Pro

> **Pix profissional para sua operação.**

### Transparência

> **O PixWiki não cobra percentual sobre suas vendas.**

### Diferença

> Use sua chave Pix quando quiser receber diretamente.  
> Use o Pix Link quando quiser praticidade, página profissional e valor já preenchido.

---

# 38. Regra para decisões futuras

Antes de adicionar qualquer recurso, responder:

1. Isso ajuda a confirmar um Pix?
2. Isso ajuda o usuário a cobrar melhor?
3. Isso ajuda a automatizar o recebimento?
4. Isso aumenta o valor percebido do Link ou Pro?
5. Isso mantém o dinheiro direto na conta do cliente?

Se a resposta for “não” para todos, o recurso provavelmente não pertence ao PixWiki.

---

# 39. Estado atual confirmado

- [x] PixWiki já existe dentro do repositório minhAi.
- [x] OAuth Mercado Pago já existe.
- [x] `mp_connections` já existe.
- [x] Pix Link já gera cobranças Mercado Pago.
- [x] `pix_transactions` já registra cobranças geradas.
- [x] confirmação de cobranças Mercado Pago já existe.
- [x] Pix direto na chave foi encontrado por `/v1/payments/search`.
- [x] Pix direto de R$ 1,37 foi validado.
- [x] Pix direto de R$ 1,39 foi validado.
- [x] webhook simulado Mercado Pago foi recebido.
- [x] Pix direto real não disparou webhook de pagamento.
- [x] OneSignal já existe no minhAi.
- [x] envio Push por `userId` já existe.
- [x] Gmail API já existe no ecossistema.
- [x] sistema de WhatsApp com janela/template já existe.
- [x] fluxo real do slug `loja` é utilizado em produção.
- [x] ConviteIA já possui lógica de subdomínio que pode ser reaproveitada.
- [x] ConviteIA já possui padrão de mensalidade Pix que pode ser reaproveitado.

---

# 40. Próxima ação

Começar pela:

> **FASE 1 — Base de recebimentos**

Somente depois da FASE 1 validada avançar para notificações e planos.

Isso reduz risco e garante que toda a monetização seja construída em cima de uma detecção de Pix confiável.
