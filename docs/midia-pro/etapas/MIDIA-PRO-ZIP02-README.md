# Midia.Pro — ZIP 02 / Player

Base usada: `BigCorps/minhAi` no commit `d5e4df26283da19b345795313a086bfda547d5de`, somada ao conteúdo do ZIP 01.

## O que entra nesta etapa

- player público em `slug.midia.pro/play`;
- pareamento por código temporário de 8 caracteres;
- token opaco de 256 bits gravado somente como SHA-256 no banco;
- apenas um player ativo por tela;
- heartbeat de 60 s e estado online/offline no dashboard;
- playlist versionada por tela;
- Supabase Realtime Broadcast apenas como sinal de atualização;
- fallback de versão pelo heartbeat;
- upload direto navegador → Supabase Storage por Signed Upload URL (sem passar vídeo pela Vercel);
- imagens verticais com 30/45/60 s;
- vídeos verticais entre 30 e 60 s;
- limite de 50 MB por arquivo nesta etapa;
- Cache Storage local das mídias;
- service worker próprio do Midia.Pro para manter o app shell após a primeira carga;
- reprodução continua com o cache local quando a conexão cai;
- remoção da mídia também remove o arquivo do Storage quando ele não é usado por nenhuma outra tela.

## Ordem para aplicar

1. O SQL do ZIP 01 deve já ter sido aplicado.
2. Abra o SQL Editor do Supabase e execute `supabase/SQL-MIDIA-PRO-ZIP02.sql`.
3. Quando for fazer o upload conjunto ao GitHub, arquivos deste ZIP com o mesmo caminho de um ZIP anterior são a versão mais nova e devem prevalecer.
4. Faça o deploy normalmente na Vercel depois que todos os ZIPs planejados forem reunidos.

## Teste funcional desta etapa

1. Cadastre um proprietário, local e uma tela no plano **Parceiro Midia.Pro** (gratuito).
2. Na tela cadastrada, clique **Gerar código**.
3. Em outro navegador/dispositivo abra `https://SEU-SLUG.midia.pro/play`.
4. Digite o código. O dashboard deve passar a mostrar o player como online após o heartbeat.
5. No dashboard, selecione a tela e envie uma imagem vertical ou vídeo vertical de 30–60 s.
6. O player recebe o Broadcast, atualiza o manifesto, baixa o arquivo e começa a reproduzir.
7. Desligue a internet depois que a mídia tiver sido baixada. A programação deve continuar rodando com o arquivo local.
8. Remova a mídia no dashboard. Quando a conexão estiver ativa, o player deve receber a nova versão e removê-la da programação/cache.

## Observações importantes

- Nesta fase, vídeos são reproduzidos **mutados** para garantir autoplay em navegadores/TVs. Política de áudio pode virar configuração de tela depois.
- Planos pagos do ZIP 01 continuam `pending_payment`; eles podem ser pareados para teste, mas o player mostra “aguardando ativação” até a etapa financeira.
- Não existe cobrança, publicidade externa, repasse ou proof-of-play financeiro neste ZIP.
- O cache garante continuidade se a internet cair com a página já carregada. O service worker também guarda navegação e chunks carregados para aumentar a chance de retomada após refresh/reabertura, mas o modo kiosk/app dedicado poderá ser reforçado na etapa de dispositivos físicos.
- Não existe secret novo para configurar. Tokens de player têm entropia suficiente para serem armazenados como SHA-256 sem salt adicional.

## Segurança

- `midia` continua sem privilégios para `anon` e `authenticated`.
- Mídias ficam em bucket privado.
- Signed Upload URL é criada server-side e expira automaticamente.
- Signed download URLs têm validade curta e só são devolvidas a um player com token válido.
- Realtime transmite apenas `screen_id` e número da versão, nunca URL privada ou token.
