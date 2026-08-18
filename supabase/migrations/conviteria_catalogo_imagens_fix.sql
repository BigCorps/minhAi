-- ConviteIA — correção pontual do catálogo de imagens
--
-- Altera somente o CATÁLOGO PADRÃO.
-- NÃO altera conviteria.presentes e, portanto, não troca imagens de convites
-- já criados.

update conviteria.catalogo_presentes
set imagem_path =
  'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786822362746.webp'
where id = 'ir-junto-lua-de-mel';

-- Auditoria dos oito itens de happy_hour vistos no desktop:
--
-- primeira-rodada
-- porcao-batata
-- nao-falar-trabalho
-- petisco-que-some
-- uber-de-volta
-- rodada-do-chefe
-- mesa-reservada
-- open-bar-uma-hora
--
-- Atualmente não existem assets novos correspondentes a esses oito IDs nem
-- no Storage nem no repositório. Por segurança, eles não são remapeados para
-- imagens de outros presentes.
