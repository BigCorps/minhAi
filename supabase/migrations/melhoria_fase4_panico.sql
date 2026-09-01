-- ============================================================================
-- MelhorIA — Fase 4: pânico e SMS
--
-- Migração pequena de propósito: `contatos_emergencia` e `panico_eventos` já
-- foram criadas na Fase 0, com RLS e índices. Falta só a mensagem
-- personalizada e uma consulta de saldo para a tela.
--
-- Rode depois de melhoria_fase0_fase1.sql. Idempotente.
-- ============================================================================


-- ── Mensagem personalizada ──────────────────────────────────────────────────
-- A mensagem padrão é montada no código (mensagemPanicoPadrao), mas quem quiser
-- pode escrever a sua: "Sou diabético", "tenho marca-passo", "a chave está com
-- a vizinha do 302". Numa emergência isso vale mais que qualquer texto genérico.
alter table melhoria.perfis
  add column if not exists mensagem_panico text;

comment on column melhoria.perfis.mensagem_panico is
  'Texto do SMS de emergência. NULL usa o padrão. Sem acento no envio: SMS acentuado vira UCS-2 e o limite cai de 160 para 70 caracteres, triplicando o custo em créditos.';


-- ── Saldo em português claro ────────────────────────────────────────────────
-- A tela precisa saber quantos avisos ainda cabem, e o idoso não deve ver
-- "créditos": vê "3 avisos". Como o SMS custa 2 créditos por destinatário, a
-- conta não é óbvia — melhor o banco responder pronto.
create or replace function public.melhoria_avisos_disponiveis()
returns table (
  creditos          int,
  contatos_ativos   int,
  avisos_completos  int
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_company  uuid;
  v_perfil   uuid;
  v_creditos int := 0;
  v_contatos int := 0;
  v_custo    int;
begin
  select c.id into v_company
    from public.companies c
   where c.user_id = auth.uid() and c.segment_key = 'melhoria'
   limit 1;

  if v_company is null then
    return query select 0, 0, 0;
    return;
  end if;

  select coalesce(uc.available_credits, 0) into v_creditos
    from public.user_credits uc
   where uc.user_id = auth.uid();

  select p.id into v_perfil from melhoria.perfis p where p.company_id = v_company;

  select count(*)::int into v_contatos
    from melhoria.contatos_emergencia ce
   where ce.perfil_id = v_perfil and ce.ativo;

  -- 2 créditos por destinatário (valor global de assistant_functions.enviar_sms)
  v_custo := v_contatos * 2;

  return query select
    v_creditos,
    v_contatos,
    case when v_custo = 0 then 0 else (v_creditos / v_custo)::int end;
end;
$$;

grant execute on function public.melhoria_avisos_disponiveis() to authenticated;


-- ── Verificação ─────────────────────────────────────────────────────────────
do $$
begin
  raise notice '─────────────────────────────────────────────';
  raise notice '  MelhorIA — Fase 4 aplicada';
  raise notice '  coluna mensagem_panico : %',
    (select count(*) from information_schema.columns
      where table_schema='melhoria' and table_name='perfis'
        and column_name='mensagem_panico');
  raise notice '  função de saldo        : ok';
  raise notice '';
  raise notice '  Nada mais a fazer no painel: send-sms-gerente já está';
  raise notice '  publicada e é reaproveitada como está.';
  raise notice '─────────────────────────────────────────────';
end $$;
