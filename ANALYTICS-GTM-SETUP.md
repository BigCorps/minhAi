# BigCorps — configuração GTM/GA4 para apps no repo minhAi

Este pacote instala apenas a camada de código. Os containers GTM continuam sendo configurados no Google Tag Manager.

## Containers e propriedades

| Produto | Host que carrega o GTM | GTM | GA4 |
|---|---|---|---|
| ArteFinal ferramenta | `ia.artefinal.app` | `GTM-MWC4F9RN` | `G-VG5BRD5626` |
| Convite IA | `conviteia.com` e `www` | `GTM-WN7XHFZN` | `G-99DNYRQ9JZ` |
| PixWiki | `pix.wiki` e `www` | `GTM-KS4KHGKT` | `G-LN7BVDGWR7` |
| ConsultaTec | `consulta.tec.br` e `www` | `GTM-NJ45P5CM` | `G-N0F77RGZDH` |

Subdomínios de clientes, como `nome.conviteia.com` e `nome.pix.wiki`, NÃO carregam os containers publicitários.

## Consent Mode v2

O código envia estado padrão negado até a escolha do usuário e atualiza:

- `analytics_storage`
- `ad_storage`
- `ad_user_data`
- `ad_personalization`

A mesma escolha já usada pelo banner de cookies passa a valer também para Google.

## Eventos enviados ao dataLayer

### ArteFinal
- `begin_checkout` — clique num pacote pago de créditos
- `purchase` — estado "Créditos adicionados com sucesso!"

O ArteFinal oferece **20 créditos grátis ao criar a conta. Não existe trial**. Uso de créditos grátis não é `purchase`.

### Convite IA
- `start_creation`
- `begin_checkout` — tela de pagamento do convite avulso
- `purchase` — convite efetivamente publicado após confirmação do pagamento

### PixWiki
- `sign_up_start`
- `sign_up`
- `account_activated`

### ConsultaTec
- `begin_checkout` — consulta iniciada com preço
- `purchase` — consulta concluída com sucesso

Nenhum CPF, CNPJ, nome, e-mail, telefone, chave Pix ou resultado de consulta é enviado ao dataLayer.

## Tags mínimas a criar em cada GTM

1. Criar uma Google Tag com o GA4 correspondente ao container.
2. Trigger: Initialization / All Pages.
3. Criar uma GA4 Event tag genérica ou tags por evento para os nomes acima.
4. Para `purchase`, encaminhar `currency`, `value` e `transaction_id` do dataLayer.
5. Marcar `purchase` como conversão principal no GA4/Google Ads quando os testes estiverem validados.
6. Para PixWiki, começar com `account_activated` como conversão até existir volume suficiente de planos pagos.

Valide tudo no Tag Assistant antes de publicar campanhas.
