// app/api/assistant/create/route.ts
// Cria a empresa + ativa funções do segmento em uma única transação.
// Chamado pelo Step6 ao clicar em "Criar Assistente".

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Funções permitidas no modelo Vendas.
const VENDAS_ALLOWED: Set<string> = new Set([
  'nossa_marca', 'endereco', 'chatgpt', 'faq',
  'cardapio', 'ver_produtos', 'fazer_pedido', 'modo_venda', 'consultar_estoque',
  'pix_generate', 'pix_confirm', 'link_pagamento', 'nfc_credito', 'nfc_debito',
  'meu_cupom', 'qrcode_whatsapp', 'qrcode_instagram', 'cadastro',
]);

interface CreateBody {
  assistantName: string;
  assistantType: 'smart' | 'vendas';
  segmentKey: string;
  step3: {
    company_name: string;
    what_offers: string;
    location?: string;
    hours?: string;
    extra_info?: string;
  };
  systemPrompt: string;
  slug: string;
  is_public?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBody = await request.json();
    const {
      assistantName,
      assistantType,
      segmentKey,
      step3,
      systemPrompt,
      slug: rawSlug,
      is_public,
    } = body;

    // ── Validação básica ────────────────────────────────────
    if (!assistantName || !segmentKey || !step3?.company_name || !systemPrompt || !rawSlug) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    // ── Autenticar usuário via cookie de sessão ─────────────
    // Usa o client de usuário APENAS para getUser() — todas as
    // escritas no banco vão pelo admin client (service_role).
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // ── Admin client — bypassa RLS para todas as escritas ───
    const admin = createAdminClient();

    // ── Garantir slug único ─────────────────────────────────
    const uniqueSlug = await resolveUniqueSlug(admin, rawSlug);

    // ── Buscar function_keys do segmento ────────────────────
    const { data: segment } = await admin
      .from('assistant_segments')
      .select('function_keys, function_keys_vendas')
      .eq('segment_key', segmentKey)
      .single();

    const allKeys: string[] = segment
      ? (assistantType === 'vendas'
          ? (segment.function_keys_vendas as string[])
          : (segment.function_keys as string[]))
      : [];

    const functionKeys = assistantType === 'vendas'
      ? allKeys.filter(k => VENDAS_ALLOWED.has(k))
      : allKeys;

    // ── Criar empresa ───────────────────────────────────────
    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({
        name:                 assistantName,
        slug:                 uniqueSlug,
        user_id:              user.id,
        is_public:            assistantType === 'vendas' ? true : (is_public ?? true),
        assistant_type:       assistantType,
        segment_key:          segmentKey,
        system_prompt:        systemPrompt,
        onboarding_completed: true,
        onboarding_step:      8,
        brand_description:    step3.what_offers,
        business_address:     step3.location ?? null,
        business_hours:       step3.hours    ?? null,
      })
      .select('id, slug')
      .single();

    if (companyError || !company) {
      console.error('Erro ao criar empresa:', companyError);
      return NextResponse.json(
        { error: companyError?.message ?? 'Erro ao criar assistente' },
        { status: 500 }
      );
    }

    // ── Ativar funções do segmento ──────────────────────────
    if (functionKeys.length > 0) {
      const settingsRows = functionKeys.map(fk => ({
        company_id:   company.id,
        function_key: fk,
        is_enabled:   true,
        enabled_at:   new Date().toISOString(),
      }));

      const { error: fnError } = await admin
        .from('company_function_settings')
        .upsert(settingsRows, { onConflict: 'company_id,function_key' });

      if (fnError) {
        console.error('Aviso: erro ao ativar funções:', fnError.message);
      }
    }

    return NextResponse.json({
      success:             true,
      id:                  company.id,
      slug:                company.slug,
      functions_activated: functionKeys.length,
    });

  } catch (error: any) {
    console.error('Erro em /api/assistant/create:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: slug único com sufixo numérico se necessário ─────
async function resolveUniqueSlug(admin: any, baseSlug: string): Promise<string> {
  const clean = baseSlug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const { data: existing } = await admin
    .from('companies')
    .select('slug')
    .eq('slug', clean)
    .maybeSingle();

  if (!existing) return clean;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${clean}-${i}`;
    const { data: collision } = await admin
      .from('companies')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();
    if (!collision) return candidate;
  }

  return `${clean}-${Date.now()}`;
}
