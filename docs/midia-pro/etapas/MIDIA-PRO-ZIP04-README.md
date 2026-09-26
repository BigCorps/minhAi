# Midia.Pro — ZIP 04: Pagamento + Programação

Base de referência do repositório: `BigCorps/minhAi` em `d5e4df26283da19b345795313a086bfda547d5de`.

Este ZIP deve ser aplicado **depois dos ZIPs 01, 02 e 03**. Quando o mesmo caminho existir em mais de um pacote, use a versão do ZIP de número maior.

## O que entra nesta etapa

O fluxo público agora fecha de ponta a ponta até a programação:

1. o anunciante prepara a campanha no QR da tela;
2. a reserva preliminar do ZIP03 é mantida durante o PIX;
3. o Midia.Pro gera PIX com a infraestrutura BigCorps/Banco Inter já usada pelo ecossistema;
4. a confirmação automática de `pix_transactions` converte a reserva em inventário contratado;
5. a campanha passa para `under_review`;
6. o dono da tela aprova ou solicita uma nova peça no dashboard;
7. ao aprovar, o banco cria ocorrências concretas da campanha;
8. `playlist_version` sobe e o player recebe Broadcast;
9. o player baixa/cacheia a mídia paga e intercala a publicidade nas janelas contratadas sem interromper uma mídia que já esteja tocando.

Ainda **não** há saldo/repasse ao parceiro neste ZIP. A divisão 50/50 ou 80/20, proof-of-play financeiro e saque estilo ConviteIA entram no ZIP05.

## Ordem para aplicar

### 1. GitHub

Suba os arquivos deste ZIP preservando exatamente os caminhos. Eles já são versões posteriores dos arquivos que aparecem nos ZIPs anteriores.

### 2. Supabase SQL

Abra o SQL Editor do mesmo projeto Supabase do `minhAi` e rode:

`supabase/SQL-MIDIA-PRO-ZIP04.sql`

O SQL é aditivo e cria/atualiza:

- `public.pix_transactions_purpose_check` com `midia_campaign`;
- horário operacional em `midia.screen_ad_settings`;
- campos de pagamento e revisão em `midia.campaigns`;
- `midia.campaign_payments`;
- `midia.campaign_occurrences`;
- finalização idempotente do PIX;
- revisão/agendamento transacional;
- helper único de versionamento/Broadcast do player.

Não é necessário criar bucket novo, policy pública, cron novo nem Edge Function nova nesta etapa.

## Compatibilidade com o PIX atual

Para evitar alterar/deployar as Edge Functions de pagamento que já atendem minhAi, ConviteIA e outros produtos, o route handler do ZIP04 reutiliza a **faixa de recebimento retido da plataforma** já existente em `gerar-pix-assistente`.

O request usa temporariamente `origem: conviteria` apenas como compatibilidade para:

- utilizar o `CONVITERIA_COMPANY_ID` da BigCorps;
- forçar o recebimento BigCorps/Banco Inter, sem Mercado Pago do usuário;
- silenciar e-mail/WhatsApp/push destinados ao dono da empresa-plataforma.

A identidade financeira real é `purpose = midia_campaign` e a fonte de verdade é `midia.campaign_payments`. Por isso o valor **não entra em `company_balance`** e não é contabilizado como dinheiro do parceiro nesta fase.

No endurecimento final podemos tornar `origem = midia` nativo nas Edge Functions, mas isso não é necessário para testar ou lançar este fluxo.

## Confirmação automática

O projeto já possui o fluxo de confirmação periódica de `pix_transactions`. Assim que a transação muda para `confirmed`, um trigger do ZIP04 tenta chamar `midia.finalize_campaign_payment()`.

A função:

- confere `purpose`;
- confere o valor do PIX contra o preço fotografado da campanha;
- marca `campaign_payments` como confirmado;
- converte `campaign_inventory_holds` em `converted`;
- grava `paid_at`;
- move a campanha para `under_review`.

O endpoint público de status também tenta finalizar de novo se enxergar um PIX já confirmado. Isso torna o fluxo recuperável caso um trigger encontre uma falha temporária.

## Moderação

No dashboard do dono da tela surge a seção **Publicidade da rede**.

Uma campanha paga pode ser:

- **Aprovada e agendada**: gera ocorrências e avisa o player;
- **Solicitar ajuste**: registra o motivo sem perder o pagamento nem o inventário contratado.

O anunciante continua com um cookie HttpOnly de edição por 30 dias. Se a peça for rejeitada, a própria página de checkout permite enviar outra imagem/vídeo; depois do upload a campanha volta automaticamente para `under_review`.

Vídeos de substituição precisam permanecer na mesma faixa comercial comprada (30/45/60 s). Isso impede trocar uma peça de 30 s por outra que ocupe 60 s sem pagar a diferença.

## Agenda do player

`midia.campaign_occurrences` materializa os horários contratados. O player recebe apenas uma janela móvel de aproximadamente **48 horas**, evitando manifestos enormes em campanhas de alta frequência.

O manifesto envia:

- mídias próprias;
- criativos pagos únicos;
- ocorrências pagas da janela de 48 h.

O player atualiza o manifesto por:

- Supabase Broadcast quando uma campanha é aprovada;
- heartbeat de 60 s quando a versão divergir;
- atualização periódica de 6 h para avançar a janela móvel.

As mídias pagas também entram no mesmo cache offline do ZIP02. Se a conexão cair, ocorrências já presentes no manifesto podem continuar sendo exibidas. Sem internet por mais de 48 h, o player mantém conteúdo próprio e volta a receber a agenda paga quando sincronizar.

No ZIP04 o navegador marca localmente as ocorrências pagas já reproduzidas para não repeti-las em um refresh. O registro autoritativo de proof-of-play no servidor entra no ZIP05.

## Horário da tela

O SQL adiciona por tela:

- `active_start_time` — padrão 08:00;
- `active_end_time` — padrão 20:00.

`active_minutes_per_day` passa a ser derivado desses horários. Nesta etapa eles começam com o padrão existente de 12 horas. Uma interface de edição pode ser adicionada depois sem mudar o modelo.

## O que testar quando todos os ZIPs forem unidos

1. cadastrar conta/local/tela parceira;
2. parear o player;
3. colocar uma mídia própria;
4. abrir `slug.midia.pro/anuncie/CODIGO`;
5. criar uma campanha `Experimente` de R$ 4,90;
6. gerar o PIX;
7. pagar e aguardar a confirmação automática;
8. confirmar que a campanha aparece em **Publicidade da rede** com status de revisão;
9. solicitar ajuste e reenviar a peça uma vez;
10. aprovar a peça;
11. confirmar que o player atualiza a versão e baixa a campanha;
12. para o plano Experimente, observar a mídia entrar no próximo espaço planejado sem interromper o conteúdo atual.

Para os primeiros testes de planos recorrentes, use uma tela com horário 08:00–20:00 e confira em `midia.campaign_occurrences` se os registros foram distribuídos dentro da janela correta.

## Segurança

- nenhuma chave financeira vai ao navegador;
- o checkout identifica a campanha por cookie HttpOnly + segredo de 256 bits cujo hash fica no banco;
- o valor do PIX é lido da campanha no servidor, nunca do valor enviado pelo browser;
- a confirmação exige `purpose = midia_campaign` e valor idêntico;
- só o proprietário autenticado da tela pode aprovar/rejeitar;
- URLs de preview e player continuam assinadas e temporárias;
- tabelas novas permanecem sem acesso direto para `anon`/`authenticated`.

