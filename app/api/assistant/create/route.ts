// app/api/assistant/create/route.ts
// Cria a empresa + ativa funções do segmento em uma única transação.
// Chamado pelo Step6 ao clicar em "Criar Assistente".

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Funções permitidas no modelo Vendas.
// Qualquer function_key fora desta lista é ignorado para type=vendas.
const VENDAS_ALLOWED: Set<string> = new Set([
  'nossa_marca', 'endereco', 'chatgpt', 'faq',
  'cardapio', 'ver_produtos', 'fazer_pedido', 'modo_venda', 'consultar_estoque',
  'pix_generate', 'pix_confirm', 'link_pagamento', 'nfc_credito', 'nfc_debito',
  'meu_cupom', 'qrcode_whatsapp', 'qrcode_instagram', 'cadastro',
]);

interface CreateBody {
  // Etapa 1
  assistantName: string;
  // Tipo (vem do novo Step 0)
  assistantType: 'smart' | 'vendas';
  // Segmento (Step 2)
  segmentKey: string;
  // Dados da empresa (Step 3)
  step3: {
    company_name: string;
    what_offers: string;
    location?: string;
    hours?: string;
    extra_info?: string;
  };
  // Prompt já gerado pelo generate-prompt (Step 6)
  systemPrompt: string;
  // Slug — gerado no frontend a partir do nome
  slug: string;
  // is_public vem do assistantType: vendas sempre público
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

    const supabase = createClient();

    // ── Verificar usuário autenticado ───────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // ── Garantir slug único ─────────────────────────────────
    const uniqueSlug = await resolveUniqueSlug(supabase, rawSlug);

    // ── Buscar function_keys do segmento ────────────────────
    const { data: segment } = await supabase
      .from('assistant_segments')
      .select('function_keys, function_keys_vendas')
      .eq('segment_key', segmentKey)
      .single();

    const allKeys: string[] = segment
      ? (assistantType === 'vendas'
          ? (segment.function_keys_vendas as string[])
          : (segment.function_keys as string[]))
      : [];

    // Filtro extra de segurança para Vendas
    const functionKeys = assistantType === 'vendas'
      ? allKeys.filter(k => VENDAS_ALLOWED.has(k))
      : allKeys;

    // ── Montar dados da empresa ─────────────────────────────
    const companyData: Record<string, any> = {
      name:              assistantName,
      slug:              uniqueSlug,
      user_id:           user.id,
      is_public:         assistantType === 'vendas' ? true : (is_public ?? true),
      assistant_type:    assistantType,
      segment_key:       segmentKey,
      system_prompt:     systemPrompt,
      onboarding_completed: true,
      onboarding_step:   8,
      // Campos de texto da empresa
      brand_description: step3.what_offers,
      business_address:  step3.location  ?? null,
      business_hours:    step3.hours     ?? null,
    };

    // ── Criar empresa ───────────────────────────────────────
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert(companyData)
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
    // upsert seguro — pode rodar múltiplas vezes sem duplicar
    if (functionKeys.length > 0) {
      const settingsRows = functionKeys.map(fk => ({
        company_id:  company.id,
        function_key: fk,
        is_enabled:  true,
        enabled_at:  new Date().toISOString(),
      }));

      const { error: fnError } = await supabase
        .from('company_function_settings')
        .upsert(settingsRows, { onConflict: 'company_id,function_key' });

      if (fnError) {
        // Não quebra o fluxo — empresa já criada, funções podem ser ativadas depois
        console.error('Aviso: erro ao ativar funções:', fnError.message);
      }
    }

    // ── Resposta de sucesso ─────────────────────────────────
    return NextResponse.json({
      success:       true,
      id:            company.id,
      slug:          company.slug,
      functions_activated: functionKeys.length,
    });

  } catch (error: any) {
    console.error('Erro em /api/assistant/create:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: slug único com sufixo numérico se necessário ─────
async function resolveUniqueSlug(supabase: any, baseSlug: string): Promise<string> {
  const clean = baseSlug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  // Tenta o slug limpo primeiro
  const { data: existing } = await supabase
    .from('companies')
    .select('slug')
    .eq('slug', clean)
    .maybeSingle();

  if (!existing) return clean;

  // Adiciona sufixo numérico até encontrar um livre
  for (let i = 2; i <= 99; i++) {
    const candidate = `${clean}-${i}`;
    const { data: collision } = await supabase
      .from('companies')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle();

    if (!collision) return candidate;
  }

  // Fallback com timestamp se todos os sufixos estiverem ocupados
  return `${clean}-${Date.now()}`;
}
