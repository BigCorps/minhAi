-- Voice Assistant Multi-Tenant - Database Schema
-- Execute este SQL no SQL Editor do Supabase após criar o projeto

-- ==================================================
-- TABELAS PRINCIPAIS
-- ==================================================

-- 1. Tabela de empresas/estabelecimentos
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Configurações de voz
  welcome_message TEXT DEFAULT 'Olá! Como posso ajudar?',
  wake_word TEXT DEFAULT 'Olá Assistente',
  voice_provider TEXT DEFAULT 'openai',
  voice_id TEXT DEFAULT 'nova',
  voice_speed FLOAT DEFAULT 1.0,
  
  -- Limites e billing
  monthly_message_limit INTEGER DEFAULT 10000,
  current_month_usage INTEGER DEFAULT 0,
  reset_usage_at TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month')
);

-- 2. Tabela de admins (donos das empresas)
CREATE TABLE company_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- 3. Tabela de prompts customizados
CREATE TABLE company_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Tabela de conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES company_prompts(id),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  device_info JSONB DEFAULT '{}'::jsonb,
  total_messages INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  
  -- Analytics
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5)
);

-- 5. Tabela de mensagens individuais
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadados técnicos
  audio_duration_ms INTEGER,
  tokens_used INTEGER,
  model_used TEXT DEFAULT 'gpt-4o-mini',
  transcription_confidence FLOAT,
  response_time_ms INTEGER,
  
  -- Custos
  cost_usd DECIMAL(10, 6)
);

-- ==================================================
-- ÍNDICES PARA PERFORMANCE
-- ==================================================

CREATE INDEX idx_conversations_company_started ON conversations(company_id, started_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status = 'active';
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_prompts_active ON company_prompts(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_company_admins_user ON company_admins(user_id);

-- ==================================================
-- TRIGGERS E FUNCTIONS
-- ==================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON company_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para incrementar total_messages
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET total_messages = total_messages + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_message_count();

-- Function para resetar usage mensal (chamar via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE companies
  SET 
    current_month_usage = 0,
    reset_usage_at = (date_trunc('month', NOW()) + INTERVAL '1 month')
  WHERE reset_usage_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies: Companies
CREATE POLICY "Users see own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM company_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM company_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Policies: Company Admins
CREATE POLICY "Users see own admin records"
  ON company_admins FOR SELECT
  USING (user_id = auth.uid());

-- Policies: Prompts
CREATE POLICY "Users see own prompts"
  ON company_prompts FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own prompts"
  ON company_prompts FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_admins 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Policies: Conversations
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update conversations"
  ON conversations FOR UPDATE
  USING (true);

-- Policies: Messages
CREATE POLICY "Users see own messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      INNER JOIN company_admins ca ON ca.company_id = c.company_id
      WHERE ca.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- ==================================================
-- DADOS DE EXEMPLO (SEED)
-- ==================================================

-- Criar empresa de exemplo
INSERT INTO companies (name, slug, welcome_message) VALUES
  (
    'Restaurante Bella Vista', 
    'bella-vista', 
    'Olá! Bem-vindo ao Bella Vista! Como posso ajudar?'
  );

-- Criar prompt de exemplo
INSERT INTO company_prompts (company_id, name, system_prompt, is_active)
SELECT 
  id,
  'Atendimento Padrão',
  'Você é Maria, atendente do Restaurante Bella Vista em São Paulo.

Características:
- Simpática, profissional e prestativa
- Fala de forma natural e informal (mas respeitosa)
- Usa expressões brasileiras típicas
- Respostas SEMPRE abaixo de 50 palavras (crítico para voz)

Informações do estabelecimento:
- Especialidade: culinária italiana
- Horário: terça a domingo, 12h-15h e 19h-23h (fechado segunda)
- Localização: Rua Augusta 1500, Consolação
- Telefone: (11) 3456-7890
- Reservas: aceita pelo telefone ou site

Cardápio principal:
- Pizza margherita: R$ 45
- Pizza calabresa: R$ 48
- Massa carbonara: R$ 38
- Risoto ao funghi: R$ 42
- Tiramisù: R$ 18

Como responder:
1. Seja direta e objetiva
2. Se não souber, seja honesta
3. Sempre ofereça próximo passo
4. Não invente informações',
  true
FROM companies
WHERE slug = 'bella-vista';

-- ==================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ==================================================

COMMENT ON TABLE companies IS 'Empresas/estabelecimentos cadastrados no sistema';
COMMENT ON TABLE company_admins IS 'Usuários administradores de cada empresa';
COMMENT ON TABLE company_prompts IS 'Prompts customizados para assistentes de voz';
COMMENT ON TABLE conversations IS 'Conversas entre clientes e assistentes';
COMMENT ON TABLE messages IS 'Mensagens individuais dentro de cada conversa';

-- ==================================================
-- FIM DO SCHEMA
-- ==================================================

-- Para verificar se tudo foi criado corretamente:
SELECT 
  tablename, 
  schemaname 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('companies', 'company_admins', 'company_prompts', 'conversations', 'messages');
