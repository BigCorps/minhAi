// app/api/voice/vendas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { synthesizeSpeech, BRAZILIAN_VOICES } from '@/lib/google-tts';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /forget\s+(everything|all|your|what)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the)/i,
  /new\s+(role|persona|instructions?|system\s+prompt)/i,
  /\[system\]/i,
  /\[assistant\]/i,
  /\[inst\]/i,
  /<\|im_start\|>/i,
  /<\|system\|>/i,
  /###\s*instruction/i,
  /prompt\s*injection/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
];

function sanitizeInput(text: string): { safe: string; blocked: boolean } {
  if (!text || typeof text !== 'string') return { safe: '', blocked: false };
  const truncated = text.slice(0, 1000);
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(truncated)) return { safe: '', blocked: true };
  }
  return {
    safe: truncated.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim(),
    blocked: false,
  };
}

function resolveVoiceName(ttsVoice: string | null | undefined): string {
  const allowed = [BRAZILIAN_VOICES.NEURAL_MALE, BRAZILIAN_VOICES.NEURAL_FEMALE];
  if (ttsVoice && allowed.includes(ttsVoice as any)) return ttsVoice;
  return BRAZILIAN_VOICES.NEURAL_MALE;
}

function buildVendasSystemPrompt(company: {
  name: string;
  system_prompt?: string | null;
  assistant_role?: string | null;
}, companyContext: string | null): string {
  const role = company.assistant_role || 'assistente de vendas';
  const base = company.system_prompt
    ? company.system_prompt
    : `Você é ${role} da empresa ${company.name}.`;

  const contextBlock = companyContext
    ? `\n\n## Dados atuais da empresa (produtos, preços, horários):\n${companyContext}`
    : '';

const rules = `\n\n## Seu papel como vendedor:
Você é um vendedor profissional ativo — não espere o cliente pedir, antecipe.

### Ao apresentar produtos:
- Quando o cliente mencionar o que quer, apresente o produto pelo nome e preço imediatamente
- Se houver opções similares, mencione até 2 alternativas com preços
- Destaque benefícios em 1 frase curta
- Pergunte a quantidade se aplicável

### Ao fechar a venda:
- Após o cliente confirmar o interesse, já ofereça as formas de pagamento disponíveis:
  PIX, cartão por aproximação (NFC), maquininha (TEF) ou link de pagamento
- Não espere o cliente perguntar como pagar — ofereça proativamente
- Após confirmação do pagamento, confirme o pedido pelo nome do produto e valor total

### Ao registrar:
- Quando o cliente disser "quero", "pode ser", "sim", "fechado" ou similar, entenda como confirmação de compra
- Registre a venda e confirme: "Perfeito! [produto] por [valor]. Como vai pagar?"

### Regras de resposta:
- Máximo 2-3 frases por resposta (será falado em voz alta)
- Português brasileiro, tom direto, confiante e amigável
- NUNCA invente preços — use apenas os dados dos produtos acima
- Se o produto não estiver no catálogo, diga que não temos e sugira o mais próximo
- Se não souber a informação, seja honesto`;

  return `${base}${contextBlock}${rules}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n=== 🛒 VENDAS ROUTE ===');

  try {
    const formData = await request.formData();
    const companyId = formData.get('companyId') as string;
    const directQuestion = formData.get('directQuestion') as string | null;
    const companyContext = formData.get('companyContext') as string | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!companyId || !directQuestion) {
      return NextResponse.json({ error: 'companyId e directQuestion obrigatórios' }, { status: 400 });
    }

    const { safe: userMessage, blocked } = sanitizeInput(directQuestion);

    if (blocked) {
      console.warn(`🚨 Mensagem bloqueada — company: ${companyId}`);
      const supabase = createClient();
      const { data: company } = await supabase
        .from('companies')
        .select('tts_voice')
        .eq('id', companyId)
        .single();
      const blockedAudio = await synthesizeSpeech({
        text: 'Não consigo processar essa solicitação.',
        voiceName: resolveVoiceName(company?.tts_voice),
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(blockedAudio), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Security-Block': 'true' },
      });
    }

    if (!userMessage) {
      const supabase = createClient();
      const { data: company } = await supabase
        .from('companies')
        .select('tts_voice')
        .eq('id', companyId)
        .single();
      const errorAudio = await synthesizeSpeech({
        text: 'Não consegui te ouvir. Pode repetir?',
        voiceName: resolveVoiceName(company?.tts_voice),
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(errorAudio), {
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }

    const supabase = createClient();

    const { data: company } = await supabase
      .from('companies')
      .select('id, name, system_prompt, assistant_role, tts_voice, assistant_type')
      .eq('id', companyId)
      .single();

    if (!company) throw new Error('Company not found');

    // Segurança: só atende assistentes do tipo vendas
    if (company.assistant_type !== 'vendas') {
      return NextResponse.json({ error: 'Rota exclusiva para assistentes versão Vendas' }, { status: 403 });
    }

    const voiceName = resolveVoiceName(company.tts_voice);

    // Histórico de sessão (reutiliza tabela existente)
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let currentSessionId = sessionId;

    if (sessionId) {
      const { data: session } = await supabase
        .from('assistant_sessions')
        .select('messages')
        .eq('id', sessionId)
        .eq('company_id', companyId)
        .single();

      if (session) {
        conversationHistory = session.messages || [];
      }
    }

    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      await supabase.from('assistant_sessions').insert({
        id: currentSessionId,
        company_id: companyId,
        messages: [],
      });
    }

    console.log(`👂 "${userMessage}"`);

    const systemPrompt = buildVendasSystemPrompt(company, companyContext);

    // GROQ direto
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 150,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-8),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      throw new Error(`GROQ error: ${groqResponse.status} — ${err}`);
    }

    const groqData = await groqResponse.json();
    const responseText: string = groqData.choices?.[0]?.message?.content?.trim() || 'Desculpe, não entendi.';

    console.log('🤖 GROQ respondeu:', responseText);

    // Extrair pending_intent — produto + valor mencionados para contexto futuro
    const mentionedPrice = responseText.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/);
    if (mentionedPrice) {
      // Salvar em last_function_keys para o próximo classify saber o valor em jogo
      const priceValue = mentionedPrice[1].replace(',', '.');
      conversationHistory.push({
        role: 'assistant' as const,
        content: `[contexto: produto cotado a R$${priceValue}] ${responseText}`,
      });
    }

    // Atualiza histórico
    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: responseText }
    );
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    await supabase
      .from('assistant_sessions')
      .update({
        messages: conversationHistory,
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq('id', currentSessionId);

    // Log (sem débito de créditos)
    await supabase.from('assistant_function_logs').insert({
      company_id: companyId,
      function_key: 'chatgpt',
      credits_consumed: 0,
      metadata: {
        user_input: userMessage,
        assistant_response: responseText,
        source: 'vendas_groq',
      },
    });

    const audioBuffer = await synthesizeSpeech({
      text: responseText,
      voiceName,
      speakingRate: 1.2,
      audioEncoding: 'MP3',
    });

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total: ${totalTime}ms\n`);

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Session-Id': currentSessionId,
        'X-Processing-Time': String(totalTime),
        'X-Transcription': encodeURIComponent(userMessage),
        'X-Response-Text': encodeURIComponent(responseText.slice(0, 300)),
      },
    });

  } catch (error: any) {
    console.error('❌ Erro vendas route:', error.message);
    try {
      const audioBuffer = await synthesizeSpeech({
        text: 'Desculpe, ocorreu um erro.',
        voiceName: BRAZILIAN_VOICES.NEURAL_MALE,
        speakingRate: 1.2,
        audioEncoding: 'MP3',
      });
      return new Response(new Uint8Array(audioBuffer), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Error': 'true' },
      });
    } catch {
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
  }
}
