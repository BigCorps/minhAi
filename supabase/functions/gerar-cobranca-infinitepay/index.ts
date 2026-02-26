// supabase/functions/gerar-cobranca-infinitepay/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Telefone padrão exigido pelo checkout — o cliente preenche o real na tela de pagamento
const TELEFONE_PLACEHOLDER = '11999999999';

interface RequestBody {
  company_id: string;
  amount_cents: number;
  tipo: 'LINK_PAGAMENTO' | 'NFC';
  nfc_payment_method?: 'debit' | 'credit'; // obrigatório para NFC
  telefone?: string;                        // opcional — cliente preenche no checkout
  descricao?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const {
      company_id, amount_cents, tipo,
      nfc_payment_method, telefone, descricao,
    }: RequestBody = await req.json();

    // ── Validações básicas ───────────────────────────────────────────────
    if (!company_id || !amount_cents || !tipo)
      throw new Error('company_id, amount_cents e tipo são obrigatórios');

    if (tipo === 'NFC' && !nfc_payment_method)
      throw new Error('nfc_payment_method (debit | credit) é obrigatório para NFC');

    // ── Buscar handle InfinitePay da empresa ─────────────────────────────
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, user_id, infinitepay_handle')
      .eq('id', company_id)
      .single();

    if (companyError || !company)
      throw new Error('Empresa não encontrada');

    if (!company.infinitepay_handle)
      throw new Error(
        'Token InfinitePay não configurado. Acesse o Dashboard > Funções > InfinitePay e insira seu handle.'
      );

    // Remove o $ inicial se presente
    const token = company.infinitepay_handle.startsWith('$')
      ? company.infinitepay_handle.substring(1)
      : company.infinitepay_handle;

    // ── Gerar order_id único ─────────────────────────────────────────────
    const orderId = `eai-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // ── Construir link conforme tipo ─────────────────────────────────────
    let link_cobranca = '';

    if (tipo === 'LINK_PAGAMENTO') {
      // Telefone: usa o enviado pelo frontend (se vier) ou o placeholder.
      // O cliente preenche o telefone real na tela de checkout da InfinitePay
      // para receber o código de confirmação.
      const telefoneParam = telefone
        ? telefone.replace(/\D/g, '')
        : TELEFONE_PLACEHOLDER;

      const params = new URLSearchParams({
        valor_centavos: amount_cents.toString(),
        order_id: orderId,
        telefone: telefoneParam,
        nome: 'SeuNome',
        email: 'seuemail@seuemail.com',
        cep: '01310100',
        numero: '1',
        resultId: crypto.randomUUID(),
        handle: token,
      });
      link_cobranca = `https://checkout.bigcorps.com.br/redirect.html?${params}`;
    } else {
      // NFC
      const params = new URLSearchParams({
        amount: amount_cents.toString(),
        payment_method: nfc_payment_method!,
        installments: '1',
        order_id: orderId,
        result_url: 'https://checkout.bigcorps.com.br/api/tap_result',
        app_client_referrer: token,
      });
      link_cobranca = `https://infinitepay.onelink.me/JmLI/infinitetapapp?${params}`;
    }

    // ── Salvar cobrança como ATIVA (crédito NÃO é cobrado ainda) ─────────
    const { data: cobranca, error: insertError } = await supabase
      .from('cobrancas')
      .insert({
        company_id,
        user_id: company.user_id,
        descricao: descricao || `Pagamento ${tipo === 'LINK_PAGAMENTO' ? 'por Link' : `NFC ${nfc_payment_method === 'debit' ? 'Débito' : 'Crédito'}`}`,
        valor: (amount_cents / 100).toFixed(2),
        tipo,
        nfc_payment_method: nfc_payment_method ?? null,
        status: 'ATIVA',
        order_id: orderId,
        link_cobranca,
        pagador_telefone: telefone ? telefone.replace(/\D/g, '') : null,
        credits_charged: false,
      })
      .select()
      .single();

    if (insertError)
      throw new Error(`Erro ao salvar cobrança: ${insertError.message}`);

    console.log(`✅ Cobrança criada: ${cobranca.id} | tipo=${tipo} | order_id=${orderId}`);

    return new Response(
      JSON.stringify({
        success: true,
        cobranca_id: cobranca.id,
        order_id: orderId,
        link_cobranca,
        amount_brl: (amount_cents / 100).toFixed(2),
        tipo,
        nfc_payment_method: nfc_payment_method ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('❌ gerar-cobranca-infinitepay:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
