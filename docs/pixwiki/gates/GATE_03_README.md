# PixWiki V2 — Gate 3

## Checkout público + fila visual + Pix Link no motor V2

Este ZIP é **incremental** e pressupõe que o **Gate 1 atualizado** e o **Gate 2** já tenham sido aplicados.

## O que entra neste gate

- Página pública canônica de Checkout:
  - `https://pix.wiki/c/chk_...`
- UX completa da fila dos 11 slots:
  - `Preparando seu Pix…`
  - posição na fila quando houver mais de um Checkout aguardando;
  - retry automático sem botão;
  - aquisição automática assim que um slot fica disponível.
- QR Pix temporário com contagem regressiva.
- Ao expirar o QR sem pagamento, a própria tela volta ao motor, encerra a reserva antiga e tenta adquirir um novo slot.
- Confirmação automática do pagamento em segundo plano.
- Botão manual `Já paguei, verificar agora` como fallback.
- Exibição do desconto por conveniência de R$0,01 a R$0,10 somente quando ele realmente existir.
- Redirect para `success_url` após confirmação em Checkouts integrados.
- Pix Link público passa a criar sessão V2.
- `empresa.pix.wiki` e `empresa.pix.wiki/149,90` passam a ser roteados nativamente no Vercel.
- Qualquer empresa PixWiki ativa pode servir Pix Link; plano deixa de ser feature gate.
- A franquia continua sendo verificada pelo motor V2 antes de criar a automação.

## O que NÃO entra ainda

- onboarding novo;
- primeiro Pix guiado;
- dashboard de uso/franquia;
- Equipe/Caixa;
- billing visual;
- CRM/lead score.

Esses itens entram nos próximos gates.

---

## Arquivos do ZIP

```text
supabase/migrations/pixwiki_v2_gate3_public_checkout.sql
supabase/validation/pixwiki_v2_gate3_validate.sql
app/pix/c/[token]/page.tsx
components/pix/PixWikiV2PaymentPage.tsx
components/pix/PixWikiLinkPage.tsx
vercel.json
```

### NOVOS

- `app/pix/c/[token]/page.tsx`
- `components/pix/PixWikiV2PaymentPage.tsx`
- migration e validação do Gate 3.

### SUBSTITUI

- `components/pix/PixWikiLinkPage.tsx`
- `vercel.json`

O `vercel.json` deste gate mantém os 3 crons existentes e acrescenta somente as rewrites do wildcard `*.pix.wiki`.

---

## Ordem futura de aplicação

1. Aplicar o **Gate 1 atualizado**.
2. Aplicar o **Gate 2** e implantar:
   - `pixwiki-v2-checkout` com `verify_jwt=false`;
   - `pixwiki-api` com `verify_jwt=false`.
3. Subir os arquivos deste Gate 3 preservando os caminhos.
4. Executar:

```text
supabase/migrations/pixwiki_v2_gate3_public_checkout.sql
```

5. Fazer deploy normal no Vercel.
6. Executar:

```text
supabase/validation/pixwiki_v2_gate3_validate.sql
```

---

## Fluxo do Pix Link depois deste gate

```text
cliente abre empresa.pix.wiki/100
            ↓
PixWiki cria sessão V2 de R$100
            ↓
nenhum valor estava reservado antes
            ↓
cliente chega à tela de pagamento
            ↓
PixWiki tenta adquirir um dos 11 valores
            ↓
R$100,00 ... R$99,90
       ↓              ↓
   disponível       todos ocupados
       ↓              ↓
   gera QR        Preparando seu Pix…
                      ↓
                retry automático
```

O Checkout aberto não ocupa slot até a geração do pagamento.

---

## Fluxo de expiração curta

O QR V2 usa o TTL definido no Gate 2 (`120 s` por padrão).

Se não houver pagamento:

```text
QR expira
   ↓
intent antigo → expired
transação antiga → expired
   ↓
Checkout volta para queued
   ↓
novo slot / novo QR
```

A sessão principal de Checkout continua válida pelo período maior configurado no Gate 2.

---

## Rollback operacional do Pix Link

`PixWikiLinkPage.tsx` possui fallback para o motor antigo somente quando o V2 estiver tecnicamente indisponível, por exemplo:

- Edge Function V2 ainda não implantada;
- `pix_link_v2_enabled=false`;
- runtime V2 ausente;
- falha 5xx do motor novo.

**Erros comerciais não fazem fallback.**

Por exemplo, se a franquia V2 acabou, a tela não cria cobrança no motor antigo para burlar o limite.

---

## Segurança do Checkout público

A URL contém somente o token opaco:

```text
https://pix.wiki/c/chk_<token aleatório>
```

Não ficam na URL:

- valor autoritativo;
- `company_id`;
- `external_id`;
- cliente;
- metadata;
- chave Pix;
- ID Mercado Pago.

O Server Component busca somente dados seguros para montar a identidade visual. O valor verdadeiro continua vindo da sessão criada no backend.

---

## Como validar visualmente

### Teste A — Pix Link simples

Abra:

```text
https://SEU-SLUG.pix.wiki
```

Esperado:

1. informar um valor;
2. clicar `Pagar com Pix`;
3. aparecer QR;
4. pagamento real ser confirmado automaticamente.

### Teste B — valor na URL

Abra:

```text
https://SEU-SLUG.pix.wiki/1,00
```

Esperado: a cobrança de R$1,00 é criada automaticamente sem pedir o valor novamente.

### Teste C — Checkout criado pela API

Crie um Checkout pelo endpoint do Gate 2 e abra a `checkout_url` retornada:

```text
https://pix.wiki/c/chk_...
```

Esperado: nome do recebedor, descrição, valor, QR e confirmação.

### Teste D — fila dos 11 slots

Use o mesmo recebedor e o mesmo valor em 12 sessões diferentes.

1. Gere QR nas primeiras 11 sessões sem pagar.
2. Abra a 12ª sessão.
3. A 12ª deve mostrar `Preparando seu Pix…`.
4. Pague uma das 11 ou aguarde um QR expirar.
5. A 12ª deve receber um slot automaticamente, sem recarregar a página.

### Teste E — desconto

Quando houver colisão de mesmo valor, confirme que a tela mostra, por exemplo:

```text
Valor original: R$100,00
Desconto por conveniência PixWiki: -R$0,03
Pagar: R$99,97
```

O recebedor continua vendo a compensação desse desconto no ledger/billing V2 em gate posterior.

---

## Critérios de aprovação do Gate 3

- `pix_link_v2_enabled=true`.
- `empresa.pix.wiki` funciona no deploy Vercel.
- `empresa.pix.wiki/VALOR` funciona.
- `/c/chk_...` funciona no domínio `pix.wiki`.
- QR expira e é renovado sem travar a sessão.
- 12º pagamento igual entra na fila.
- fila libera automaticamente quando um slot fica disponível.
- pagamento confirmado encerra polling e mostra sucesso.
- `success_url` funciona após Checkout de API.
- erro de franquia não cai no motor legado.
- Pix Link antigo continua disponível como rollback técnico.

Se tudo isso passar, o próximo é o **Gate 4 — API V2/Webhooks enriquecidos + contexto de pedido/cliente/metadata na operação**.
