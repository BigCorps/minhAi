-- RPCs do MelhorIA: nenhuma execução para PUBLIC/anon.
-- As funções usadas pelo navegador continuam disponíveis para authenticated;
-- jobs e rotas internas continuam disponíveis para service_role.

revoke all on function public.ensure_my_melhoria_company() from public, anon;
grant execute on function public.ensure_my_melhoria_company() to authenticated, service_role;

revoke all on function public.melhoria_aceitar_convite(text) from public, anon;
grant execute on function public.melhoria_aceitar_convite(text) to authenticated, service_role;

revoke all on function public.melhoria_aderencia(uuid, integer) from public, anon;
grant execute on function public.melhoria_aderencia(uuid, integer) to authenticated, service_role;

revoke all on function public.melhoria_avisos_disponiveis() from public, anon;
grant execute on function public.melhoria_avisos_disponiveis() to authenticated, service_role;

revoke all on function public.melhoria_criar_convite(text, text, boolean) from public, anon;
grant execute on function public.melhoria_criar_convite(text, text, boolean) to authenticated, service_role;

revoke all on function public.melhoria_meu_perfil() from public, anon;
grant execute on function public.melhoria_meu_perfil() to authenticated, service_role;

revoke all on function public.melhoria_meus_acompanhados() from public, anon;
grant execute on function public.melhoria_meus_acompanhados() to authenticated, service_role;

revoke all on function public.melhoria_registrar_acesso(uuid, text, text) from public, anon;
grant execute on function public.melhoria_registrar_acesso(uuid, text, text) to authenticated, service_role;
