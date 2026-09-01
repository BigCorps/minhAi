-- ConviteIA — catálogo real de casamento + integridade de presentes
-- 35 opções padrão, limite de 50 presentes por convite e saneamento dos
-- convites de teste existentes.
--
-- IMPORTANTE: aplique esta migration somente depois de publicar no GitHub
-- os 7 arquivos WebP em /public/conviteria/catalogo-real/.

begin;

-- ---------------------------------------------------------------------------
-- 1. Migra linhas legadas que ainda não tinham catalogo_id.
--    Isso acontece antes de alterar o catálogo, enquanto os títulos antigos
--    ainda estão disponíveis para fazer o casamento exato.
-- ---------------------------------------------------------------------------
update conviteria.presentes p
set catalogo_id = c.id
from conviteria.catalogo_presentes c
where p.catalogo_id is null
  and lower(trim(p.titulo)) = lower(trim(c.titulo))
  and not exists (
    select 1
    from conviteria.presentes outro
    where outro.evento_id = p.evento_id
      and outro.catalogo_id = c.id
      and outro.id <> p.id
  );

-- ---------------------------------------------------------------------------
-- 2. Normaliza o convite de teste da conta mimi.marthins@gmail.com.
--    Os itens que a Miriam editou/criou passam a apontar para IDs estáveis
--    do novo catálogo. Não adicionamos automaticamente presentes que ela
--    ainda não escolheu: apenas corrigimos os que já estão no convite.
-- ---------------------------------------------------------------------------
create temporary table tmp_conviteia_mapa_miriam (
  titulo_antigo text primary key,
  catalogo_id text not null,
  titulo_novo text not null,
  valor_centavos integer not null,
  imagem_url text not null
) on commit drop;

insert into tmp_conviteia_mapa_miriam
  (titulo_antigo, catalogo_id, titulo_novo, valor_centavos, imagem_url)
values
  ('Cueca sexy para a noite de núpcia', 'cueca-sexy-noite-nupcia', 'Cueca sexy para a noite de núpcia', 22480, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759256205.jpg'),
  ('Rolo de macarrão caso o noivo não se comporte', 'rolo-macarrao-noivo', 'Rolo de macarrão caso o noivo não se comporte', 24160, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759286490.jpg'),
  ('Curso avancado de baixar a tampa do vaso', 'curso-tampa-vaso', 'Curso avancado de baixar a tampa do vaso', 31250, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759360888.jpg'),
  ('Patrocine a despedida do noivo', 'despedida-noivo', 'Patrocine a despedida do noivo', 43600, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759421007.jpg'),
  ('Tampão de ouvido pra noiva enquanto noivo ronca', 'tampao-ronco', 'Tampão de ouvido pra noiva enquanto noivo ronca', 18950, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759780270.jpg'),
  ('Lenço para a noiva não borrar toda a maquiagem', 'lenco-maquiagem-noiva', 'Lenço para a noiva não borrar toda a maquiagem', 20730, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759464334.jpg'),
  ('Roupa sexy para a noiva usar na noite de núpcia', 'roupa-sexy-noiva', 'Roupa sexy para a noiva usar na noite de núpcia', 25890, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759694589.jpg'),
  ('Brinde da noite de núpcia', 'brinde-noite-nupcia', 'Brinde da noite de núpcia', 56120, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760149285.jpg'),
  ('Patrocine a despedida da noiva (sem perguntas)', 'despedida-noiva', 'Patrocine a despedida da noiva (sem perguntas)', 41200, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759824413.jpg'),
  ('Pipoca para o noivo por 1 ano.', 'pipoca-noivo-um-ano', 'Pipoca para o noivo por 1 ano.', 52916, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759940950.jpg'),
  ('Espirro em paris', 'espirro-paris', 'Espirro em paris', 25942, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759869563.jpg'),
  ('Assaltando o frigobar do hotel', 'assalto-frigobar', 'Assaltando o frigobar do hotel', 28575, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760008823.jpg'),
  ('Um ano de barba feita para o noivo', 'barba-um-ano', 'Um ano de barba feita para o noivo', 42958, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760053184.jpg'),
  ('Open de engov para a festa', 'open-engov', 'Open de engov para a festa', 45590, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760083787.png'),
  ('Garanta o Ifood do noivo durante o 1º mês de casado', 'ifood-primeiro-mes', 'Garanta o Ifood do noivo durante o 1º mês de casado', 69283, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760186835.jpg'),
  ('Maracujina para os noivos', 'maracujina-noivos', 'Maracujina para os noivos', 13490, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760455792.jpg'),
  ('Ajudinha para o taxi um pouquinho mais longe', 'taxi-mais-longe', 'Ajudinha para o taxi um pouquinho mais longe', 18045, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760556181.jpg'),
  ('Taxa pra noiva não jogar o buquê pra sua namorada', 'buque-namorada', 'Taxa pra noiva não jogar o buquê pra sua namorada', 19362, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760618478.jpg'),
  ('Conjunto de controle remotos para não ter briga', 'controles-remotos', 'Conjunto de controle remotos para não ter briga', 21994, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760667974.jpg'),
  ('Capacete contra rolo de macarrão para o noivo', 'capacete-rolo-macarrao', 'Capacete contra rolo de macarrão para o noivo', 23310, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760732514.jpg'),
  ('Passagem aérea para jantar romântico na praia.', 'passagem-jantar-praia', 'Passagem aérea para jantar romântico na praia.', 95608, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760831135.jpg'),
  ('Prioridade no quarto de visita na casa dos noivos', 'prioridade-quarto-visita', 'Prioridade no quarto de visita na casa dos noivos', 82445, 'https://conviteia.com/conviteria/catalogo-real/prioridade-quarto-visita.webp'),
  ('Ajuda na Gasolina', 'ajuda-gasolina', 'Ajuda na Gasolina', 110520, 'https://conviteia.com/conviteria/catalogo-real/ajuda-gasolina.webp'),
  ('Cota "amigos para sempre"', 'cota-amigos-sempre', 'Cota "Amigos para Sempre"', 201254, 'https://conviteia.com/conviteria/catalogo-real/cota-amigos-sempre.webp');

update conviteria.presentes p
set
  catalogo_id = m.catalogo_id,
  titulo = m.titulo_novo,
  valor_centavos = m.valor_centavos,
  permite_valor_livre = false,
  imagem_url = m.imagem_url
from tmp_conviteia_mapa_miriam m
where p.evento_id = '0f3bac80-5ce0-47db-9c79-0bf283266b5e'::uuid
  and p.ativo = true
  and lower(trim(p.titulo)) = lower(trim(m.titulo_antigo));

update conviteria.eventos e
set
  config = jsonb_set(
    e.config,
    '{presentesEscolhidos}',
    (
      select coalesce(
        jsonb_agg(
          case
            when m.catalogo_id is null then x.item
            else
              (
                x.item
                - 'personalizado'
                - 'tituloOriginal'
                - 'valorOriginalCentavos'
                - 'imagemOriginalUrl'
              )
              || jsonb_build_object(
                'catalogoId', m.catalogo_id,
                'grupo', 'casamento',
                'titulo', m.titulo_novo,
                'valorCentavos', m.valor_centavos,
                'permiteValorLivre', false,
                'imagemUrl', m.imagem_url
              )
          end
          order by x.ord
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(
        coalesce(e.config->'presentesEscolhidos', '[]'::jsonb)
      ) with ordinality as x(item, ord)
      left join tmp_conviteia_mapa_miriam m
        on lower(trim(x.item->>'titulo')) = lower(trim(m.titulo_antigo))
    ),
    true
  ),
  updated_at = now()
where e.id = '0f3bac80-5ce0-47db-9c79-0bf283266b5e'::uuid;

-- ---------------------------------------------------------------------------
-- 3. Catálogo de casamento.
--
-- O banco tinha 24 opções ativas. Para chegar a 35 sem inventar quatro
-- presentes aleatórios, o novo catálogo combina:
--   • 21 opções reais já montadas no convite Miriam & Ithiel;
--   • os 7 novos presentes solicitados;
--   • 7 opções antigas distintas que continuam úteis.
-- ---------------------------------------------------------------------------
update conviteria.catalogo_presentes
set ativo = false
where grupo = 'casamento';

insert into conviteria.catalogo_presentes (
  id,
  grupo,
  titulo,
  valor_centavos,
  imagem_path,
  classificacao,
  permite_valor_livre,
  ordem,
  ativo
)
values
  ('cafezinho-noivo', 'casamento', 'Um cafezinho pro noivo acordar no dia', 2490, 'cafezinho-noivo.webp', 'livre', false, 10, true),
  ('pilha-relogio-padre', 'casamento', 'Pilha pro relogio do padre nao parar', 3870, 'pilha-relogio-padre.webp', 'livre', false, 20, true),
  ('meia-sem-furo', 'casamento', 'Meia sem furo pro noivo (ele precisa)', 5280, 'meia-sem-furo.webp', 'livre', false, 30, true),
  ('maracujina-noivos', 'casamento', 'Maracujina para os noivos', 13490, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760455792.jpg', 'livre', false, 40, true),
  ('taxi-mais-longe', 'casamento', 'Ajudinha para o taxi um pouquinho mais longe', 18045, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760556181.jpg', 'livre', false, 50, true),
  ('fundo-pizza', 'casamento', 'Fundo pra pizza do primeiro mes casados', 18950, 'fundo-pizza.webp', 'livre', false, 60, true),
  ('tampao-ronco', 'casamento', 'Tampão de ouvido pra noiva enquanto noivo ronca', 18950, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759780270.jpg', 'livre', false, 70, true),
  ('buque-namorada', 'casamento', 'Taxa pra noiva não jogar o buquê pra sua namorada', 19362, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760618478.jpg', 'livre', false, 80, true),
  ('lenco-maquiagem-noiva', 'casamento', 'Lenço para a noiva não borrar toda a maquiagem', 20730, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759464334.jpg', 'livre', false, 90, true),
  ('controles-remotos', 'casamento', 'Conjunto de controle remotos para não ter briga', 21994, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760667974.jpg', 'livre', false, 100, true),
  ('cueca-sexy-noite-nupcia', 'casamento', 'Cueca sexy para a noite de núpcia', 22480, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759256205.jpg', 'livre', false, 110, true),
  ('capacete-rolo-macarrao', 'casamento', 'Capacete contra rolo de macarrão para o noivo', 23310, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760732514.jpg', 'livre', false, 120, true),
  ('rolo-macarrao-noivo', 'casamento', 'Rolo de macarrão caso o noivo não se comporte', 24160, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759286490.jpg', 'livre', false, 130, true),
  ('seguro-vestido', 'casamento', 'Seguro contra pisao no vestido', 24160, 'seguro-vestido.webp', 'livre', false, 140, true),
  ('roupa-sexy-noiva', 'casamento', 'Roupa sexy para a noiva usar na noite de núpcia', 25890, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759694589.jpg', 'livre', false, 150, true),
  ('taxa-olho-aberto', 'casamento', 'Taxa pra ninguem fechar o olho na foto', 25890, 'taxa-olho-aberto.webp', 'livre', false, 160, true),
  ('espirro-paris', 'casamento', 'Espirro em paris', 25942, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759869563.jpg', 'livre', false, 170, true),
  ('assalto-frigobar', 'casamento', 'Assaltando o frigobar do hotel', 28575, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760008823.jpg', 'livre', false, 180, true),
  ('curso-tampa-vaso', 'casamento', 'Curso avancado de baixar a tampa do vaso', 31250, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759360888.jpg', 'livre', false, 190, true),
  ('despedida-noiva', 'casamento', 'Patrocine a despedida da noiva (sem perguntas)', 41200, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759824413.jpg', 'livre', false, 200, true),
  ('barba-um-ano', 'casamento', 'Um ano de barba feita para o noivo', 42958, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760053184.jpg', 'livre', false, 210, true),
  ('despedida-noivo', 'casamento', 'Patrocine a despedida do noivo', 43600, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759421007.jpg', 'livre', false, 220, true),
  ('open-engov', 'casamento', 'Open de engov para a festa', 45590, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760083787.png', 'livre', false, 230, true),
  ('pipoca-noivo-um-ano', 'casamento', 'Pipoca para o noivo por 1 ano.', 52916, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786759940950.jpg', 'livre', false, 240, true),
  ('brinde-noite-nupcia', 'casamento', 'Brinde da noite de núpcia', 56120, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760149285.jpg', 'livre', false, 250, true),
  ('ifood-primeiro-mes', 'casamento', 'Garanta o Ifood do noivo durante o 1º mês de casado', 69283, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760186835.jpg', 'livre', false, 260, true),
  ('barco-titanic', 'casamento', 'Passeio de barco pra abrir os bracos igual Titanic', 78400, 'barco-titanic.webp', 'livre', false, 270, true),
  ('prioridade-quarto-visita', 'casamento', 'Prioridade no quarto de visita na casa dos noivos', 82445, 'https://conviteia.com/conviteria/catalogo-real/prioridade-quarto-visita.webp', 'livre', false, 280, true),
  ('passagem-jantar-praia', 'casamento', 'Passagem aérea para jantar romântico na praia.', 95608, 'https://qyonozbroekuqlotqcbm.supabase.co/storage/v1/object/public/conviteria-midia/eventos/0f3bac80-5ce0-47db-9c79-0bf283266b5e/presente-1786760831135.jpg', 'livre', false, 290, true),
  ('ajuda-gasolina', 'casamento', 'Ajuda na Gasolina', 110520, 'https://conviteia.com/conviteria/catalogo-real/ajuda-gasolina.webp', 'livre', false, 300, true),
  ('cota-amigos-sempre', 'casamento', 'Cota "Amigos para Sempre"', 201254, 'https://conviteia.com/conviteria/catalogo-real/cota-amigos-sempre.webp', 'livre', false, 310, true),
  ('ajuda-mobiliar-casa', 'casamento', 'Ajuda para mobiliar a casa', 250725, 'https://conviteia.com/conviteria/catalogo-real/ajuda-mobiliar-casa.webp', 'livre', false, 320, true),
  ('spa-lua-de-mel', 'casamento', 'Spa relaxante na Lua de Mel', 250779, 'https://conviteia.com/conviteria/catalogo-real/spa-lua-de-mel.webp', 'livre', false, 330, true),
  ('ajuda-aposentadoria-noivos', 'casamento', 'Ajuda para a aposentadoria dos noivos', 547376, 'https://conviteia.com/conviteria/catalogo-real/ajuda-aposentadoria-noivos.webp', 'livre', false, 340, true),
  ('ir-junto-lua-de-mel', 'casamento', 'Poder ir junto com os noivos para a Lua de Mel', 1156275, 'https://conviteia.com/conviteria/catalogo-real/ir-junto-lua-de-mel.webp', 'livre', false, 350, true)
on conflict (id) do update
set
  grupo = excluded.grupo,
  titulo = excluded.titulo,
  valor_centavos = excluded.valor_centavos,
  imagem_path = excluded.imagem_path,
  classificacao = excluded.classificacao,
  permite_valor_livre = excluded.permite_valor_livre,
  ordem = excluded.ordem,
  ativo = true;

-- ---------------------------------------------------------------------------
-- 4. A tabela pública de presentes passa a refletir exatamente o config.
--
-- Antes, um item removido continuava ativo quando já tinha cotas vendidas.
-- A linha e os pagamentos continuam no banco para histórico; apenas
-- `ativo=false` tira o presente antigo do convite público.
-- ---------------------------------------------------------------------------
update conviteria.presentes p
set ativo = exists (
  select 1
  from conviteria.eventos e
  cross join lateral jsonb_array_elements(
    coalesce(e.config->'presentesEscolhidos', '[]'::jsonb)
  ) item
  where e.id = p.evento_id
    and (
      (
        p.catalogo_id is not null
        and item->>'catalogoId' = p.catalogo_id
      )
      or
      (
        p.catalogo_id is null
        and lower(trim(item->>'titulo')) = lower(trim(p.titulo))
      )
    )
)
where exists (
  select 1
  from conviteria.eventos e
  where e.id = p.evento_id
);

-- ---------------------------------------------------------------------------
-- 5. Garante que o mesmo item de catálogo nunca seja duplicado no mesmo
--    convite. Linhas personalizadas continuam usando IDs custom:* únicos.
-- ---------------------------------------------------------------------------
drop index if exists conviteria.presentes_catalogo_id_idx;

create unique index presentes_catalogo_id_idx
  on conviteria.presentes (evento_id, catalogo_id)
  where catalogo_id is not null;

commit;
