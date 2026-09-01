# BigCorps — GTM/GA4 para apps no repo minhAi

Este pacote mantém a camada de analytics já usada pelos produtos existentes e acrescenta **MelhorIA** e **FuncionarIA** sem alterar regras de negócio, onboarding, autenticação, cobrança, Supabase ou a página Slug.

## Containers e propriedades

| Produto | Host que carrega o GTM | GTM | GA4 |
|---|---|---|---|
| ArteFinal ferramenta | `ia.artefinal.app` | `GTM-MWC4F9RN` | `G-VG5BRD5626` |
| ConviteIA | `conviteia.com` e `www` | `GTM-WN7XHFZN` | `G-99DNYRQ9JZ` |
| PixWiki | `pix.wiki` e `www` | `GTM-KS4KHGKT` | `G-LN7BVDGWR7` |
| ConsultaTec | `consulta.tec.br` e `www` | `GTM-NJ45P5CM` | `G-N0F77RGZDH` |
| MelhorIA | `melhoria.org` e `www` | `GTM-5C3RXHBT` | `G-JPXXM3SHF0` |
| FuncionarIA | `funcionaria.net` e `www` | `GTM-N3DC4SK7` | `G-6YC4GL7T4W` |

Os subdomínios de empresas da FuncionarIA, como `empresa.funcionaria.net`, **não carregam o GTM publicitário**. O seletor é por hostname exato.

## Consent Mode v2

A camada já existente continua enviando estado padrão negado até a escolha do usuário e atualiza:

- `analytics_storage`
- `ad_storage`
- `ad_user_data`
- `ad_personalization`

A escolha usa a mesma chave de consentimento já adotada pela minhAi.

## Eventos — MelhorIA

- `start_signup` — clique em **Começar agora** ou início explícito da criação de conta.
- `sign_up` — a nova conta chegou à tela de consentimento obrigatório de saúde.
- `account_activated` — o consentimento obrigatório foi salvo com sucesso e o usuário chegou ao app.
- `begin_checkout` — a cobrança PIX de um pacote de créditos foi criada e a tela **Pague com PIX** apareceu.
- `purchase` — a tela confirmou **Pagamento confirmado**.

Parâmetros de checkout/compra:
- `product = melhoria`
- `currency = BRL`
- `value`
- `item_name`
- `item_category = credits`
- `purchase_type = credits`
- `transaction_id` apenas em `purchase`

**Privacidade:** nenhum remédio, exame, consulta, nome, telefone, e-mail, dado de saúde ou dado do familiar é enviado ao dataLayer.

## Eventos — FuncionarIA

- `start_onboarding` — entrada no onboarding novo.
- `onboarding_completed` — os 7 passos foram concluídos e o fluxo seguiu para ativação, ou chegou ao dashboard após salvar.
- `sign_up` — usado quando o fluxo de ativação veio de criação de conta.
- `account_activated` — a FuncionarIA foi efetivamente criada/salva e o usuário chegou ao dashboard.
- `begin_checkout` — uma cobrança PIX real apareceu para assinatura de habilidades ou compra de créditos.
- `purchase` — pagamento confirmado pelo fluxo real.

Parâmetros de checkout/compra:
- `product = funcionaria`
- `currency = BRL`
- `value`
- `item_name`
- `item_category = subscription | credits`
- `purchase_type = subscription | credits`
- `transaction_id` apenas em `purchase`

**Privacidade:** nome da empresa, slug, logo, habilidades escolhidas, dados de clientes, mensagens e dados dos subdomínios públicos não são enviados ao GA4.

## Tags mínimas — MelhorIA

Google Tag:
- Nome: `Google Tag - MelhorIA`
- ID: `G-JPXXM3SHF0`
- Trigger: `Initialization - All Pages`

Acionadores de Evento personalizado:
- `CE - start_signup`
- `CE - sign_up`
- `CE - account_activated`
- `CE - begin_checkout`
- `CE - purchase`

Tags de evento GA4:
- `GA4 - start_signup`
- `GA4 - sign_up`
- `GA4 - account_activated`
- `GA4 - begin_checkout`
- `GA4 - purchase`

## Tags mínimas — FuncionarIA

Google Tag:
- Nome: `Google Tag - FuncionarIA`
- ID: `G-6YC4GL7T4W`
- Trigger: `Initialization - All Pages`

Acionadores de Evento personalizado:
- `CE - start_onboarding`
- `CE - onboarding_completed`
- `CE - sign_up`
- `CE - account_activated`
- `CE - begin_checkout`
- `CE - purchase`

Tags de evento GA4:
- `GA4 - start_onboarding`
- `GA4 - onboarding_completed`
- `GA4 - sign_up`
- `GA4 - account_activated`
- `GA4 - begin_checkout`
- `GA4 - purchase`

## Variáveis de camada de dados recomendadas

Criar quando usadas nas tags:

- `DLV - product` → `product`
- `DLV - method` → `method`
- `DLV - currency` → `currency`
- `DLV - value` → `value`
- `DLV - transaction_id` → `transaction_id`
- `DLV - item_name` → `item_name`
- `DLV - item_category` → `item_category`
- `DLV - purchase_type` → `purchase_type`

Sem transformações de formatação.

## Eventos principais sugeridos

MelhorIA:
- principal: `account_activated`
- principal de receita: `purchase`
- diagnóstico: `start_signup`, `sign_up`, `begin_checkout`

FuncionarIA:
- principal: `account_activated`
- principal de receita: `purchase`
- diagnóstico: `start_onboarding`, `onboarding_completed`, `sign_up`, `begin_checkout`

Valide no Tag Assistant antes de publicar os containers e antes de vincular conversões ao Google Ads.
