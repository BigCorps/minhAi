# PixWiki V2 — Gate 5: Onboarding de ativação real

Este pacote é **incremental** e deve ser aplicado **depois dos Gates 1, 2, 3 e 4**.

## O que entra neste Gate

### 1. Landing sem pedir chave Pix antes da hora
A criação de conta passa a pedir apenas:
- empresa/recebedor;
- e-mail opcional;
- WhatsApp opcional;
- logo opcional.

A chave Pix só é informada depois que o usuário já está autenticado e conectou o Mercado Pago.

### 2. Onboarding persistente
Nova rota:

`/pix/onboarding/page.tsx`

Em `pix.wiki`, a URL pública continua limpa:

`https://pix.wiki/onboarding`

O estado é persistido no banco. Se o usuário fechar a aba, voltar outro dia ou passar pelo login novamente, a configuração é retomada do ponto correto.

### 3. Fluxo principal
1. Criar/recuperar empresa PixWiki.
2. Conectar Mercado Pago.
3. Confirmar chave Pix da própria conta Mercado Pago.
4. Escolher Push, E-mail e WhatsApp de forma independente.
5. Fazer um Pix real para a própria chave.
6. PixWiki usa o `fast-watch` já existente e confirma automaticamente.
7. Exibe **“Sua PixWiki está funcionando.”**
8. Usuário pode ir direto ao Dashboard ou continuar conhecendo o produto.

### 4. Exploração sem consumir franquia
O onboarding consegue criar objetos com `is_test=true` para:
- Pix Link;
- Checkout;
- API.

Esses testes usam o motor criado nos Gates 2–4 e **não consomem automações**.

No teste da API:
1. é criada uma API Key temporária;
2. é executado um `POST /checkouts` de teste;
3. a resposta real é exibida;
4. a chave temporária é revogada automaticamente.

### 5. Primeiro Pix real
O teste só começa quando o usuário clica em **“Estou pronto — aguardar meu Pix”**.

A partir desse instante, o banco só aceita como primeira confirmação um Pix aprovado recebido depois do início do teste. Isso reduz o risco de um recebimento histórico ser interpretado como ativação.

O valor sugerido é R$ 1,00, mas a confirmação não depende exatamente desse valor.

### 6. Lead score validado no servidor
O score é recalculado automaticamente a partir de eventos realmente verificados:
- conta criada: +5;
- Mercado Pago conectado: +15;
- chave configurada: +10;
- primeiro Pix: +20;
- Push real no dispositivo: +5;
- e-mail: +5;
- WhatsApp: +10;
- Pix Link testado: +10;
- Checkout testado: +15;
- API testada: +20;
- webhook testado: +20;
- volume declarado >= 10 mil Pix/mês: +30;
- preços/calculadora vistos: +5;
- interesse em plano pago: +10.

O frontend não tem mais permissão de editar diretamente o estado comercial; as alterações passam pelas RPCs do Gate 5.

### 7. Calculadora
O usuário informa:
- Pix por mês;
- ticket médio;
- percentual atual, valor fixo, gratuito ou desconhecido.

A recomendação usa `pixwiki_v2_quote_monthly_usage` do Gate 1 e salva no funil:
- custo atual estimado;
- faixa PixWiki mais econômica;
- custo PixWiki;
- economia estimada;
- plano de interesse.

A comparação usa a taxa informada pelo próprio usuário, sem tabela fixa de concorrentes.

## Arquivos substituídos

- `app/pix/page.tsx`
- `app/pix/login/page.tsx`

## Arquivo novo

- `app/pix/onboarding/page.tsx`

## Banco

Executar:

`supabase/migrations/pixwiki_v2_gate5_onboarding.sql`

Depois executar somente para conferência:

`supabase/validation/pixwiki_v2_gate5_validate.sql`

## O que este Gate NÃO faz

- Não troca ainda o billing/assinatura legado pelo billing V2.
- Não cobra automaticamente plano nem excedente.
- Não cria ainda o painel comercial de vendedores no Admin BigCorps.
- Não altera os preços efetivamente cobrados pelo endpoint legado de assinatura.
- Não implementa ainda a tela definitiva de uso/franquia do dashboard.

A landing já apresenta as faixas comerciais V2 para manter a mensagem coerente com o onboarding, mas os botões são **“testar primeiro”** e não iniciam cobrança neste Gate.

## Ordem de aplicação

1. Gate 1 atualizado
2. Gate 2
3. Gate 3
4. Gate 4
5. **Gate 5**

## Validação funcional recomendada

### Novo usuário Google
1. Abrir `pix.wiki`.
2. Informar somente nome da empresa.
3. Continuar com Google.
4. Confirmar que retorna para `/onboarding`.
5. Conectar MP.
6. Confirmar retorno para o onboarding.
7. Informar chave Pix.
8. Escolher canais.
9. Iniciar teste do primeiro Pix.
10. Fazer Pix de R$ 1,00 por outra conta.
11. Confirmar mudança automática para “Sua PixWiki está funcionando”.

### Novo usuário e-mail
Repetir o fluxo, incluindo confirmação de e-mail. Se ele voltar pelo `/login` com o cadastro V2 pendente no navegador, deve ser enviado ao onboarding e não ao dashboard vazio.

### Testes opcionais
- Criar Pix Link de teste e abrir a URL.
- Criar Checkout de teste e abrir a URL.
- Executar API de teste e conferir a resposta JSON.
- Confirmar que as sessões estão com `is_test=true`.
- Confirmar que o ledger não aumentou por esses testes.

### Retomada
Fechar a aba em cada etapa e abrir `/onboarding` novamente. O fluxo deve continuar do estado já persistido.

## Segurança

- Tokens Mercado Pago não são enviados ao frontend.
- API Key criada no teste é temporária e revogada no mesmo fluxo.
- O primeiro Pix é validado no backend.
- Marcos de Link/Checkout/API são confirmados contra objetos de teste existentes.
- Estado de lead não aceita `INSERT/UPDATE` direto do papel `authenticated`.
- As RPCs verificam `auth.uid()` e propriedade da empresa antes de qualquer alteração.
