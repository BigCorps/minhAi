# MelhorIA

**a IA da Melhor Idade!**

Lembretes de remédio, consultas e exames, e verificação antifraude. Para quem
já não tem paciência com aplicativo complicado.

**Domínio:** melhoria.org (definido)
**Empresa desenvolvedora:** BigCorps Tecnologia Ltda
**Parte do ecossistema:** minhAi (whitelabel — mesmo repo Next.js, mesmo backend
Supabase, mesmo padrão do ConsultaTec, da ArteFinal e do Pix Wiki)

Levantamento feito sobre o repo `BigCorps/minhAi`, o banco de produção
`qyonozbroekuqlotqcbm` (124 tabelas, 24 cron jobs ativos) e a conta Vercel
`ithiels-projects`. Agosto/2026.

---

## 0. Correções ao que eu havia proposto antes

Depois de ler o `README-CONSULTATEC.md` e inspecionar o banco, três
recomendações minhas anteriores estavam erradas. Registro aqui para não
sobrarem no meio do documento:

| O que eu disse | O que o padrão realmente faz |
|---|---|
| "Criar tabelas com `user_id` em vez de `company_id`" | **Errado.** O padrão é uma company por usuário, criada por RPC `SECURITY DEFINER` no primeiro acesso. Confirmado em `ensure_my_arte_company`, `ensure_my_consultatec_company_v2` e `ensure_my_pix_wiki_company` |
| "Precisa de uma função `cobrar_credito_usuario`" | **Errado.** `cobrar_credito_se_suficiente` recebe `p_company_id`, resolve o `user_id` da company e debita `user_credits`. **Os créditos já são por usuário.** Nenhuma função nova |
| "A verificação do Google OAuth leva 2–6 semanas, começar já" | **Errado para o seu caso.** Os escopos `calendar` e `calendar.events` já estão concedidos e em uso nas 7 contas de `google_accounts`. O `redirect_uri` aponta para o domínio do Supabase, não para o domínio da marca — `melhoria.org` nem aparece na tela de consentimento |

---

## 1. O que é

Um app de lembretes para pessoa idosa. Cadastra remédio, consulta e exame; o
aparelho avisa na hora. Verifica se um boleto ou link é golpe. E tem um botão
que manda SMS para a família quando a pessoa precisa de ajuda.

**Não existe assistente de voz, wake word ou chat por voz aqui** — mesma
decisão que o ConsultaTec tomou, e pelo mesmo motivo: o produto é um formulário
direto ao ponto. O microfone existe apenas como **ditado**, convertendo fala em
texto dentro da caixa, no mesmo papel que tem no CriarNota e nos outros
auxiliares. Nada é executado a partir do que foi falado; o texto aparece na
caixa para a pessoa conferir antes de salvar.

O que é grátis: cadastrar e receber lembrete, sempre, sem limite.
O que consome crédito: câmera com IA, conversa com IA e SMS.

---

## 2. Funções e créditos

### Grátis, ilimitado

| Função | Observação |
|---|---|
| Cadastrar remédio, consulta ou exame | digitando ou ditando |
| Receber o lembrete | push OneSignal, custo zero |
| Confirmar "tomei" / "não tomei" | base do relatório de aderência |
| Grade do dia, calendário, histórico | |
| Relatório em PDF para levar ao médico | `jspdf` já está no projeto |
| Controle de estoque e aviso de "acabando" | |
| Contatos de emergência | |
| **Lista de compras** | CRUD puro, sem IA — ver 2.3 |
| **Verificar boleto pela linha digitável** | ver 2.2 |
| Sincronizar com Google Agenda | ver seção 5 |

### Com crédito

| Função | Créditos | Por quê |
|---|---:|---|
| Foto de receita → extrai remédios e posologia | 3 | OCR + extração + revisão obrigatória |
| Foto de pedido de exame → agenda | 2 | OCR + parsing de data |
| Analisar imagem de boleto ou comprovante | 2 | visão computacional |
| Analisar link suspeito | 1 | fetch + classificação |
| Conversa com a IA (por turno, digitada) | 1 | |
| **SMS, por destinatário** | **2** | mesmo valor da minhAi |

### 2.1 O SMS já custa 2 — só falta cobrar por envio

Com o valor mantido em 2, **não é preciso mexer em nada de preço**:
`assistant_functions.enviar_sms` já tem `credits_per_use = 2`, e o
`lib/functions-registry.ts` também. Sem `custom_credits_per_use`, sem migração
de preço, sem divergência entre as marcas.

Resta uma divergência real, essa sim: **hoje o crédito é cobrado ao abrir o
modal, não por SMS enviado.** O `EnviarSmsDisplay` chama `send-sms-gerente`
direto com a ANON KEY, sem nenhuma chamada de cobrança:

```ts
const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms-gerente`, {
  headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  body: JSON.stringify({ number: numeros, gerente_nome: '', motivo: mensagem }),
});
```

Quem cobra é o `register_function_usage`, disparado do navegador quando a
função é acionada. Se a pessoa mandar 5 SMS com o modal aberto, cobra uma vez.

Para cobrar por destinatário, a cobrança precisa ir para dentro do envio, no
servidor. Isso vale só para a MelhorIA — a minhAi continua como está.

**Consequência no dimensionamento:** com 3 contatos de emergência, um disparo
de pânico com SMS custa **6 créditos**. O pacote "Cuidar" (60 créditos) dá 10
disparos completos. Vale ter isso em mente ao fechar os pacotes da seção 3.5.

### 2.2 Boleto grátis pela linha digitável

Validar linha digitável **não precisa de IA**: é dígito verificador (módulo 10
nos campos, módulo 11 no geral), código do banco emissor nas posições 1–3,
fator de vencimento e valor nos últimos 10 dígitos.

Isso pega o golpe mais comum contra idoso — boleto adulterado ou de banco que
não existe — com custo zero. O `IdentificarFraudeDisplay` **já separa** linha
digitável de URL (`/^\d{47}$/` ou `/^\d{48}$/`) e manda como
`action: 'fraude_boleto_linha'`. Só falta a camada offline antes da chamada.

Só a **foto** do boleto, para quem não consegue digitar 47 dígitos, consome
crédito.

### 2.3 Lista de compras — grátis, e cabe bem aqui

Boa lembrança. Fui conferir: o `ListaComprasDisplay` (953 linhas) **não faz
nenhuma chamada de IA nem de edge function** — é CRUD puro em
`lista_compras` e `lista_compras_itens`. O `creditsPerUse: 1` no registry é
metadado declarativo; não existe custo real por trás. Entra no grátis sem
ressalva.

As tabelas são simples e já servem:

```
lista_compras        id, company_id, nome, status, total_itens, itens_pegos
lista_compras_itens  id, lista_id, nome, quantidade, pego, ordem
```

Três motivos para ela render mais aqui do que na minhAi:

1. **É a porta de entrada mais fácil.** Lista de compras não tem nada de
   médico nem de assustador. É a função que a pessoa usa no primeiro dia sem
   medo de errar, e que ensina a mexer no app antes de confiar nele para o
   remédio.
2. **Amarra com o estoque de medicamento.** Quando o cron detectar "faltam 3
   dias de losartana", o aviso pode oferecer **"adicionar à lista de compras"**
   em um toque. Isso fecha um ciclo que hoje não existe em lugar nenhum: o app
   percebe que vai faltar, e resolve.
3. **O cuidador também usa.** O filho que faz a compra do mês abre a mesma
   lista. Dá motivo para ele entrar no app fora de uma emergência.

O parser de múltiplos itens que já existe no modal (`Adicionado: leite, pão,
café`) funciona bem com ditado. Porte a lógica e refaça o visual, como nos
outros — sem `playText` a cada item marcado, que numa lista de 20 itens vira
tortura.

---

## 3. Créditos: a mecânica que já existe

### 3.1 Não crie nada — a função certa já está lá

```sql
cobrar_credito_se_suficiente(p_company_id, p_function_key, p_credits, p_metadata)
  returns table(sucesso boolean, saldo_anterior int, saldo_novo int)
```

Ela resolve o `user_id` a partir da company, trava a linha com `for update`
(evita cobrança dupla em corrida), e é **fail-closed**: saldo insuficiente
retorna `sucesso = false` sem debitar nada. Grava em `assistant_function_logs`
e em `credit_transactions`. É a função usada por todas as rotas da ArteFinal.

### 3.2 Cuidado: existem dois padrões de cobrança no repo, e um deles não serve

| RPC | Onde é chamada | Comportamento |
|---|---|---|
| `cobrar_credito_se_suficiente` | servidor (`app/api/arte/*`) | **fail-closed**, bloqueia |
| `register_function_usage` | navegador (`functionUsage.ts`) | **nunca bloqueia** |

O `register_function_usage` faz isto quando o saldo não dá:

```sql
v_new_credits := v_current_credits - p_credits_consumed;
IF v_new_credits < 0 THEN v_new_credits := 0; END IF;
-- e segue em frente
```

Zera o saldo e executa assim mesmo. Além de ser chamado do cliente,
fire-and-forget, com o erro só indo para o `console.error`.

**Para o SMS da MelhorIA, use exclusivamente `cobrar_credito_se_suficiente`, no
servidor.** O outro caminho não segura nada.

### 3.3 O bloqueio de SMS sai de graça

Como a função já é fail-closed, o comportamento que você pediu não exige lógica
nova — é só ler o retorno:

```ts
const { data } = await admin.rpc('cobrar_credito_se_suficiente', {
  p_company_id: companyId,
  p_function_key: 'enviar_sms',
  p_credits: 2,                    // por destinatário
  p_metadata: { destinatario, origem: 'panico' },
});

if (!data?.[0]?.sucesso) {
  return { enviado: false, motivo: 'sem_credito' };
}
```

Numa lista com 3 contatos, chama 3 vezes (6 créditos no total): se o saldo
acabar no segundo, o primeiro sai e os outros dois voltam `sem_credito` — e a
tela mostra exatamente isso.

### 3.4 Como comunicar o fim do crédito

O aviso não pode aparecer só no momento da emergência.

- **Saldo baixo (≤ 5):** cartão fixo na tela inicial e push para o cuidador —
  "restam 5 usos; sem eles o SMS de emergência sai do ar". Já existe cron para
  isso (`alertar-creditos-baixos-diario`, todo dia às 9h)
- **Saldo zero:** o botão de SMS fica desabilitado em cinza, com o texto "SMS
  indisponível — precisa renovar" ao lado. Nunca some da tela e nunca falha em
  silêncio depois de tocado
- **No pânico sem saldo:** a tela mostra o que **foi** feito ("avisamos João e
  Maria pelo aplicativo"), exibe 192 e 190 em letra grande, e só então oferece
  a renovação

**Quem recebe o alerta de saldo baixo e a oferta de recarga é o cuidador.** O
idoso não vê tela de compra.

### 3.5 Pacotes

Os pacotes atuais são de B2B (Grátis 20 · Starter 200/R$29,90 · Professional
1000/R$99,90 · Business 3600/R$249,90 · Enterprise 10000/R$499,90 · e dois
mensais). R$ 29,90 de entrada é caro para esse público, e quem paga é o filho.

Sugestão, com `package_type = 'melhoria'` para não misturar as vitrines:

| Pacote | Créditos | Preço |
|---|---:|---:|
| Boas-vindas | 15 | grátis |
| Cuidar | 60 | R$ 9,90 |
| Família | 150 | R$ 19,90 (destaque) |
| Família+ | 400/mês | R$ 39,90/mês |

Confirme o custo unitário do SMS na API Brasil antes de fechar. Acima de
~R$ 0,12 o pacote "Cuidar" fica apertado num cenário de disparos repetidos.

---

## 4. Arquitetura

Padrão whitelabel: **não é projeto novo**, é um host novo servido pelo mesmo
repositório Next.js e pelo mesmo Supabase.

- **Hospedagem:** cenário A (host único, sem landing separada) — `melhoria.org`
  cai direto na ferramenta via rewrite no `middleware.ts`
- **Frontend:** `app/melhoria/`
- **Backend:** Supabase compartilhado (`qyonozbroekuqlotqcbm`)
- **Deploy:** Vercel, projeto próprio apontando pro host, mesmo repo

### 4.1 As peças do padrão

| # | Arquivo | O que fazer |
|---|---|---|
| 1 | `lib/brand.ts` | `'melhoria'` em `BrandKey` + entrada em `BRANDS` (name, logo, `cor`, `corTextoBotao`, `corTexto`) |
| 2 | `lib/seo.ts` | entrada em `SEO` + `melhoriaGraph()`, espelhando `consultatecGraph()` |
| 3 | `middleware.ts` | `MELHORIA_DOMAINS = ['melhoria.org','www.melhoria.org']`, bloco de host, `'melhoria'` em `RESERVED_SUBDOMAINS`, entrada em `LLMS_TXT_BY_HOST` |
| 4 | `app/melhoria/layout.tsx` | cópia estrutural do ConsultaTec: `generateMetadata` via `resolveSeo(host)` + `JsonLd` |
| 5 | `app/melhoria/**` | `page.tsx`, `login/`, `dashboard/`, `termos/`, `aviso/`, `exclusao/` |
| 6 | `components/melhoria/**` | modais próprios (ver 4.3) |
| 7 | `public/brands/melhoria/` | `logo.png`, `favicon.png`, `og.png` 1200×630, ícones 512×512 normal + maskable com margem de 96px, `manifest.webmanifest`, `llms.txt` |

Detalhe do layout do ConsultaTec que vale copiar: a função que colapsa
`/melhoria` e `/` no mesmo canonical, senão o middleware gera duplicata de SEO.

### 4.2 Company por usuário

```sql
create or replace function public.ensure_my_melhoria_company()
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_slug text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select id into v_id from public.companies
   where user_id = v_uid and segment_key = 'melhoria'
   order by created_at asc limit 1;

  if v_id is null then
    v_slug := 'melhoria-' || replace(v_uid::text, '-', '');
    insert into public.companies (
      name, slug, user_id, assistant_type, is_active, is_public,
      webapp_enabled, segment_key
    ) values (
      'MelhorIA', v_slug, v_uid, 'smart', true, false, false, 'melhoria'
    ) returning id into v_id;
  end if;

  return v_id;
end; $$;
```

Nenhum `custom_credits_per_use` aqui: o SMS fica em 2 créditos, igual à
minhAi, e o valor global de `assistant_functions` já serve.

O `pg_advisory_xact_lock` não é detalhe: sem ele, `getUser` e
`onAuthStateChange` chamando a RPC ao mesmo tempo criam duas companies. O
ConsultaTec aprendeu isso na `v2` da função.

**Pré-requisito:** `companies.segment_key` tem FK para `assistant_segments`.
Precisa da linha nova antes:

```sql
insert into assistant_segments (segment_key, label, emoji, description, sort_order, is_active)
values ('melhoria', 'MelhorIA', '💊',
        'Assistente de lembretes e segurança para idosos, criado via melhoria.org',
        102, true);
```

(`pix_wiki` é 100, `consultatec` é 101.)

### 4.3 Modais próprios, lógica reaproveitada

O `README-CONSULTATEC.md` fecha com uma regra que vale literalmente aqui:

> Não reintroduzir comando de voz ou envio por e-mail nos modais — foram
> removidos de propósito ao portar da minhAi.

Mesma coisa. Porte a **lógica**, refaça a **camada visual**:

| Modal da minhAi | Vira | O que muda |
|---|---|---|
| `LembreteRemediosDisplay` (538 ln) | `MedicamentosModal` | sem `useModalVoiceCommand`, sem `playText`, sem tema escuro, campos de dosagem/estoque/dias novos |
| `IdentificarFraudeDisplay` (676 ln) | `VerificarModal` | mantém os dois modos e a detecção de linha digitável; sem voz; ganha a validação offline |
| `EnviarSmsDisplay` (302 ln) | `PanicoModal` | cobrança por destinatário no servidor; sem voz |
| — | `AgendamentosModal` | novo |

Reaproveite direto, sem tocar: `cobrar_credito_se_suficiente`,
`gerar-pix-assistente`, `confirmar-pix-assistente`, `send-sms-gerente`,
`camera-process`, `sendOneSignalPush`, `/auth/callback`.

### 4.4 Schema próprio, não prefixo

Existem dois padrões no banco:

- **PixWiki e ConsultaTec:** tabelas com prefixo em `public` (`pixwiki_*`, 23)
- **ConviteIA:** schema dedicado `conviteria` (24 tabelas) — é o mais recente

**Recomendo o schema dedicado `melhoria`.** Como aqui há dado sensível de
saúde, ter a fronteira no schema torna RLS, retenção e exclusão muito mais
fáceis de auditar — e evita somar mais 15 tabelas às 121 que `public` já tem.

```sql
melhoria.perfis
  id, company_id → public.companies, user_id → auth.users,
  nome, data_nascimento, foto_url, timezone default 'America/Sao_Paulo',
  tamanho_fonte ('normal'|'grande'|'gigante'), alto_contraste bool,
  falar_confirmacoes bool default false,   -- speechSynthesis, opt-in
  responsavel_legal_id null → melhoria.perfis

melhoria.cuidadores
  perfil_id, user_id, parentesco, pode_editar bool,
  recebe_escalonamento bool, recebe_panico bool,
  status ('convidado'|'ativo'), convite_token

melhoria.medicamentos
  perfil_id, nome, dosagem, forma, foto_caixa_url,
  estoque_atual numeric, estoque_alerta numeric,
  data_inicio, data_fim, observacoes, ativo,
  origem ('manual'|'receita_ia'), documento_id, revisado_por uuid

melhoria.doses                      -- a grade
  medicamento_id, horario time, dias_semana int[],  -- 0=dom
  quantidade numeric, ativo

melhoria.dose_eventos               -- as ocorrências; o cron lê daqui
  dose_id, perfil_id, previsto_para timestamptz,
  status ('pendente'|'notificado'|'tomado'|'pulado'|'perdido'),
  confirmado_em, confirmado_por, canal, escalonado_em
  unique (dose_id, previsto_para)

melhoria.agendamentos
  perfil_id, tipo ('consulta'|'exame'|'vacina'|'retorno'),
  titulo, especialidade, profissional, local, endereco, telefone_local,
  data_hora timestamptz, duracao_min,
  preparo text, jejum_horas int, levar text[],
  status, google_event_id, origem, documento_id

melhoria.agenda_alertas
  agendamento_id, disparar_em timestamptz,
  tipo ('7d'|'1d'|'3h'|'1h'|'preparo'), status

melhoria.contatos_emergencia
  perfil_id, nome, telefone, parentesco, ordem, ativo

melhoria.panico_eventos
  perfil_id, disparado_em, origem ('botao'|'texto'|'ditado'),
  latitude, longitude, precisao_m,
  contatos_notificados jsonb,          -- por contato: canal, status, erro
  sms_enviados int, sms_bloqueados_sem_credito int,
  status, cancelado_em

melhoria.verificacoes
  perfil_id, tipo ('url'|'boleto_linha'|'boleto_imagem'|'comprovante'),
  entrada, veredito ('sem_indicios'|'atencao'|'alto_risco'),
  score int, motivos jsonb, creditos_gastos int, criado_em

melhoria.documentos                  -- dado sensível de saúde
  perfil_id, tipo ('receita'|'pedido_exame'|'resultado'),
  storage_path, ocr_json jsonb,
  revisado bool default false, revisado_por, revisado_em
```

Duas armadilhas:

**Fuso.** "8 da manhã" é hora de parede, não instante. Guarde `time` + o
timezone do perfil e materialize `previsto_para` como `timestamptz` por cron
diário, 7 dias à frente. Gravar direto em UTC quebra em viagem e em mudança de
horário.

**Idempotência.** O `unique (dose_id, previsto_para)` não é opcional. Se o cron
repetir ou houver retry, o idoso não pode receber dois avisos e achar que
precisa tomar duas doses.

### 4.5 O disparo tem que sair do navegador

Este continua sendo o problema mais grave do que existe hoje.
`useLembreteWatcher.ts` guarda em `localStorage` e roda `setInterval` com
tolerância de 15 segundos — **o lembrete só existe com o app aberto na tela.**

O padrão certo já está no banco: 24 cron jobs ativos, sendo quatro deles a cada
minuto (`auto-confirmar-pix`, `pixwiki-sync-mp-receipts`,
`pixwiki-reconcile-subscriptions`, `pixwiki-webhook-retry`). Todos chamam
**edge function** via `net.http_post`, não rota Next.js:

```sql
select cron.schedule('melhoria-disparar-lembretes', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/melhoria-disparar-lembretes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  );
$$);
```

Fluxo: cron varre `melhoria.dose_eventos` pendentes com `previsto_para <=
now()` → push OneSignal → sem confirmação em 30 min escalona para o cuidador →
sem confirmação em 60 min oferece SMS (se houver crédito).

Os jobs mais novos leem a URL de `vault.decrypted_secrets`; os antigos
hardcodam. Siga os novos.

---

## 5. Autenticação e Google

### 5.1 Login

Mesmo padrão do ConsultaTec e da ArteFinal: email/senha, biometria WebAuthn com
fallback, Google e Facebook OAuth, Turnstile. O `/auth/callback` é compartilhado
e **não precisa de alteração** — já é genérico via `next` e
`requestUrl.origin`. Só muda o parâmetro:

```ts
options: { redirectTo: `${window.location.origin}/auth/callback?next=/melhoria` }
```

Pendência operacional: incluir `melhoria.org` na allowlist de redirect URLs do
Supabase Auth.

### 5.2 Conexão Google — nada a verificar

Confirmando o que você disse: o padrão é um único projeto Google do
ecossistema, e a tela de consentimento mostra a identidade minhAi para todas as
marcas. O `conviteia-google-auth-url` usa `GOOGLE_OAUTH_CLIENT_ID` do ambiente
e aponta o retorno para o **domínio do Supabase**:

```js
const redirectUri = `${supabaseUrl}/functions/v1/conviteia-google-auth-callback`;
```

Ou seja, `melhoria.org` não entra na configuração do OAuth. Nada a verificar,
nada a esperar.

E os escopos de que a MelhorIA precisa **já estão concedidos e ativos** nas 7
contas de `google_accounts`:

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
```

Só isso já derruba a Fase 0 crítica que eu tinha inventado no plano anterior.

O ConviteIA guardou a conexão Google no **próprio schema**
(`conviteria.google_conexoes`, `google_oauth_states`, `google_preferencias`,
`google_envios`), em vez de usar `public.google_accounts` — que é ligada a
`company_id` e carrega campos de Google Business que não interessam aqui. Siga
o ConviteIA: `melhoria.google_conexoes` e `melhoria.google_oauth_states`,
com as edge functions `melhoria-google-auth-url` e
`melhoria-google-auth-callback` espelhando as do ConviteIA.

### 5.3 Google Agenda: sim para consultas, com ressalva para remédios

Respondendo direto: **push é sempre o canal principal; a Agenda é espelho, não
alarme.** O Google Calendar só avisa se a pessoa tiver aquela conta logada
naquele aparelho com notificação ligada — coisas demais para dar errado quando
o que está em jogo é um anticoagulante. O OneSignal é o canal garantido.

Dito isso, o espelho na Agenda vale muito, por um motivo que não é o alarme: a
**família enxerga**. O filho abre a agenda compartilhada e vê a consulta do pai
sem precisar entrar no app.

O padrão já existe no `LembreteRemediosDisplay`: um campo `modo_lembrete` com
três valores — `'assistente' | 'calendario' | 'ambos'` — salvo em
`company_function_settings.config`, e a chamada à edge function
`criar-evento-calendario`. Herde a ideia. Mas **não herde a implementação.**

**O problema no código atual.** Ele cria um evento por dose, por dia, em laço
aninhado sequencial:

```ts
for (let dia = 0; dia < totalDias; dia++) {
  for (const horario of horariosDiarios) {
    const { error: calError } = await supabase.functions
      .invoke('criar-evento-calendario', { /* ... */ });
    if (calError) throw new Error(`Falha ao criar evento: ${calError.message}`);
  }
}
```

Três defeitos, e todos aparecem no primeiro uso real:

1. **Volume.** 3 doses por dia durante 90 dias = **270 chamadas sequenciais** à
   edge function, cada uma batendo na API do Google. O modal fica travado
   minutos, e a cota de API vai junto.
2. **Falha no meio deixa lixo.** O `throw` no primeiro erro aborta o laço com a
   agenda já meio preenchida. Não há rollback: sobram 140 eventos órfãos.
3. **Não guarda o `event_id`.** Diferente do `CreateEventModal`, que salva
   `evResult.event_id` em `customer_appointments.google_event_id`, aqui o
   retorno é descartado. Se o médico mudar a dose, o app **não tem como editar
   nem apagar** nenhum dos 270 eventos.

**A correção é evento recorrente (RRULE).** Um evento por grade de dose, com a
recorrência declarada, e o Google expande sozinho:

```ts
recurrence: ['RRULE:FREQ=DAILY;COUNT=90']                       // todo dia, 90 dias
recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=36']       // seg/qua/sex
```

Uma chamada em vez de 270. Um `google_event_id` para guardar em
`melhoria.doses`. E editar ou cancelar o tratamento inteiro vira um `PATCH` ou
`DELETE` único.

**Patch aditivo necessário:** o `criar-evento-calendario` hoje não aceita
`recurrence` — ninguém no repo passa esse campo, e não há nenhum `RRULE` em
lugar nenhum do código. Precisa repassar o array para o corpo do evento do
Google. É exatamente o tipo de mudança que o ConsultaTec já fez em
`gerar-pix-assistente`: aditiva, sem quebrar quem já chama.

**Resumo do comportamento por tipo:**

| | Push | Google Agenda | Padrão |
|---|---|---|---|
| **Consulta / exame** | sempre | evento único, cuidador como convidado | **ligado**, se houver conexão |
| **Remédio** | sempre | um evento recorrente por grade de dose | **desligado**, opt-in explícito |
| **Lista de compras** | não | não | — |

Para consulta e exame a Agenda é natural: evento único, data marcada, e dá para
adicionar o cuidador como convidado — ele recebe o lembrete no próprio celular
sem instalar nada.

Para remédio, o padrão desligado tem dois motivos. O prático: quatro doses
diárias poluem a agenda a ponto de esconder tudo o mais que estiver nela. E o
jurídico, que pesa mais.

**A ressalva de privacidade.** Gravar `💊 Losartana 50mg` no Google Calendar
exporta dado de saúde para fora do seu banco, e frequentemente para uma agenda
que outras pessoas enxergam. Isso é dado sensível do art. 11 da LGPD (seção
7.1) e **precisa de opt-in próprio e destacado**, separado do consentimento
geral e separado da conexão com o Google. Duas mitigações que valem a pena:

- **Título neutro por padrão** — "Hora do remédio" em vez do nome do
  medicamento, com o nome real só na descrição, e uma chave para quem preferir
  o nome no título
- **Deixar explícito na tela** que o evento fica visível para quem tem acesso
  àquela agenda

Se o idoso não tiver conta Google — e boa parte não tem, ou não lembra a senha
— nada disso deve travar o cadastro. A Agenda é opcional do começo ao fim; o
push sozinho já entrega o produto.

### 5.4 Ditado — sempre o gratuito

Decisão fechada: **nunca chamar Google Speech no ditado.**

O `CriarNotaDisplay` bifurca por `useIsMobile()`, que olha só
`window.innerWidth < 768`, e manda mobile para `GoogleSpeechWebSocket` (pago).
Numa loja isso é marginal porque a maioria é desktop. Na MelhorIA seria quase
todo acesso.

Troque largura de tela por detecção de recurso:

```ts
const temDitado = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
```

- **Tem** (Chrome Android, Safari iOS 14.5+, Chrome desktop) → nativo, grátis
- **Não tem** → `app/api/vosk-proxy`, que já existe no repo
- **Nunca** → Google Speech

Copie do `CriarNotaDisplay` só o que é bom: `lang = 'pt-BR'`,
`continuous = true`, `interimResults = true` e os `FIM_TRIGGERS`
("concluir", "acabou", "pronto", "fim") com normalização NFD.

**Testar no Fase 0:** o APK do Bubblewrap. Se for TWA de verdade (motor do
Chrome), a API nativa funciona. Se cair em WebView pura, não existe — e o Vosk
deixa de ser plano B e vira plano A. Meça isso com o APK na mão antes de
desenhar a tela.

Sobre o app **falar**: `window.speechSynthesis` é grátis e serve para confirmar
ação, mas **desligado por padrão**, com chave em Ajustes. Google TTS fica fora.

---

## 6. Identidade visual e acessibilidade

O ConsultaTec definiu paleta única sem dark mode. Faça igual — dark mode é
mais uma decisão que o usuário não vai entender.

| Token | Cor sugerida | Uso |
|---|---|---|
| `fundo` | `#FFFFFF` | fundo geral |
| `fundoCard` | `#F1F5F9` | cards, modais |
| `borda` | `#94A3B8` | bordas (mais escura que o padrão, para ser vista) |
| `tinta` | `#0F172A` | texto principal |
| `tintaMuted` | `#475569` | texto secundário — 7,5:1, ainda AAA |
| `destaque` | `#1D4ED8` | botões, links |
| `perigo` | `#B91C1C` | botão de pânico |

Evite o verde-limão da minhAi (`#a4c61e`): 4,6:1 sobre branco, insuficiente
aqui.

Regras de interface — isto não é acabamento, é a diferença entre o app ser
usado ou desinstalado na primeira semana:

- **Fonte base 20px**, com opção de 24 e 28. Nada abaixo de 18px
- **Alvos de toque ≥ 64px.** O padrão do setor é 44; presbiopia e tremor pedem mais
- **Uma ação por tela.** Sem abas, sem hambúrguer, sem swipe
- **Contraste 7:1** (AAA), não 4,5:1
- **Texto, nunca só ícone**
- **Sem timeout.** Nada de modal que fecha sozinho ou sessão que expira
- **Confirmação inequívoca:** ao tocar "Tomei", o cartão muda de cor, ganha ✓
  grande e a hora do registro
- **Microfone é ditado, não comando.** Ícone dentro do campo, texto aparece na
  caixa para conferir antes de salvar
- **Botão de pânico fixo**, mesma posição em todas as telas, com contagem
  regressiva de 5s para cancelar toque acidental

---

## 7. Segurança, saúde e LGPD

### 7.1 Dado de saúde é sensível (LGPD art. 5º II e art. 11)

Receita, exame, medicamento em uso e diagnóstico inferível são dados pessoais
sensíveis. Exigem consentimento **específico e destacado** — o aceite genérico
dos termos não serve. Na prática: tela própria de consentimento antes do
primeiro upload; bucket privado com RLS por `perfil_id`; retenção explícita
(sugiro 24 meses) e exclusão real em `/melhoria/exclusao`; log de acesso do
cuidador ao dado do idoso.

### 7.2 Consentimento de quem tem declínio cognitivo

Parte do público não tem capacidade civil plena para consentir. O campo
`responsavel_legal_id` existe para isso e o cadastro precisa perguntar. Vale
uma conversa com advogado antes do lançamento — barato de resolver antes, caro
depois.

### 7.3 Revisão humana obrigatória na receita

Se o OCR ler "0,25mg" como "25mg" e o app criar o lembrete sozinho, isso é uma
overdose programada. **Nenhum medicamento extraído de foto vira lembrete ativo
sem confirmação explícita de um adulto**, de preferência o cuidador, com a foto
original lado a lado. Daí os campos `revisado` e `revisado_por`.

E o app **não dá orientação médica**: não sugere dose, não diz para que serve,
não interpreta exame. Lembra, organiza e registra. Cruzar essa linha muda a
classificação regulatória (ANVISA, software como dispositivo médico).

O `assistant_segments` da clínica já traz essa regra no prompt: *"Nunca forneça
diagnósticos ou prescrições médicas."* Herde a frase.

### 7.4 Fraude: nunca dizer "é seguro"

O veredito tem três estados e o melhor deles é **"não encontramos indícios"** —
nunca "é seguro" ou "pode pagar". Um falso negativo que leva alguém a pagar um
boleto falso de R$ 3.000 é dano concreto. A tela fecha sempre com "na dúvida,
confirme com quem enviou, por telefone".

### 7.5 O botão de pânico não é o SAMU

Deixe explícito na tela e nos termos: o botão avisa os contatos cadastrados —
**não** aciona 192, 190 ou 193. Depende de rede, bateria e entrega do SMS. A
tela de confirmação mostra 192 e 190 em letra grande para o próprio usuário
ligar.

---

## 8. Fases de execução

### Fase 0 — Fundação (2–3 dias)
- [ ] `melhoria` em `BrandKey` + `BRANDS` + `SEO` + `melhoriaGraph()`
- [ ] Bloco de host no `middleware.ts` + `RESERVED_SUBDOMAINS` + `LLMS_TXT_BY_HOST`
- [ ] `app/melhoria/layout.tsx` com o colapso de canonical
- [ ] Linha `melhoria` em `assistant_segments` (sort_order 102)
- [ ] `ensure_my_melhoria_company()` com advisory lock (sem override de preço)
- [ ] Schema `melhoria` + RLS por `company_id`
- [ ] Pacotes com `package_type = 'melhoria'`
- [ ] Registrar `melhoria.org`, projeto Vercel, allowlist do Supabase Auth
- [ ] `public/brands/melhoria/` completo
- [ ] **Testar `SpeechRecognition` no APK Bubblewrap**
- [ ] `<CampoComDitado>` com detecção de recurso

### Fase 1 — Remédios (5–7 dias) ⭐ o núcleo
- [ ] `medicamentos`, `doses`, `dose_eventos` com o unique
- [ ] Cron diário de materialização (7 dias à frente)
- [ ] Cron `* * * * *` + edge `melhoria-disparar-lembretes`
- [ ] Push OneSignal com ação "Tomei" na própria notificação
- [ ] Tela "Meu dia", um cartão por dose
- [ ] Cadastro por texto com ditado no campo
- [ ] Estoque e aviso de "acabando em 3 dias"
- [ ] Escalonamento para o cuidador em 30 e 60 min
- [ ] `ListaComprasModal` portado, sem `playText` por item
- [ ] Botão "adicionar à lista" no aviso de estoque acabando

**Critério de aceite:** app fechado, celular no bolso, notificação chega na
hora. Sem isso a fase não fecha.

### Fase 2 — Consultas e exames (4–5 dias)
- [ ] `agendamentos` + `agenda_alertas`
- [ ] Alertas de 7d, 1d, 3h, 1h + alerta de preparo/jejum
- [ ] Checklist "o que levar"
- [ ] `melhoria.google_conexoes` + edge functions espelhando o ConviteIA
- [ ] **Patch aditivo em `criar-evento-calendario` para aceitar `recurrence`**
- [ ] Consulta/exame → evento único, cuidador como convidado, `google_event_id` salvo
- [ ] Remédio → um evento RRULE por grade de dose, opt-in, título neutro
- [ ] Editar/cancelar tratamento propaga para a Agenda (PATCH/DELETE pelo id)
- [ ] Compartilhar compromisso com o cuidador

### Fase 3 — Antifraude (3–4 dias)
- [ ] Validador offline de linha digitável (mod 10/11, banco, vencimento, valor)
- [ ] `VerificarModal` portado do `IdentificarFraudeDisplay`, sem voz
- [ ] `melhoria.verificacoes` + histórico
- [ ] Semáforo de três estados com a redação de 7.4

### Fase 4 — Pânico e SMS (3 dias)
- [ ] Contatos de emergência com ordem
- [ ] Botão fixo + acionamento pela caixa de texto
- [ ] Contagem regressiva de 5s
- [ ] Push para cuidadores, sempre, com link de localização
- [ ] **Cobrança por destinatário via `cobrar_credito_se_suficiente` no servidor**
- [ ] Botão de SMS desabilitado e legendado quando o saldo zerar
- [ ] Alerta de saldo baixo para o cuidador
- [ ] Tela pós-disparo: o que saiu, por qual canal, 192/190 grandes

### Fase 5 — Créditos e IA (4–5 dias)
- [ ] Vitrine + checkout PIX reusando `gerar-pix-assistente` com `brand: 'melhoria'`
- [ ] Foto de receita → OCR → **tela de revisão obrigatória** → doses
- [ ] Foto de pedido de exame → agendamento
- [ ] Chat com IA em modo simples, digitado
- [ ] Saldo em português claro ("restam 12 usos")

### Fase 6 — Painel da família (4 dias)
- [ ] Convite por link
- [ ] Aderência da semana, o que faltou, próximos compromissos
- [ ] Relatório PDF para o médico
- [ ] Notificações do cuidador

### Fase 7 — Lançamento (3 dias)
- [ ] Consentimento LGPD destacado + termos + exclusão (conteúdo jurídico
      próprio, não copiado de outro produto)
- [ ] TWA/Bubblewrap: `.aab`, `assetlinks.json`, testar sem barra do Chrome
- [ ] Observabilidade: alerta quando um disparo falhar, painel de entrega
- [ ] Teste com 5 pessoas acima de 70 anos, sem ajuda, você só observando

**Total: 4 a 6 semanas** para uma pessoa em tempo integral.

---

## 9. Play Store — ficha, declarações e o que evita reprovação

O CNPJ de tecnologia **não é problema**. O Google não pede CNAE de saúde para
aplicativo de lembrete, e as concorrentes diretas (Medisafe, MyTherapy) são
publicadas por empresas de tecnologia. O que trava não é quem publica: é o que
o aplicativo faz e como a ficha descreve.

> As regras da Play mudam com frequência. Confira no Play Console antes de
> submeter — o que está aqui reflete o estado conhecido até maio/2026, e nada
> disto é parecer jurídico.

### 9.1 A declaração de apps de saúde

O formulário separa o que é alto escrutínio. Exigem credencial:

| Categoria | Exige |
|---|---|
| Telessaúde (contato com profissional) | registro do profissional |
| Farmácia (venda ou dispensação) | licença sanitária |
| Pesquisa clínica | comitê de ética |
| Dispositivo médico (diagnostica, trata, calcula dose) | registro regulatório |

**A MelhorIA não está em nenhuma delas.** É gestão pessoal de saúde, risco
baixo. As respostas corretas:

| Pergunta | Resposta |
|---|---|
| O app fornece telessaúde? | **Não** |
| Vende, entrega ou dispensa medicamento? | **Não** |
| Envolve pesquisa clínica? | **Não** |
| É dispositivo médico? | **Não** |
| Fornece diagnóstico ou recomendação de tratamento? | **Não** |
| Calcula dose de medicamento? | **Não** |
| Coleta informações de saúde? | **Sim** — lembretes e histórico do próprio usuário |
| Compartilha dado de saúde com terceiros? | **Não** |

### 9.2 A linha que não pode ser cruzada — e como o produto já a respeita

Uma única função chega perto: a leitura de receita por foto (Fase 5).

- **Transcrever** o que está escrito, com um humano confirmando → é OCR.
- **Sugerir, ajustar ou calcular** dose → é apoio à decisão clínica, e muda a
  classificação na Play e na ANVISA (RDC 657/2022, software como dispositivo
  médico).

A revisão humana obrigatória (campos `revisado` / `revisado_por`, e a
materialização que exige `m.revisado`) não é só proteção do usuário: **é o que
mantém o produto fora da classificação de dispositivo médico.** Declare isso
explicitamente na ficha, não deixe implícito.

**Corolário permanente:** nunca adicione "verificar interação entre remédios".
Parece útil e inofensivo, e é exatamente o tipo de função que reclassifica o
produto. O mesmo vale para "para que serve este remédio" e "seu exame está
alterado".

### 9.3 SMS — o ponto não óbvio, e o mais fácil de estragar

O Google restringe fortemente `SEND_SMS` e `READ_SMS`. Aplicativo que pede
essas permissões precisa se encaixar num caso de uso permitido e costuma ser
reprovado.

**A MelhorIA passa porque o envio é server-side**, pela API Brasil, via
`send-sms-gerente`. O aplicativo **nunca pede permissão de SMS no aparelho**, e
a TWA não declara nenhuma.

> Se um dia alguém propuser "mandar pelo SMS do próprio celular para economizar
> crédito", isso **reprova o aplicativo na revisão**. A arquitetura server-side
> não é detalhe de implementação: é requisito de publicação.

### 9.4 Botão de emergência

Existe política sobre aplicativos que sugerem acionar serviços de emergência, e
o revisor lê a ficha da loja, não só o aplicativo.

A descrição não pode dar a entender que chama SAMU ou 190. O texto
"avisamos sua família" precisa estar **igual** nos três lugares: descrição da
loja, tela do aplicativo e seção 3 dos termos de uso.

### 9.5 Data safety — a parte trabalhosa

| Item | Resposta |
|---|---|
| Health info (medicamento, consulta) | coletado, **não** compartilhado |
| Personal info (nome, e-mail, telefone) | coletado |
| Contacts | coletado (contatos de emergência, digitados) |
| Location (aproximada) | coletado **só** no disparo do pânico |
| Audio | **não coletado** — ver 9.6 |
| Photos (receitas) | coletado, opcional |
| Dado é criptografado em trânsito | sim |
| Usuário pode pedir exclusão | sim — `/exclusao` |

Três regras que valem atenção:

- **Dado de saúde não pode ser compartilhado com terceiros para publicidade nem
  vendido.** Isso inclui SDK de anúncio e analytics agressivo. **Vale conferir o
  que o Microsoft Clarity, que está no `package.json`, captura nas telas da
  MelhorIA** — gravação de sessão em tela com nome de medicamento é
  compartilhamento de dado de saúde com terceiro. Se ele estiver ativo, exclua
  as rotas `/melhoria/**`.
- **Política de privacidade no domínio, acessível sem login.** O
  `/melhoria/aviso` já cumpre.
- **Exclusão de conta acessível de dentro do app E por URL pública.** O
  `/melhoria/exclusao` abre sem login e explica tudo; só o botão exige sessão.

### 9.6 Áudio: declarar "não coletado" é verdade, e isso é uma vantagem

Como o ditado usa `SpeechRecognition` nativo do navegador, **nenhum áudio sai do
aparelho** e nada é gravado no servidor. Isso permite responder "não coletado"
em Audio, o que é uma resposta significativamente mais simples de sustentar do
que declarar coleta de voz.

É mais um motivo para nunca migrar o ditado para o Google Speech: além do
custo, mudaria esta resposta da Data safety.

### 9.7 Escolhas de ficha que reduzem atrito

**Categoria:** use **"Saúde e fitness"**, não "Medicina". As duas cabem num
aplicativo de lembrete; a segunda convida perguntas do revisor.

**Classificação indicativa:** Livre. Sem conteúdo sensível, sem compras dentro
do app direcionadas a menores.

**Descrição:** verbos de organização, não de tratamento.

| Escreva | Evite |
|---|---|
| "Lembra, organiza e registra" | "Controle seu tratamento" |
| "Nunca mais esqueça um horário" | "Cuide da sua saúde" |
| "Avisa sua família" | "Proteção 24 horas" |
| "Confere indícios de golpe" | "Bloqueia fraudes" |

A frase do rodapé do aplicativo — *"A MelhorIA lembra, organiza e registra. Ela
não substitui seu médico."* — deve aparecer **também** na descrição da loja.

### 9.8 Conta de desenvolvedor

Conta de organização exige D-U-N-S e verificação de dados da empresa. CNPJ de
tecnologia serve sem ressalva. O D-U-N-S é gratuito pela Dun & Bradstreet, mas
leva de 1 a 4 semanas — **peça cedo**, não na véspera da submissão.

### 9.9 Checklist antes de submeter

- [ ] `assetlinks.json` em `public/.well-known/` com a impressão digital da
      chave de assinatura (`bubblewrap fingerprint generateAssetLinks`)
- [ ] Abrir o APK e confirmar que **não aparece a barra do Chrome** — se
      aparecer, o assetlinks está errado
- [ ] Confirmar que o ditado funciona no APK (se falhar, `fallbackType` não
      está em `customtabs`)
- [ ] Microsoft Clarity desativado nas rotas `/melhoria/**`
- [ ] `/aviso` e `/exclusao` abrindo **sem login**, em janela anônima
- [ ] Descrição da loja sem verbo de tratamento (tabela 9.7)
- [ ] Aviso do botão de emergência idêntico nos três lugares
- [ ] Declaração de saúde respondida conforme 9.1
- [ ] Data safety conforme 9.5, com Audio = não coletado
- [ ] Categoria "Saúde e fitness"
- [ ] D-U-N-S emitido

---

## 10. O que NÃO fazer (decisões tomadas, não reabrir sem motivo)

- **Não reintroduzir assistente de voz, wake word ou comando falado.** O
  microfone é ditado e só. Mesma decisão do ConsultaTec
- **Não usar WhatsApp.** Só push e SMS
- **Não chamar Google Speech nem Google TTS.** Ditado é `SpeechRecognition`
  nativo com fallback Vosk; fala é `speechSynthesis`, opt-in
- **Não usar `register_function_usage` para cobrar SMS** — ele zera o saldo e
  executa assim mesmo. Só `cobrar_credito_se_suficiente`, no servidor
- **Não criar função de crédito nova.** A existente já é por usuário
- **Não criar projeto Google novo.** Cliente OAuth compartilhado, identidade
  minhAi na tela de consentimento, redirect no domínio do Supabase
- **Não importar os modais da minhAi inteiros.** Porte a lógica, refaça o visual
- **Não deixar lembrete disparando no navegador.** Cron + edge function
- **Não criar um evento de Agenda por dose.** RRULE, um por grade, com o
  `google_event_id` guardado. O laço aninhado do `LembreteRemediosDisplay` é o
  anti-padrão, não o modelo
- **Não usar a Agenda como canal principal de aviso.** Push é o alarme; a
  Agenda é espelho
- **Não gravar nome de medicamento na Agenda sem opt-in próprio.** Título
  neutro por padrão
- **Não gerar lembrete a partir de foto de receita sem revisão humana**
- **Não dizer "este boleto é seguro"** — sempre "não encontramos indícios"
- **Não prometer acionamento de SAMU/190** no botão de pânico
- **Não mover o envio de SMS para o aparelho.** `SEND_SMS` é permissão
  restrita e reprova o aplicativo na Play. O envio é server-side, e isso é
  requisito de publicação, não preferência de arquitetura
- **Não adicionar "interação entre remédios", "para que serve" ou "seu exame
  está alterado".** Qualquer uma reclassifica o produto como dispositivo médico
- **Não deixar o Microsoft Clarity gravando as telas `/melhoria/**`** — é
  compartilhamento de dado de saúde com terceiro

---

## 11. Próximo passo

Fase 0 + Fase 1 como entrega única, e teste em campo com uma pessoa real antes
de escrever qualquer linha da Fase 2. Se o lembrete funcionar com o celular no
bolso e a pessoa entender a tela sem ajuda, o resto é execução. Se não
funcionar, nada mais importa.
