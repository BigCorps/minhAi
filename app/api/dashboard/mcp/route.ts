// app/api/dashboard/mcp/route.ts
// Classifica a mensagem com Groq:
//   → comando MCP  → mcp-whatsapp-handler (Supabase Edge Function)
//   → pergunta/conversa → Groq responde como assistente institucional minhAi

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase-server'
import Groq                          from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Lista de funções MCP disponíveis no widget ─────────────────────────────
// Formato idêntico ao functionsContext do classify — "label | key | quando usar"
const WIDGET_FUNCTIONS_CONTEXT = `
Gerar PIX           | pix          | cliente quer gerar um PIX, cobrar via PIX, receber dinheiro
Ver Produtos        | produtos     | cliente quer ver, listar ou consultar produtos do catálogo
Consultar Estoque   | estoque      | cliente quer saber o estoque atual de um produto
Ver Agenda          | agenda       | cliente quer ver compromissos, agenda do dia ou da semana
Ver Pedidos         | pedidos      | cliente quer ver pedidos em aberto ou histórico de pedidos
Fechar Caixa        | caixa        | cliente quer fechar o caixa, encerrar o turno
Registrar Venda     | venda        | cliente quer registrar uma venda manualmente (ex: "venda 100 pix")
Criar Nota          | nota         | cliente quer anotar algo, criar uma nota ou lembrete textual
Lista de Compras    | lista        | cliente quer ver, adicionar ou remover itens da lista de compras
Consultar CNPJ      | cnpj         | cliente quer consultar dados de um CNPJ específico
Consultar CEP       | cep          | cliente quer consultar um CEP ou endereço
Consultar Placa     | placa        | cliente quer consultar dados de um veículo pela placa
Cotação de Câmbio   | dolar        | cliente quer saber a cotação do dólar ou outras moedas
Rastreio Correios   | correios     | cliente quer rastrear uma encomenda pelos Correios
Anti-fraude         | fraude       | cliente quer verificar se um link ou boleto é fraude
`.trim()

// ── Prompt institucional minhAi (resumido para o Groq) ────────────────────
const MINHAI_SYSTEM_PROMPT = `Você é o assistente oficial do minhAi, plataforma de IA da BigCorps Tecnologia (CNPJ 14.282.244/0001-19).
Site: www.minhai.app | WhatsApp: (11) 92682-8418 | Email: contato@bigcorps.com.br
Slogan: "Uma IA pra chamar de sua!"

Você está conversando com um USUÁRIO JÁ LOGADO no dashboard do minhAi.
Responda em português brasileiro, tom amigável e direto. Respostas curtas e objetivas — este é um widget de chat.

═══ TIPOS DE ASSISTENTE ═══

minhAi SMART (azul):
- Propósito geral: atendimento, automação, produtividade. Mais de 100 funções.
- Cobrança pay-per-use: a partir de R$0,05 por interação. Plano gratuito com 20 créditos, sem cartão.
- Créditos sem prazo de validade.
- Ideal para: clínicas, academias, advocacia, escolas, suporte.

minhAi VENDAS (verde-limão):
- Especializado em vendas, pagamentos e gestão por voz para lojistas.
- GRATUITO para o lojista. A minhAi retém 10% sobre cada venda confirmada + 1% no saque PIX.
- Pagamentos: PIX (Banco Inter), NFC Débito/Crédito (InfinitePay), Link de Pagamento (InfinitePay), TEF Débito/Crédito (Mercado Pago Point Smart).
- Ideal para: lojistas, restaurantes, food trucks, mercados, padarias.

═══ FUNÇÕES DISPONÍVEIS (mais de 100) ═══

IA: ChatGPT/Perguntas Gerais, Criar Orçamento, FAQ, Traduzir Texto, Transcrever Áudio, Clima.
Pagamentos: Gerar PIX, Link de Pagamento, NFC Crédito/Débito, TEF Crédito/Débito, Segunda Via Boleto.
Fila: Gerar Senha, Painel TV, Chamar Próxima Senha, Pausar/Retomar Fila.
Agenda: Marcar Evento, Ver Agenda, Horários Disponíveis, Confirmar/Cancelar/Reagendar.
Vendas: Modo Venda, Catálogo, Fazer Pedido, Registrar Venda, Fechar Caixa, Relatório de Vendas.
Consultas: CNPJ, CPF, Placa, CEP, Rastreio Correios, Câmbio, Anti-fraude, Notícias.
OCR/Visão: Ler QR Code, Gerar QR Code, Imagem em Texto, Remover Fundo, Juntar PDFs.
Comunicação: Enviar Email, Enviar SMS.
Produtividade: Notas, Lista de Compras, Lembrete, Cronômetro, Converter Medidas.
Canais: WhatsApp Business API, Instagram Direct, Facebook Messenger, WebApp PWA, Totem físico.

═══ DASHBOARD ═══
Cada cliente tem: Assistentes, Funções, Vendas/Produtos, Usuários, Agenda Google, Meta (WhatsApp/Instagram/Facebook), Respostas Rápidas, Arquivos, Créditos/Recebimentos, Indicações (50% comissão), Histórico.

═══ TECNOLOGIA ═══
Next.js, React, TypeScript, Tailwind, Supabase, OpenAI GPT-4o, Google Speech/TTS, Vercel, LGPD.

═══ REGRAS ═══
1. NUNCA invente funções que não existem.
2. Para preço Smart: enfatize pay-per-use sem mensalidade e os 20 créditos gratuitos.
3. Para preço Vendas: é GRATUITO, minhAi só ganha quando o lojista vende.
4. O usuário já está logado — não precisa convencer a criar conta, mas incentive a explorar.
5. Respostas curtas — máximo 3 frases. Este é um widget de chat no dashboard.`

// ── Handler principal ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { message, assistantId, assistantName } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    const msg = message.trim()

    // ── Passo 1: Groq classifica — comando MCP ou pergunta geral ────────────
    const contextNote = assistantName
      ? `\nAssistente ativo no dashboard: "${assistantName}"`
      : ''

    const classification = await groq.chat.completions.create({
      model:       'llama-3.1-8b-instant',
      max_tokens:  128,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Você classifica mensagens de um widget de chat no dashboard do minhAi.
${contextNote}

## Funções MCP disponíveis (label | key | quando usar):
${WIDGET_FUNCTIONS_CONTEXT}

## COMO RESPONDER — escolha UMA:

### Opção A — comando MCP (ação concreta):
O usuário quer EXECUTAR uma das funções acima.
Retorne SOMENTE JSON: {"type": "mcp", "key": "key_da_funcao", "response": "frase curta confirmando"}

### Opção B — pergunta/conversa geral:
O usuário está perguntando sobre a minhAi, planos, funcionalidades, como usar, ou conversando.
Retorne SOMENTE: null

## REGRAS:
- Se for pergunta sobre "o que é", "como funciona", "quanto custa", "quais funções" → null
- Se for ação explícita como "pix de 50", "ver produtos", "cep 01310100" → JSON com type mcp
- Na dúvida → null`,
        },
        {
          role: 'user',
          content: msg,
        },
      ],
    })

    const raw = classification.choices[0]?.message?.content?.trim() ?? ''

    // ── Passo 2A: é comando MCP → mcp-whatsapp-handler ─────────────────────
    let mcpKey: string | null = null
    if (raw && raw !== 'null' && raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
        if (parsed?.type === 'mcp') {
          mcpKey = parsed.key ?? null
        }
      } catch {
        // não era JSON válido — tratar como pergunta geral
      }
    }

    if (mcpKey) {
      // Resolver company_id: prioridade → assistantId do widget → perfil → primeira Smart
      let companyId: string | null = assistantId ?? null

      if (!companyId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('mcp_whatsapp_company_id')
          .eq('user_id', user.id)
          .maybeSingle()
        companyId = profile?.mcp_whatsapp_company_id ?? null
      }

      if (!companyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .eq('assistant_type', 'smart')
          .order('created_at')
          .limit(1)
          .maybeSingle()
        companyId = company?.id ?? null
      }

      if (!companyId) {
        return NextResponse.json({
          reply: '⚠️ Configure um assistente Smart em *Integrações IA → WhatsApp MCP* para usar os comandos do widget.',
        })
      }

      const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

      const handlerRes = await fetch(`${SUPABASE_URL}/functions/v1/mcp-whatsapp-handler`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:            'dashboard',
          message_text:    msg,
          phone_number_id: 'dashboard',
          company_id:      companyId,
          user_id:         user.id,
          access_token:    '',
          dashboard_mode:  true,
        }),
      })

      if (!handlerRes.ok) {
        console.error('mcp-whatsapp-handler error:', await handlerRes.text())
        return NextResponse.json({ reply: '❌ Erro ao processar o comando. Tente novamente.' })
      }

      const result = await handlerRes.json()
      return NextResponse.json({ reply: result.reply ?? result.message ?? '✅ Concluído.' })
    }

    // ── Passo 2B: pergunta geral → Groq responde como minhAi ───────────────
    const answer = await groq.chat.completions.create({
      model:       'llama-3.1-8b-instant',
      max_tokens:  512,
      temperature: 0.4,
      messages: [
        {
          role:    'system',
          content: MINHAI_SYSTEM_PROMPT + (assistantName ? `\n\nAssistente ativo: "${assistantName}"` : ''),
        },
        {
          role:    'user',
          content: msg,
        },
      ],
    })

    const aiText = answer.choices[0]?.message?.content?.trim()
    return NextResponse.json({
      reply: aiText || '🤖 Não consegui gerar uma resposta. Tente novamente.',
    })

  } catch (e: any) {
    console.error('dashboard mcp route error:', e.message)
    return NextResponse.json({ reply: '❌ Erro interno.' })
  }
}