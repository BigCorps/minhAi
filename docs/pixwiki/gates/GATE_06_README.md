# PixWiki V2 — Gate 6

## Dashboard V2 + uso/franquia + previsão + canais

**Pré-requisitos:** Gate 1 atualizado, depois Gates 2, 3, 4 e 5.

Este Gate **não ativa cobrança** e **não migra assinaturas**. Ele troca a experiência do dashboard para o modelo V2 e alinha as notificações com a regra comercial já definida.

### O que entra

- Dashboard V2 com:
  - última hora;
  - hoje;
  - mês;
  - últimos recebimentos;
  - origem canônica `Chave Pix / Pix Link / Checkout / API`;
  - barra de franquia;
  - alertas em 70%, 85% e 100%;
  - projeção de uso até o fim do mês;
  - indicação da faixa mais econômica **como estimativa**.
- Nova página `Uso` com o ledger das últimas automações.
- Nova página `Cobrar`:
  - chave Pix;
  - Pix Link;
  - Pix Link com valor;
  - Checkout identificado criado pelo dashboard;
  - atalho para API.
- Relatórios liberados em todas as faixas e com as quatro origens V2.
- API & Webhooks liberados visualmente em todas as faixas.
- Header atualizado para `free/link/pro/vip`.
- Navegação sem selos artificiais `PRO`.
- Canais independentes:
  - Push liga/desliga e é gratuito;
  - E-mail liga/desliga;
  - WhatsApp liga/desliga;
  - Webhook permanece configurado em Integrações.
- `pixwiki-notify` passa a enviar Push para **todos os dispositivos ativos da empresa**, preparando owner/manager/cashier.
- Para Pix direto pela chave, E-mail + WhatsApp compartilham **uma única unidade** do receipt. O Webhook do Gate 4 reutiliza essa mesma unidade.
- Quando a franquia acaba e excedente está desligado:
  - Dashboard continua;
  - recebimento pela chave continua;
  - Push continua;
  - novas automações pagas são pausadas.

## Arquivos

```text
app/pix/dashboard/page.tsx
app/pix/dashboard/pagamentos/page.tsx
app/pix/dashboard/relatorios/page.tsx
app/pix/dashboard/api/page.tsx
app/pix/dashboard/uso/page.tsx
components/pix/PixWikiHeader.tsx
components/pix/PixWikiDashboardNav.tsx
supabase/functions/pixwiki-notify/index.ts
supabase/migrations/pixwiki_v2_gate6_dashboard_usage.sql
supabase/validation/pixwiki_v2_gate6_validate.sql
```

## Ordem de aplicação futura

1. Subir os arquivos do Gate 6 preservando os caminhos.
2. Executar `supabase/migrations/pixwiki_v2_gate6_dashboard_usage.sql`.
3. Publicar a Edge Function `pixwiki-notify` com a mesma configuração atual de secrets.
4. Fazer deploy do Next.js.
5. Executar `supabase/validation/pixwiki_v2_gate6_validate.sql`.
6. Validar manualmente o checklist abaixo.

> Não execute este Gate isoladamente sem os Gates 1–5.

## Checklist manual

### Dashboard

- [ ] Abre sem assinatura V2 criada e assume PIX GRÁTIS.
- [ ] Mostra empresa correta.
- [ ] Troca entre empresas existentes.
- [ ] Mostra última hora / hoje / mês.
- [ ] Mostra barra `0/100` para conta V2 nova sem uso.
- [ ] Projeção aparece sem gerar cobrança.
- [ ] Últimos Pix exibem origem correta.

### Canais

- [ ] Push pode ser ativado/desativado independentemente.
- [ ] E-mail exige endereço válido quando ativado.
- [ ] WhatsApp exige número válido quando ativado.
- [ ] Push chega nos dispositivos registrados daquela empresa.
- [ ] Push sozinho não cria unidade no ledger.
- [ ] Pix direto com E-mail + WhatsApp habilitados cria no máximo 1 unidade.
- [ ] Se Webhook também estiver ligado, continua no máximo 1 unidade para o receipt.

### Cobrar

- [ ] `slug.pix.wiki` abre o Pix Link V2.
- [ ] link com valor funciona.
- [ ] Checkout criado pelo dashboard retorna `pix.wiki/c/chk_...`.
- [ ] `external_id` informado aparece no contexto do Checkout/API/Webhook.

### Relatórios / API

- [ ] Relatórios abrem no PIX GRÁTIS.
- [ ] Filtro aceita `Chave Pix`, `Pix Link`, `Checkout`, `API`.
- [ ] CSV e PDF exportam.
- [ ] Integrações abrem sem exigir plano Pro.
- [ ] É possível criar/revogar chave API.
- [ ] É possível criar/testar/pausar webhook.

## Observação sobre billing

A indicação de “faixa mais econômica” neste Gate é informativa. A proteção automática de melhor preço, excedente, limite de gasto, mensal/anual e cobranças entram no Gate de billing. Até lá, este Gate não cria invoice e não muda assinatura.
