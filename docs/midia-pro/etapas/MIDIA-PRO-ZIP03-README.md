# Midia.Pro — ZIP 03 / Anuncie nesta tela

Base usada: `BigCorps/minhAi` no commit `d5e4df26283da19b345795313a086bfda547d5de`, somada aos ZIPs 01 e 02.

## O que entra nesta etapa

- QR individual por tela parceira;
- link público `slug.midia.pro/anuncie/CODIGO`;
- botão **Anunciar nesta tela** na página pública do parceiro;
- botão **Baixar QR** no dashboard do proprietário;
- catálogo oficial de 11 modalidades de publicidade;
- duração comercial de 30, 45 ou 60 segundos;
- vídeo livre entre 30 e 60 s enquadrado na faixa comercial imediatamente superior;
- escolha de data e horário conforme o produto;
- preço calculado exclusivamente no servidor;
- multiplicador de duração + `price_factor` da tela;
- verificação preliminar de disponibilidade do inventário;
- reserva atômica do espaço por 30 minutos;
- upload direto navegador → Supabase Storage por Signed Upload URL;
- criador simples de card 1080×1920 no próprio navegador;
- campanha e criativo privados no schema `midia`;
- dados do anunciante mantidos fora do acesso `anon/authenticated`;
- rate limit de criação de campanhas sem CAPTCHA;
- landing atualizada para refletir player e compra por QR já existentes.

## Tabela de publicidade gravada no banco

| Produto | Preço-base Standard / 30 s | Entrega |
|---|---:|---|
| Experimente | R$ 4,90 | 1 exibição em até 30 dias |
| Dia Certo | R$ 7,90 | 1 exibição no dia escolhido |
| Hora Certa | R$ 14,90 | 1 exibição em janela de 1 hora |
| Momento Marcado | R$ 24,90 | 1 exibição em janela de 15 min |
| Presença Diária | R$ 59,90 | 1 por dia / 30 dias |
| Diário Agendado | R$ 119,90 | 1 por dia em horário escolhido / 30 dias |
| Reforço | R$ 149,90 | 4 por dia / 30 dias |
| Hora em Hora | R$ 299,90 | a cada hora ativa / 30 dias |
| Alta Frequência | R$ 499,90 | a cada 30 min / 30 dias |
| Intensivo | R$ 899,90 | a cada 15 min / 30 dias |
| Dominante | R$ 1.990,00 | a cada 5 min / 30 dias |

Duração: 30 s ×1; 45 s ×1,5; 60 s ×2. O `price_factor` da tela é aplicado depois e continua sob controle da plataforma, não do proprietário.

## Inventário nesta etapa

Cada tela parceira recebe `screen_ad_settings`. O padrão inicial considera 12 horas ativas por dia e usa o `network_inventory_percent` já definido no ZIP 01. Assim, uma tela Parceiro com 20% de inventário não pode receber rascunhos acima da capacidade reservada para a rede.

A reserva é serializada no banco pela própria linha da tela. Duas pessoas tentando pegar o último espaço ao mesmo tempo não conseguem vender o mesmo inventário.

Nesta fase a reserva vale 30 minutos. O ZIP 04 converterá a reserva temporária em campanha contratada quando o pagamento for confirmado.

## Fluxo público

1. O proprietário baixa o QR da tela no dashboard.
2. O QR abre `https://SLUG.midia.pro/anuncie/CODIGO`.
3. O anunciante escolhe frequência, duração, data e horário.
4. O backend calcula preço e disponibilidade.
5. O anunciante envia a arte ou cria um card 1080×1920.
6. Informa nome/e-mail e confirma que possui direito de uso do conteúdo.
7. A Midia.Pro cria um rascunho, reserva o inventário por 30 minutos e envia a peça para o bucket privado.
8. A campanha termina em `awaiting_payment` — nenhum valor é cobrado no ZIP 03.

## Ordem para aplicar

1. O SQL dos ZIPs 01 e 02 deve já ter sido aplicado.
2. Execute `supabase/SQL-MIDIA-PRO-ZIP03.sql` no SQL Editor do mesmo projeto Supabase da minhAi.
3. Ao reunir os arquivos no GitHub, arquivos deste ZIP com o mesmo caminho de ZIPs anteriores são a versão mais nova e devem prevalecer.
4. Não publique apenas este ZIP isoladamente: ele é incremental sobre os ZIPs 01 e 02.

Não há nova Edge Function e não há necessidade de outro projeto Supabase.

## Teste funcional recomendado

1. Use uma tela **Parceiro Midia.Pro** já ativa e pareada pelo ZIP 02.
2. No dashboard, confirme que aparecem **Página do anúncio** e **Baixar QR**.
3. Abra a página do anúncio ou escaneie o QR.
4. Teste primeiro **Experimente · 30 s**: deve calcular o preço da tela imediatamente.
5. Teste **Hora Certa** ou **Momento Marcado**: data e horário tornam-se obrigatórios.
6. Teste **Hora em Hora** e **Dominante**: a página deve mostrar quantidade estimada de exibições e impedir a compra se a capacidade restante não comportar a campanha.
7. Envie uma imagem vertical e depois um vídeo vertical de 30–60 s.
8. Teste o **Criar card**, incluindo logo opcional, cores, título, mensagem e chamada.
9. Preencha nome/e-mail, confirme a declaração e clique **Preparar campanha**.
10. A tela final deve informar que a campanha foi preparada e está aguardando o fluxo de pagamento.

## Segurança e custos

- O preço nunca vem confiável do navegador; o banco recalcula tudo.
- A reserva final também recalcula disponibilidade sob lock da tela.
- O cookie que autoriza a edição do rascunho é `HttpOnly`; o navegador não recebe o segredo em JavaScript.
- O banco grava somente SHA-256 do segredo da campanha.
- Upload do anunciante vai direto ao Supabase por URL assinada; vídeo não atravessa a Vercel.
- O bucket continua privado.
- Nome/e-mail/WhatsApp ficam apenas no schema `midia`.
- IP de rate limit é armazenado somente como hash curto; nunca em claro.
- Não foi adicionado Turnstile nesta etapa.
- `MIDIA_SAL_IP` é opcional. Se não existir, o código usa o sal já existente da ConviteIA ou, em último caso, a chave server-side como material de sal; nada disso é enviado ao navegador.

## O que NÃO entra ainda

- geração do PIX/cartão;
- confirmação por webhook;
- aprovação/moderação da propaganda;
- inserção da campanha paga na playlist;
- proof-of-play financeiro;
- saldo e saque do proprietário;
- campanhas multi-tela da rede.

Esses pontos começam no ZIP 04 e continuam nos ZIPs 05/06.
