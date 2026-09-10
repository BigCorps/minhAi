-- Índices de apoio às FKs do schema melhoria.
-- Não altera semântica, permissões nem dados; apenas evita scans desnecessários
-- em joins, cascatas e verificações de integridade.

create index if not exists idx_melhoria_acessos_user_id
  on melhoria.acessos_log(user_id);

create index if not exists idx_melhoria_documentos_revisado_por
  on melhoria.documentos(revisado_por);

create index if not exists idx_melhoria_dose_eventos_confirmado_por
  on melhoria.dose_eventos(confirmado_por);

create index if not exists idx_melhoria_dose_sms_envios_cuidador
  on melhoria.dose_sms_envios(cuidador_id);

create index if not exists idx_melhoria_google_fila_perfil
  on melhoria.google_fila(perfil_id);

create index if not exists idx_melhoria_google_oauth_states_perfil
  on melhoria.google_oauth_states(perfil_id);

create index if not exists idx_melhoria_google_oauth_states_user
  on melhoria.google_oauth_states(user_id);

create index if not exists idx_melhoria_medicamentos_revisado_por
  on melhoria.medicamentos(revisado_por);

create index if not exists idx_melhoria_perfis_responsavel_legal
  on melhoria.perfis(responsavel_legal_id);
