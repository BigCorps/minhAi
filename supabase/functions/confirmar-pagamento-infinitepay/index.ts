// supabase/functions/confirmar-pagamento-infinitepay/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { cobranca_id, company_id } = await req.json();

    if (!cobranca_id || !company_id)
      throw new Error('cobranca_id e company_id são obrigatórios');

    // ── Buscar cobrança ───────────────────────────────────────────────────
    const { data: cobranca, error: fetchError } = await supabase
      .from('cobrancas')
      .select('*')
      .eq('id', cobranca_id)
      .eq('company_id', company_id)
      .single();

    if (fetchError || !cobranca)
      throw new Error('Cobrança não encontrada');

    if (cobranca.status === 'PAGA')
      return new Response(
        JSON.stringify({ success: true, already_confirmed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );

    if (cobranca.credits_charged)
      throw new Error('Créditos já foram cobrados para esta cobrança');

    // ── Atualizar cobrança para PAGA ──────────────────────────────────────
    const { error: updateError } = await supabase
      .from('cobrancas')
      .update({
        status: 'PAGA',
        credits_charged: true,
        paid_at: new Date().toISOString(),
      })
      .eq('id', cobranca_id);

    if (updateError)
      throw new Error(`Erro ao atualizar cobrança: ${updateError.message}`);

    // ── Cobrar créditos ───────────────────────────────────────────────────
    // Buscar usuário dono da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', company_id)
      .single();

    if (company?.user_id) {
      // Decrementar créditos
      const { data: credits } = await supabase
        .from('user_credits')
        .select('available_credits')
        .eq('user_id', company.user_id)
        .single();

      if (credits && credits.available_credits >= 1) {
        await supabase
          .from('user_credits')
          .update({
            available_credits: credits.available_credits - 1,
            total_used: (credits.available_credits || 0) + 1, // será recalculado
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', company.user_id);
      }

      // Registrar no log de funções (histórico)
      await supabase
        .from('assistant_function_logs')
        .insert({
          company_id,
          user_id: company.user_id,
          function_key: cobranca.tipo === 'LINK_PAGAMENTO' ? 'link_pagamento'
            : cobranca.nfc_payment_method === 'debit' ? 'nfc_debito' : 'nfc_credito',
          credits_consumed: 2,
          metadata: {
            cobranca_id: cobranca.id,
            order_id: cobranca.order_id,
            valor: cobranca.valor,
            tipo: cobranca.tipo,
            nfc_payment_method: cobranca.nfc_payment_method,
          },
        });
    }

    console.log(`✅ Pagamento confirmado: cobranca_id=${cobranca_id} | créditos cobrados`);

    return new Response(
      JSON.stringify({ success: true, cobranca_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('❌ confirmar-pagamento-infinitepay:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
