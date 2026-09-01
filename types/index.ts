// Tipos básicos do sistema
// Serão expandidos após configuração do Supabase

export interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  is_active: boolean;
  welcome_message?: string;
  wake_word?: string;
  voice_provider?: string;
  voice_id?: string;
  monthly_message_limit: number;
  current_month_usage: number;
}

export interface CompanyPrompt {
  id: string;
  company_id: string;
  name: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  company_id: string;
  prompt_id?: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'abandoned';
  total_messages: number;
  duration_seconds?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  satisfaction_score?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  audio_duration_ms?: number;
  tokens_used?: number;
  model_used?: string;
  transcription_confidence?: number;
  response_time_ms?: number;
}
