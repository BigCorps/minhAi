// supabase/functions/meta-cadastrar-produto/index.ts
//
// Fluxo de cadastro de produtos via WhatsApp/Instagram/Facebook.
// Gerencia estado conversacional por from_id + company_id.
// Suporta cadastro de 1 produto por fluxo guiado (texto simples).
// Se o usuário pedir algo complexo (lista, arquivo, imagem), sugere o dashboard.
// Crédito cobrado via register_function_usage SOMENTE após salvar com sucesso.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FlowStep =
  | 'aguardando_nome'
  | 'aguardando_preco'
  | 'aguardando_categoria'
  | 'aguardando_estoque'
  | 'confirmando'
  | 'concluido';

interface FlowState {
  step:         FlowStep;
  nome?:        string;
  preco_venda?: number;
  categoria?:   string;
  estoque?:     number;
  tentativas:   number;
  iniciado_em:  string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Triggers que iniciam o fluxo (detectados pelo meta-message-router)
export const TRIGGERS_CADASTRAR = [
  'cadastrar produto', 'cadastrar produtos', 'novo produto',
  'adicionar produto', 'adicionar ao cardápio', 'adicionar ao cardapio',
  'registrar produto', 'criar produto', 'incluir produto',
  'quero cadastrar', 'preciso cadastrar',
];

// Palavras que indicam complexidade → sugere dashboard
const TRIGGERS_COMPLEXO = [
  'lista', 'vários', 'varios', 'planilha', 'excel', 'csv',
  'arquivo', 'cardápio', 'cardapio', 'foto', 'imagem', 'pdf',
  'importar', 'muitos produtos', 'varias fotos',
];

// Máximo de tentativas por campo antes de abandonar
const MAX_TENTATIVAS = 3;

// TTL do estado em horas
const STATE_TTL_HOURS = 2;

// Chave de estado no Supabase (usa assistant_sessions como storage genérico de estado)
// Armazenado em meta_flow_states se existir, senão usa uma key no message_debounce como fallback
// Na prática usamos uma tabela simples de KV via Supabase RPC ou diretamente

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extrairPreco(texto: string): number | null {
  const palavras: Record<string, number> = {
    'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
    'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
    'dez': 10, 'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
    'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90, 'cem': 100,
  };
  let lower = texto.toLowerCase();
  for (const [p, n] of Object.entries(palavras)) {
    lower = lower.replace(new RegExp(`\\b${p}\\b`, 'g'), String(n));
  }
  lower = lower.replace(/reais?|r\$|\$/gi, '').trim();
  const m = lower.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(',', '.'));
  return isNaN(val) || val <= 0 ? null : val;
}

function isPular(texto: string): boolean {
  return ['pular', 'não sei', 'nao sei', 'skip', 'não', 'nao', 'passar', 'próximo', 'proximo'].some(
    t => texto.toLowerCase().trim().includes(t)
  );
}

function isConfirmar(texto: string): boolean {
  return ['sim', 'confirmar', 'confirma', 'correto', 'certo', 'salvar', 'cadastrar', 'ok', 'isso'].some(
    t => texto.toLowerCase().trim().includes(t)
  );
}

function isCancelar(texto: string): boolean {
  return ['não', 'nao', 'cancelar', 'cancela', 'desistir', 'errei', 'errado', 'recomeçar', 'recomecar'].some(
    t => texto.toLowerCase().trim() === t
  );
}

function isComplexa(texto: string): boolean {
  const lower = texto.toLowerCase();
  return TRIGGERS_COMPLEXO.some(t => lower.includes(t));
}

function formatarPreco(val: number): string {
  return `R$ ${val.toFixed(2).replace('.', ',')}`;
}

function estadoExpirado(state: FlowState): boolean {
  const iniciado = new Date(state.iniciado_em).getTime();
  const agora    = Date.now();
  return agora - iniciado > STATE_TTL_HOURS * 60 * 60 * 1000;
}

// ─── Mensagens do fluxo ───────────────────────────────────────────────────────

const MSG = {
  inicio: (companyName: string) =>
    `📦 *Cadastrar Produto — ${companyName}*\n\nVamos começar! Qual o *nome* do produto?`,

  aguardandoPreco: (nome: string) =>
    `✅ Nome: *${nome}*\n\nAgora, qual o *preço de venda*?\n_(Ex: R$ 45,90 ou "quarenta e cinco reais")_`,

  aguardandoCategoria: (preco: number) =>
    `✅ Preço: *${formatarPreco(preco)}*\n\nQual a *categoria*? _(ou diga "pular")_\n_(Ex: Pizzas, Bebidas, Sobremesas...)_`,

  aguardandoEstoque: (categoria: string | undefined) =>
    `✅ Categoria: *${categoria || 'não informada'}*\n\nQuantidade em *estoque inicial*? _(ou diga "pular" para zero)_`,

  confirmacao: (state: FlowState) =>
    `📋 *Confirme os dados:*\n\n` +
    `📦 *Nome:* ${state.nome}\n` +
    `💰 *Preço:* ${formatarPreco(state.preco_venda!)}\n` +
    `🏷️ *Categoria:* ${state.categoria || '—'}\n` +
    `📦 *Estoque:* ${state.estoque ?? 0} unidades\n\n` +
    `Diga *"confirmar"* para salvar ou *"não"* para recomeçar.`,

  salvoSucesso: (nome: string, preco: number) =>
    `✅ *Produto cadastrado!*\n\n*${nome}* — ${formatarPreco(preco)}\n\nJá aparece no cardápio e na loja. 🎉`,

  erroPreco: () =>
    `Não entendi o preço. Tente assim: *"45,90"* ou *"R$ 45,90"* ou *"quarenta e cinco reais"*`,

  erroPadrao: () =>
    `Não entendi. Tente novamente ou diga *"cancelar"* para desistir.`,

  cancelado: () =>
    `Ok, cadastro cancelado. Se quiser tentar de novo, basta dizer *"cadastrar produto"*.`,

complexo: () =>
    `Para cadastrar *vários produtos de uma vez*, você tem duas opções:\n\n` +
    `📋 *Baixar o modelo CSV* e preencher no Excel:\n👉 Acesse o dashboard → Produtos → *"Baixar modelo CSV"*\n\n` +
    `🖥️ *Usar o Auxiliar de Cadastro* (PDF, foto, planilha, IA):\n👉 *minhai.app/dashboard/vendas*\n\n` +
    `_(Lá você também pode adicionar imagens e preparar para emissão de nota fiscal)_`,
  tentativasExcedidas: () =>
    `Muitas tentativas sem sucesso. Cadastro cancelado. Você pode tentar pelo dashboard: *minhai.app/dashboard/vendas*`,
};

// ─── Gerenciar estado no Supabase ─────────────────────────────────────────────
// Usamos a tabela message_debounce como KV store de estado de fluxo
// key: `cadastro_produto:{company_id}:{from_id}`

async function getState(
  supabase: any,
  companyId: string,
  fromId: string
): Promise<FlowState | null> {
  const key = `cadastro_produto:${companyId}:${fromId}`;
  const { data } = await supabase
    .from('message_debounce')
    .select('payload')
    .eq('key', key)
    .maybeSingle();

  if (!data?.payload) return null;
  const state = data.payload as FlowState;
  if (estadoExpirado(state)) {
    await clearState(supabase, companyId, fromId);
    return null;
  }
  return state;
}

async function setState(
  supabase: any,
  companyId: string,
  fromId: string,
  state: FlowState
): Promise<void> {
  const key = `cadastro_produto:${companyId}:${fromId}`;
  await supabase
    .from('message_debounce')
    .upsert({ key, payload: state, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

async function clearState(
  supabase: any,
  companyId: string,
  fromId: string
): Promise<void> {
  const key = `cadastro_produto:${companyId}:${fromId}`;
  await supabase.from('message_debounce').delete().eq('key', key);
}

// ─── Salvar produto ───────────────────────────────────────────────────────────

async function salvarProduto(
  supabase: any,
  companyId: string,
  state: FlowState
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('produtos_venda')
      .insert({
        company_id:       companyId,
        nome:             state.nome!.trim(),
        preco_venda:      state.preco_venda!,
        preco_custo:      0,
        categoria:        state.categoria?.trim() || null,
        unidade:          'un',
        estoque_atual:    state.estoque ?? 0,
        estoque_minimo:   0,
        controla_estoque: false,
        is_active:        true,
        is_favorito:      false,
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Cobrar crédito ───────────────────────────────────────────────────────────

async function cobrarCredito(supabase: any, companyId: string): Promise<void> {
  try {
    await supabase.rpc('register_function_usage', {
      p_company_id:       companyId,
      p_function_key:     'cadastrar_produto',
      p_credits_consumed: 1,
    });
  } catch { /* não bloqueia */ }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function handleCadastrarProduto(
  supabase: any,
  companyId: string,
  company: any,
  fromId: string,
  mensagem: string
): Promise<string> {
  const msg    = mensagem.trim();
  const lower  = msg.toLowerCase();

  // ── Detecta pedido complexo antes de qualquer coisa ──────────────────────
  if (isComplexa(msg)) {
    await clearState(supabase, companyId, fromId);
    return MSG.complexo();
  }

  // ── Busca estado atual ────────────────────────────────────────────────────
  let state = await getState(supabase, companyId, fromId);

  // ── Sem estado: inicia fluxo ──────────────────────────────────────────────
  if (!state) {
    // Verifica se a mensagem em si já contém nome + preço (cadastro rápido)
    // Ex: "cadastrar produto Pizza Margherita 45,90"
    const precoInline = extrairPreco(msg);
    const nomeInline  = msg
      .replace(/cadastrar?\s*produtos?/gi, '')
      .replace(/R?\$?\s*\d+(?:[.,]\d{1,2})?/g, '')
      .replace(/reais?/gi, '')
      .trim();

    if (nomeInline.length >= 2 && precoInline && precoInline > 0) {
      // Cadastro rápido — pula direto para categoria
      const novoState: FlowState = {
        step:        'aguardando_categoria',
        nome:        nomeInline,
        preco_venda: precoInline,
        tentativas:  0,
        iniciado_em: new Date().toISOString(),
      };
      await setState(supabase, companyId, fromId, novoState);
      return MSG.aguardandoCategoria(precoInline);
    }

    // Fluxo normal: começa pelo nome
    const novoState: FlowState = {
      step:       'aguardando_nome',
      tentativas: 0,
      iniciado_em: new Date().toISOString(),
    };
    await setState(supabase, companyId, fromId, novoState);
    return MSG.inicio(company.name ?? 'sua loja');
  }

  // ── Cancelamento global ───────────────────────────────────────────────────
  if (isCancelar(msg) && state.step !== 'confirmando') {
    await clearState(supabase, companyId, fromId);
    return MSG.cancelado();
  }

  // ── Máximo de tentativas ──────────────────────────────────────────────────
  if (state.tentativas >= MAX_TENTATIVAS) {
    await clearState(supabase, companyId, fromId);
    return MSG.tentativasExcedidas();
  }

  // ── Processar por step ────────────────────────────────────────────────────

  switch (state.step) {

    // ── Nome ────────────────────────────────────────────────────────────────
    case 'aguardando_nome': {
      if (msg.length < 2) {
        await setState(supabase, companyId, fromId, { ...state, tentativas: state.tentativas + 1 });
        return MSG.erroPadrao();
      }
      const novoState: FlowState = {
        ...state,
        step:       'aguardando_preco',
        nome:       msg,
        tentativas: 0,
      };
      await setState(supabase, companyId, fromId, novoState);
      return MSG.aguardandoPreco(msg);
    }

    // ── Preço ───────────────────────────────────────────────────────────────
    case 'aguardando_preco': {
      const preco = extrairPreco(msg);
      if (!preco || preco <= 0) {
        await setState(supabase, companyId, fromId, { ...state, tentativas: state.tentativas + 1 });
        return MSG.erroPreco();
      }
      const novoState: FlowState = {
        ...state,
        step:        'aguardando_categoria',
        preco_venda: preco,
        tentativas:  0,
      };
      await setState(supabase, companyId, fromId, novoState);
      return MSG.aguardandoCategoria(preco);
    }

    // ── Categoria ───────────────────────────────────────────────────────────
    case 'aguardando_categoria': {
      const categoria = isPular(msg) ? undefined : msg;
      const novoState: FlowState = {
        ...state,
        step:       'aguardando_estoque',
        categoria,
        tentativas: 0,
      };
      await setState(supabase, companyId, fromId, novoState);
      return MSG.aguardandoEstoque(categoria);
    }

    // ── Estoque ─────────────────────────────────────────────────────────────
    case 'aguardando_estoque': {
      let estoque = 0;
      if (!isPular(msg)) {
        const num = parseInt(msg.replace(/\D/g, ''));
        estoque = isNaN(num) ? 0 : num;
      }
      const novoState: FlowState = { ...state, step: 'confirmando', estoque, tentativas: 0 };
      await setState(supabase, companyId, fromId, novoState);
      return MSG.confirmacao(novoState);
    }

    // ── Confirmação ─────────────────────────────────────────────────────────
    case 'confirmando': {
      if (isCancelar(msg)) {
        // Recomeça do início
        await clearState(supabase, companyId, fromId);
        const novoState: FlowState = {
          step: 'aguardando_nome',
          tentativas: 0,
          iniciado_em: new Date().toISOString(),
        };
        await setState(supabase, companyId, fromId, novoState);
        return MSG.inicio(company.name ?? 'sua loja');
      }

      if (!isConfirmar(msg)) {
        await setState(supabase, companyId, fromId, { ...state, tentativas: state.tentativas + 1 });
        return `Por favor, diga *"confirmar"* para salvar ou *"não"* para recomeçar.\n\n${MSG.confirmacao(state)}`;
      }

      // Salvar
      const resultado = await salvarProduto(supabase, companyId, state);
      if (!resultado.success) {
        await clearState(supabase, companyId, fromId);
        return `❌ Erro ao cadastrar: ${resultado.error ?? 'tente novamente'}`;
      }

      // Cobrar crédito após sucesso
      await cobrarCredito(supabase, companyId);
      await clearState(supabase, companyId, fromId);

      return MSG.salvoSucesso(state.nome!, state.preco_venda!);
    }

    default:
      await clearState(supabase, companyId, fromId);
      return MSG.inicio(company.name ?? 'sua loja');
  }
}

// ─── Serve ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  // PHASE5_SERVICE_ROLE_ONLY — worker interno: somente service_role.
  if (req.method !== 'OPTIONS') {
    const expectedServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const receivedAuthorization = req.headers.get('authorization') ?? ''
    if (!expectedServiceRole || receivedAuthorization !== `Bearer ${expectedServiceRole}`) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const bodyText = await req.text();
    const { company_id, company, from_id, mensagem } = JSON.parse(bodyText);

    if (!company_id || !from_id || !mensagem) {
      return new Response(
        JSON.stringify({ error: 'company_id, from_id e mensagem são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resposta = await handleCadastrarProduto(supabase, company_id, company, from_id, mensagem);

    return new Response(
      JSON.stringify({ resposta, functionKey: 'cadastrar_produto', creditsUsed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err: any) {
    console.error('meta-cadastrar-produto error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
