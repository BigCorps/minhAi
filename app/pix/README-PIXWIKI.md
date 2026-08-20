# PixWiki — Arquitetura e estado atual

Atualizado em: **20/08/2026**

> **Fonte de verdade atual:** este arquivo + `STATUS-IMPLEMENTACAO-PIXWIKI.md`.
> `PLANO-IMPLEMENTACAO-PIXWIKI.md` registra o planejamento original e deve ser
> tratado como histórico quando divergir destes documentos.

## 1. O que é

O **PixWiki** é uma camada de confirmação e organização de recebimentos Pix.

Ele **não é banco, carteira digital nem conta de pagamento**. O dinheiro entra
diretamente na conta Mercado Pago conectada pelo recebedor. O PixWiki consulta,
normaliza e exibe esses recebimentos, envia notificações e oferece páginas de
cobrança.

Domínio principal: `https://pix.wiki`

Operação: BigCorps Tecnologia Ltda  
Tecnologia: minhAi

## 2. Provedor atual

O provedor financeiro ativo no lançamento é o **Mercado Pago**.

A conexão é feita por OAuth. O PixWiki não pede nem armazena a senha da conta
Mercado Pago do usuário.

Dois fluxos são acompanhados:

- **Chave Pix:** o cliente transfere diretamente para a chave do recebedor.
- **Pix Link:** o PixWiki cria uma cobrança com valor e apresenta QR Code /
  copia-e-cola na página do recebedor.

Eventuais tarifas do Mercado Pago dependem do tipo de recebimento. O PixWiki
não promete tarifa zero e não calcula tarifa estimada no painel: mostra o valor
líquido efetivamente registrado.

## 3. Planos

### Pix Grátis — R$ 0

- confirmação automática;
- painel e histórico;
- Chave Pix;
- avisos por e-mail;
- Web Push.

### Pix Link — R$ 29,90/mês

Tudo do Pix Grátis, mais:

- endereço `seunome.pix.wiki`;
- página profissional de cobrança;
- link com valor preenchido;
- QR Code e copia-e-cola;
- histórico completo.

### Pix Pro — R$ 99,90/mês

Tudo do Pix Link, mais:

- avisos por WhatsApp;
- várias empresas/recebedores;
- relatórios e exportação;
- API PixWiki;
- Webhooks PixWiki.

## 4. Arquitetura atual

O PixWiki vive no repositório `BigCorps/minhAi`, compartilhando Next.js,
Supabase e Vercel com outras marcas.

Principais componentes:

- `app/pix/` — landing, login, dashboard e páginas públicas;
- `pixwiki_mp_connections` — conexão Mercado Pago por recebedor;
- `pixwiki_payment_settings` — configuração de chave/conexão;
- `mp_received_payments` — recebimentos detectados e normalizados;
- `pixwiki-sync-mp-receipts` — sincronização periódica com overlap e dedupe;
- `pixwiki-refresh` — atualização manual autenticada;
- `pixwiki-notify` — orquestra notificações;
- `pixwiki-send-email` — e-mail;
- `enviar-whatsapp` — entrega WhatsApp do plano Pro;
- `pixwiki-api` / `pixwiki-api-admin` — API;
- `pixwiki-webhook-dispatch` — Webhooks PixWiki.

O dashboard também recebe novos registros pelo Supabase Realtime.

## 5. Regra de propriedade

Cada recebimento deve permanecer ligado ao mesmo:

- usuário;
- recebedor/empresa;
- conexão Mercado Pago.

A releitura de um pagamento não pode mover o histórico entre empresas.

## 6. Rotas compartilhadas com a minhAi

`app/pix/[slug]` e `app/pix/[slug]/[valor]` são compartilhadas.

A regra obrigatória é:

- host `pix.wiki` ou `*.pix.wiki` → comportamento PixWiki;
- hosts da minhAi → comportamento legado `PixLinkPage`.

Nunca filtrar essas rotas globalmente por `segment_key = 'pix_wiki'`, pois isso
derruba os links Pix antigos da minhAi.

## 7. Notificações

Fluxo validado:

1. recebimento é detectado;
2. registro é deduplicado;
3. `pixwiki-notify` é acionado;
4. canais habilitados recebem o aviso.

Canais atuais:

- Push;
- e-mail;
- WhatsApp no Pix Pro;
- Webhook de integração no Pix Pro.

Falha em um canal não deve desfazer nem bloquear o recebimento.

## 8. SEO/GEO

A fonte central é `lib/seo.ts`.

`app/pix/layout.tsx` usa `SEO.pix` e `pixGraph()` dessa fonte; não deve manter
um segundo modelo comercial independente.

O modelo atual nunca deve usar as expressões antigas:

- saldo PixWiki;
- saque PixWiki;
- 1% no saque;
- dinheiro custodiado pelo PixWiki.

## 9. Diagnósticos temporários

Em 20/08/2026 foram neutralizados (404):

- `mp-webhook-test`;
- `pixwiki-phase9-selftest`;
- `pixwiki-webhook-sink-test`;
- `pixwiki-mp-debug-safe`;
- `pixwiki-onesignal-user-status`.

A tabela temporária `mp_webhook_test_events` foi removida.

## 10. Próximo provedor

Banco Inter está em avaliação para uma fase posterior ao lançamento. Não faz
parte do fluxo de produção atual e não deve ser citado como provedor ativo em
páginas públicas ou documentos legais.

## 11. Estado de lançamento

Fases 1–9: concluídas.  
Fase 10: fechamento de QA e lançamento.

Consulte `STATUS-IMPLEMENTACAO-PIXWIKI.md` para o checklist atualizado.
