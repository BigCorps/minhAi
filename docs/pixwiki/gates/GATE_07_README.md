# PixWiki V2 — Gate 7: Equipe, Funcionários e Caixa

Este Gate deve ser aplicado **depois dos Gates 1, 2, 3, 4, 5 e 6**. Ele é apenas o delta do Gate 7.

## O que entra

- papéis PixWiki `owner`, `manager` e `cashier`;
- convites de equipe com aceite explícito;
- convite de usuário novo via Supabase Auth;
- usuário que já possui conta recebe o convite no próximo login;
- criação de senha no primeiro acesso de contas nascidas por convite;
- página **Dashboard → Equipe**;
- página operacional separada **/caixa**;
- redirecionamento automático conforme o papel no login;
- Push por empresa para proprietário, gerente e caixa;
- remoção de membro desativa Push imediatamente para aquela empresa;
- Caixa recebe somente totais da última hora/hoje e últimos 20 Pix;
- Caixa não recebe chave Pix, ID Mercado Pago, payer, metadata, API, billing, relatórios completos ou configurações.

## Regras de permissão

### Proprietário
Pode convidar, promover, rebaixar e remover gerentes/caixas. Não pode perder o próprio papel por este fluxo.

### Gerente
Usa o Dashboard administrativo e pode convidar/remover **somente Caixas**. Não pode criar outro gerente, promover caixa para gerente, remover gerente ou alterar o proprietário.

### Caixa
Usa somente `/caixa`. Pode ativar Push no próprio dispositivo e visualizar:
- total/quantidade da última hora;
- total/quantidade de hoje;
- últimos recebimentos com valor, horário e origem.

## Arquivos

- `supabase/migrations/pixwiki_v2_gate7_team_cashier.sql`
- `supabase/validation/pixwiki_v2_gate7_validate.sql`
- `supabase/functions/pixwiki-team-admin/index.ts`
- `app/pix/dashboard/equipe/page.tsx`
- `app/pix/equipe/aceitar/page.tsx`
- `app/pix/caixa/page.tsx`
- `app/pix/login/page.tsx`
- `app/pix/dashboard/page.tsx`
- `components/pix/PixWikiDashboardNav.tsx`

## Ordem futura de aplicação

1. Subir os arquivos deste Gate preservando os caminhos.
2. Executar `pixwiki_v2_gate7_team_cashier.sql`.
3. Publicar a Edge Function `pixwiki-team-admin`.
4. Confirmar que `https://pix.wiki/equipe/aceitar` está permitido nos Redirect URLs do Supabase Auth. Se não estiver, adicionar antes de testar convite de usuário novo.
5. Executar `pixwiki_v2_gate7_validate.sql`.
6. Rodar os Security Advisors do Supabase após a migration.

## Matriz de teste

### Proprietário
1. Abrir `Dashboard → Equipe`.
2. Convidar um e-mail como `Caixa`.
3. Convidar outro e-mail como `Gerente`.
4. Alterar um usuário Caixa para Gerente e voltar para Caixa.
5. Remover um usuário.
6. Confirmar que o proprietário não oferece opção de remoção/alteração.

### Gerente
1. Entrar com a conta gerente.
2. Abrir `Equipe`.
3. Criar um convite Caixa — deve funcionar.
4. Tentar criar Gerente — deve falhar no backend.
5. Tentar remover outro Gerente — deve falhar no backend.

### Caixa
1. Aceitar o convite.
2. Confirmar redirecionamento para `/caixa`.
3. Ativar Push.
4. Fazer um Pix real na empresa.
5. Confirmar Push e atualização de `Última hora`, `Hoje` e `Últimos Pix`.
6. Acessar manualmente `/dashboard`: deve redirecionar para `/caixa` se a conta só possuir papel Caixa.
7. Tentar consultar `mp_received_payments` diretamente com a sessão Caixa: deve retornar zero linhas/erro de RLS.

## Convites

Convites expiram em 7 dias. O papel só é efetivado após aceite explícito. Para uma conta já existente, o convite fica ligado ao e-mail autenticado e o login do Gate 7 detecta o convite pendente automaticamente.

Se o serviço de e-mail do Supabase falhar ao enviar um convite novo, o convite permanece salvo. A pessoa ainda poderá criar/entrar na conta usando o mesmo e-mail e aceitar o acesso.

## O que este Gate NÃO faz

- não ativa billing/overage;
- não migra assinaturas;
- não cria cobrança de plano;
- não altera a lógica dos 11 slots;
- não muda Checkout/API/Webhooks dos Gates anteriores.
