BEGIN;

CREATE TABLE IF NOT EXISTS conviteria.evento_gestao_config (
  evento_id uuid PRIMARY KEY REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  rsvp_restrito boolean NOT NULL DEFAULT false,
  qr_modo text NOT NULL DEFAULT 'familia' CHECK (qr_modo IN ('familia','individual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conviteria.convidado_familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  telefone_normalizado text,
  email text,
  email_normalizado text,
  lado text NOT NULL DEFAULT 'ambos' CHECK (lado IN ('noiva','noivo','ambos','outro')),
  max_acompanhantes integer NOT NULL DEFAULT 0 CHECK (max_acompanhantes BETWEEN 0 AND 50),
  observacoes text,
  qr_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conviteria.convidados_lista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  familia_id uuid REFERENCES conviteria.convidado_familias(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  telefone_normalizado text,
  email text,
  email_normalizado text,
  tipo text NOT NULL DEFAULT 'adulto' CHECK (tipo IN ('adulto','crianca')),
  lado text NOT NULL DEFAULT 'ambos' CHECK (lado IN ('noiva','noivo','ambos','outro')),
  observacoes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','nao_vai')),
  qr_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conviteria.convidados
  ADD COLUMN IF NOT EXISTS familia_lista_id uuid REFERENCES conviteria.convidado_familias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS convidado_lista_id uuid REFERENCES conviteria.convidados_lista(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS conviteria.convidado_confirmacoes_membros (
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  confirmacao_id uuid NOT NULL REFERENCES conviteria.convidados(id) ON DELETE CASCADE,
  convidado_lista_id uuid NOT NULL REFERENCES conviteria.convidados_lista(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (confirmacao_id, convidado_lista_id)
);

CREATE TABLE IF NOT EXISTS conviteria.padrinhos_convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  papel text,
  mensagem text,
  foto_url text,
  dress_code text,
  cores_recomendadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  resposta text NOT NULL DEFAULT 'pendente' CHECK (resposta IN ('pendente','aceito')),
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, slug)
);

CREATE TABLE IF NOT EXISTS conviteria.mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  capacidade integer NOT NULL DEFAULT 8 CHECK (capacidade BETWEEN 1 AND 100),
  ordem integer NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conviteria.mesa_convidados (
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  mesa_id uuid NOT NULL REFERENCES conviteria.mesas(id) ON DELETE CASCADE,
  convidado_lista_id uuid NOT NULL REFERENCES conviteria.convidados_lista(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mesa_id, convidado_lista_id),
  UNIQUE (convidado_lista_id)
);

CREATE TABLE IF NOT EXISTS conviteria.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES conviteria.eventos(id) ON DELETE CASCADE,
  convidado_lista_id uuid NOT NULL REFERENCES conviteria.convidados_lista(id) ON DELETE CASCADE,
  familia_id uuid REFERENCES conviteria.convidado_familias(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('familia','individual','manual')),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, convidado_lista_id)
);

CREATE INDEX IF NOT EXISTS convidado_familias_evento_idx ON conviteria.convidado_familias(evento_id, created_at);
CREATE INDEX IF NOT EXISTS convidado_familias_email_idx ON conviteria.convidado_familias(evento_id, email_normalizado) WHERE email_normalizado IS NOT NULL;
CREATE INDEX IF NOT EXISTS convidado_familias_tel_idx ON conviteria.convidado_familias(evento_id, telefone_normalizado) WHERE telefone_normalizado IS NOT NULL;
CREATE INDEX IF NOT EXISTS convidados_lista_evento_idx ON conviteria.convidados_lista(evento_id, created_at);
CREATE INDEX IF NOT EXISTS convidados_lista_familia_idx ON conviteria.convidados_lista(familia_id);
CREATE INDEX IF NOT EXISTS convidados_lista_email_idx ON conviteria.convidados_lista(evento_id, email_normalizado) WHERE email_normalizado IS NOT NULL;
CREATE INDEX IF NOT EXISTS convidados_lista_tel_idx ON conviteria.convidados_lista(evento_id, telefone_normalizado) WHERE telefone_normalizado IS NOT NULL;
CREATE INDEX IF NOT EXISTS convidados_familia_lista_idx ON conviteria.convidados(familia_lista_id) WHERE familia_lista_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS convidados_convidado_lista_idx ON conviteria.convidados(convidado_lista_id) WHERE convidado_lista_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS confirmacoes_membros_evento_idx ON conviteria.convidado_confirmacoes_membros(evento_id);
CREATE INDEX IF NOT EXISTS padrinhos_convites_evento_idx ON conviteria.padrinhos_convites(evento_id, created_at);
CREATE INDEX IF NOT EXISTS mesas_evento_idx ON conviteria.mesas(evento_id, ordem, created_at);
CREATE INDEX IF NOT EXISTS mesa_convidados_evento_idx ON conviteria.mesa_convidados(evento_id);
CREATE INDEX IF NOT EXISTS checkins_evento_idx ON conviteria.checkins(evento_id, checked_in_at DESC);

CREATE OR REPLACE FUNCTION conviteria.gestao_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evento_gestao_config_touch ON conviteria.evento_gestao_config;
CREATE TRIGGER evento_gestao_config_touch BEFORE UPDATE ON conviteria.evento_gestao_config
FOR EACH ROW EXECUTE FUNCTION conviteria.gestao_touch_updated_at();

DROP TRIGGER IF EXISTS convidado_familias_touch ON conviteria.convidado_familias;
CREATE TRIGGER convidado_familias_touch BEFORE UPDATE ON conviteria.convidado_familias
FOR EACH ROW EXECUTE FUNCTION conviteria.gestao_touch_updated_at();

DROP TRIGGER IF EXISTS convidados_lista_touch ON conviteria.convidados_lista;
CREATE TRIGGER convidados_lista_touch BEFORE UPDATE ON conviteria.convidados_lista
FOR EACH ROW EXECUTE FUNCTION conviteria.gestao_touch_updated_at();

DROP TRIGGER IF EXISTS padrinhos_convites_touch ON conviteria.padrinhos_convites;
CREATE TRIGGER padrinhos_convites_touch BEFORE UPDATE ON conviteria.padrinhos_convites
FOR EACH ROW EXECUTE FUNCTION conviteria.gestao_touch_updated_at();

DROP TRIGGER IF EXISTS mesas_touch ON conviteria.mesas;
CREATE TRIGGER mesas_touch BEFORE UPDATE ON conviteria.mesas
FOR EACH ROW EXECUTE FUNCTION conviteria.gestao_touch_updated_at();

ALTER TABLE conviteria.evento_gestao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.convidado_familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.convidados_lista ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.convidado_confirmacoes_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.padrinhos_convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.mesa_convidados ENABLE ROW LEVEL SECURITY;
ALTER TABLE conviteria.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dono_evento_gestao_config ON conviteria.evento_gestao_config;
CREATE POLICY dono_evento_gestao_config ON conviteria.evento_gestao_config
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_convidado_familias ON conviteria.convidado_familias;
CREATE POLICY dono_convidado_familias ON conviteria.convidado_familias
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_convidados_lista ON conviteria.convidados_lista;
CREATE POLICY dono_convidados_lista ON conviteria.convidados_lista
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_confirmacoes_membros ON conviteria.convidado_confirmacoes_membros;
CREATE POLICY dono_confirmacoes_membros ON conviteria.convidado_confirmacoes_membros
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_padrinhos_convites ON conviteria.padrinhos_convites;
CREATE POLICY dono_padrinhos_convites ON conviteria.padrinhos_convites
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_mesas ON conviteria.mesas;
CREATE POLICY dono_mesas ON conviteria.mesas
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_mesa_convidados ON conviteria.mesa_convidados;
CREATE POLICY dono_mesa_convidados ON conviteria.mesa_convidados
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

DROP POLICY IF EXISTS dono_checkins ON conviteria.checkins;
CREATE POLICY dono_checkins ON conviteria.checkins
FOR ALL USING (conviteria.e_dono(evento_id)) WITH CHECK (conviteria.e_dono(evento_id));

COMMIT;
