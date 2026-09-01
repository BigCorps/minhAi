// components/VoiceAssistant/functions/types.ts

import { createClient } from '@/lib/supabase-browser';

export interface FunctionContext {
  companyId: string;
  conversationId: string | null;
  supabase: ReturnType<typeof createClient>;
  setIsProcessing: (value: boolean) => void;
  setQrCodeData: (data: any) => void;
  setPixConfirmationData: (data: any) => void;
  pixStateRef: React.MutableRefObject<any>;
  playText: (text: string) => Promise<void>;
}

export interface FunctionHandler {
  key: string;
  category: 'knowledge' | 'contact' | 'payment' | 'schedule' | 'other';
  triggers: string[];
  detect: (transcript: string) => boolean;
  execute: (transcript: string, context: FunctionContext) => Promise<void>;
  demo: () => DemoContent;
}

export interface DemoContent {
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  steps: string[];
}

export interface AssistantFunction {
  id: string;
  function_key: string;
  function_name: string;
  function_category: string;
  description: string;
  short_description: string;
  demo_text: string;
  demo_image_url?: string;
  icon: string;
  color: string;
  requires_payment: boolean;
  is_premium: boolean;
  save_to_history: boolean;
  consumes_credits: boolean;
  credits_per_use: number;
  voice_triggers: string[];
  example_phrases: string[];
  edge_function: string;
  ui_component?: string;
  is_active: boolean;
  display_order: number;
}

export interface CompanyFunctionSetting {
  id: string;
  company_id: string;
  function_key: string;
  is_enabled: boolean;
  custom_name?: string;
  custom_description?: string;
  custom_credits_per_use?: number;
  usage_count: number;
  total_credits_consumed: number;
  last_used_at?: string;
}
