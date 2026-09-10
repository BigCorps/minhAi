# MelhorIA — passos manuais após subir o ZIP

## 1. Criar um app OneSignal próprio para `melhoria.org`

O Web Push é vinculado à origem do site. Portanto `https://melhoria.org` deve usar a própria configuração OneSignal; não reutilize a origem de `minhai.app` como configuração definitiva.

No OneSignal:

1. Crie/abra um app para **MelhorIA**.
2. Vá em **Settings > Push & In-App > Web**.
3. Configure a integração Web para código customizado.
4. Site URL: `https://melhoria.org`.
5. Use `melhoria.org` como origem canônica. Se `www.melhoria.org` existir, mantenha redirecionamento para `https://melhoria.org` em vez de criar inscrições nas duas origens.
6. Service Worker: `/OneSignalSDKWorker.js`, escopo `/`.
7. Ative **Auto Resubscribe**.
8. Copie o **App ID** e a **REST API Key**.

O arquivo `public/OneSignalSDKWorker.js` já existe no repositório e não precisou ser alterado neste pacote.

## 2. Vercel — variáveis do projeto minhAi

Adicione em **Production**:

```text
NEXT_PUBLIC_MELHORIA_ONESIGNAL_APP_ID=<App ID do MelhorIA>
MELHORIA_ONESIGNAL_REST_API_KEY=<REST API Key do MelhorIA>
```

Não remova as variáveis OneSignal antigas, porque outros produtos podem continuar usando-as.

Depois de salvar as variáveis, faça um novo deploy do commit contendo este ZIP. A variável `NEXT_PUBLIC_...` precisa existir no momento do build para entrar no bundle do navegador.

## 3. Supabase — Secrets das Edge Functions

No projeto Supabase usado pela minhAi/MelhorIA, adicione:

```text
MELHORIA_ONESIGNAL_APP_ID=<App ID do MelhorIA>
MELHORIA_ONESIGNAL_REST_API_KEY=<REST API Key do MelhorIA>
```

Os workers já publicados procuram primeiro essas variáveis e só usam `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` antigas como fallback. Portanto não substitua nem apague os secrets compartilhados.

## 4. Supabase Auth — URL de callback

Em **Authentication > URL Configuration**, confirme que o fluxo OAuth pode voltar para:

```text
https://melhoria.org/auth/callback
```

Se `www.melhoria.org` apenas redireciona para a origem principal, prefira manter a autenticação sempre em `https://melhoria.org`.

## 5. Testes de aceitação

Faça estes testes com uma conta de teste do MelhorIA:

1. Abra `/melhoria/login`: não deve existir botão de rosto/digital; Google e e-mail/senha continuam funcionando.
2. Teste login Google e login e-mail/senha.
3. Tente um link com `?next=https://exemplo.com`: após o login ele **não** deve redirecionar para domínio externo.
4. Aceite o consentimento de saúde e cadastre um medicamento com dose alguns minutos à frente.
5. Autorize notificações, feche o aplicativo/site e confirme que o push chega no horário.
6. Confirme que “Meu dia” não mistura doses do dia anterior/seguinte perto da meia-noite.
7. Com cuidador cadastrado, deixe uma dose sem confirmação: valide o push de cuidador após ~30 min.
8. Com telefone no cuidador e créditos, valide o SMS após ~60 min. O mesmo cuidador não deve receber SMS duplicado em novas execuções do cron.
9. Teste o botão **AJUDA**. Se nenhum canal entregar, a interface deve dizer que não conseguiu avisar; ela só deve afirmar “Avisamos sua família” se houver push ou SMS realmente entregue.
10. Em **Meus dados**, retire a autorização de saúde digitando `RETIRAR AUTORIZAÇÃO`. Remédios, doses, consultas/exames e documentos de saúde devem desaparecer; conta, créditos, contatos de emergência e vínculos dos outros produtos devem permanecer.
11. Depois da retirada, o chat pode continuar respondendo assuntos gerais, mas não deve receber como contexto a lista antiga de medicamentos/agenda.
12. Teste o microfone. Em navegador com reconhecimento local disponível ele pode aparecer; sem suporte local ele deve ficar oculto e os campos continuam digitáveis.
13. Teste `/melhoria/exclusao` e confirme que a solicitação identifica o produto como MelhorIA.

## 6. Não execute novamente as migrations deste ZIP no mesmo Supabase

Elas já foram aplicadas via MCP. Os arquivos estão no ZIP apenas para versionar no GitHub exatamente o que está em produção.
