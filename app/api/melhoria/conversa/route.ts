// app/api/melhoria/conversa/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Conversa com a IA. 1 crédito por resposta.
//
// ── O RISCO DESTA ROTA ──────────────────────────────────────────────────────
// Um chat aberto, num aplicativo de saúde, usado por alguém de 78 anos, é o
// lugar mais provável do produto inteiro para aparecer a pergunta
// "posso tomar meio comprimido?" ou "esse remédio pode com aquele?".
//
// Responder isso seria: (a) perigoso, (b) reclassificar o produto como apoio
// à decisão clínica — RDC 657/2022 da ANVISA — e (c) contradizer a declaração
// de saúde da Play Store, onde respondemos "não" para diagnóstico e
// recomendação de tratamento.
//
// Por isso a instrução não pede "seja cuidadoso": ela lista o que a IA NÃO
// responde e diz exatamente o que dizer no lugar. Uma recusa vaga ("consulte
// um médico") deixa a pessoa sem saída; a recusa aqui sempre aponta um caminho
// concreto — ligar para o médico, falar com o farmacêutico, chamar um
// familiar.
//
// A IA também não inventa dados do usuário. Ela recebe a lista de remédios e
// compromissos como CONTEXTO e pode ler de volta o que está lá — mas não pode
// alterar nada, e não tem ferramenta nenhuma.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const CUSTO = 1;
const MAX_HISTORICO = 12;   // 6 idas e voltas: suficiente e barato em tokens

const INSTRUCAO = `Você é a MelhorIA, assistente de um aplicativo brasileiro para pessoas idosas.

COMO FALAR
- Português do Brasil, simples e direto. Frases curtas.
- Nunca use termo técnico sem explicar. Nada de jargão de informática.
- Responda em no máximo 4 frases, a não ser que peçam mais detalhe.
- Trate a pessoa com respeito, sem infantilizar. Ela é adulta.

O QUE VOCÊ FAZ
- Explica como usar o aplicativo (cadastrar remédio, marcar consulta, conferir boleto, avisar a família).
- Lê de volta as informações que a pessoa já cadastrou, quando pedirem.
- Ajuda a organizar: "que horas eu tomo o losartana?", "quando é minha consulta?".
- Conversa sobre assuntos gerais do dia a dia, com naturalidade.

O QUE VOCÊ NUNCA FAZ — sem exceção, nem se insistirem
- Não indica, sugere, ajusta, calcula nem confirma dose de medicamento.
- Não diz para que serve um remédio, nem qual usar para um sintoma.
- Não avalia se um remédio pode ser tomado junto com outro.
- Não interpreta resultado de exame, sintoma ou diagnóstico.
- Não diz se é seguro parar, começar ou trocar um tratamento.
- Não afirma que um boleto ou link é seguro.

COMO RECUSAR
Recuse em uma frase e ofereça um caminho concreto. Nunca só "procure um médico".
Exemplos do tom certo:
- "Essa é uma pergunta para o seu médico. Quer que eu mostre a data da sua próxima consulta?"
- "Não posso responder sobre dose, mas o farmacêutico da sua drogaria pode, e é de graça."
- "Isso quem sabe é quem receitou. Se quiser, eu mostro o telefone que você cadastrou."

EMERGÊNCIA
Se a pessoa descrever dor no peito, falta de ar, desmaio, sangramento, confusão
súbita, fraqueza de um lado do corpo ou disser que corre risco: interrompa tudo
e oriente a ligar 192 (SAMU) agora. Não faça perguntas de triagem, não avalie
gravidade, não tranquilize.

Se a pessoa demonstrar sofrimento emocional grave ou falar em não querer mais
viver, acolha com calma, sem julgar, e informe o CVV: 188, ligação gratuita,
24 horas. Sugira também falar com alguém de confiança.`;

interface Mensagem { autor: 'pessoa' | 'ia'; texto: string; }

export async function POST(req: NextRequest) {
  try {
    const { mensagem, historico } = (await req.json()) as {
      mensagem?: string;
      historico?: Mensagem[];
    };

    if (!mensagem?.trim()) {
      return NextResponse.json({ erro: 'mensagem vazia' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const comoUsuario = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    );

    const { data: sessao } = await comoUsuario.auth.getUser();
    if (!sessao?.user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const mel = admin.schema('melhoria');

    const { data: companies } = await admin
      .from('companies').select('id')
      .eq('user_id', sessao.user.id).eq('segment_key', 'melhoria').limit(1);
    const companyId = companies?.[0]?.id;
    if (!companyId) return NextResponse.json({ erro: 'conta não encontrada' }, { status: 404 });

    const { data: perfis } = await mel
      .from('perfis').select('id, nome, timezone').eq('company_id', companyId).limit(1);
    const perfil = perfis?.[0];
    if (!perfil) return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });

    // ── Cobrança fail-closed, ANTES do modelo ─────────────────────────────
    const { data: cobranca } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: 'chatgpt',
      p_credits: CUSTO,
      p_metadata: { marca: 'melhoria', tipo: 'conversa' },
    });

    const cob = Array.isArray(cobranca) ? cobranca[0] : cobranca;
    if (!cob?.sucesso) {
      return NextResponse.json({
        erro: 'sem_creditos',
        mensagem: 'Seus créditos acabaram. Conversar comigo usa 1 crédito por resposta — mas os lembretes, a agenda e a conferência de boleto continuam funcionando de graça.',
      }, { status: 402 });
    }

    const estornar = async () => {
      await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'chatgpt',
        p_credits: -CUSTO,
        p_metadata: { marca: 'melhoria', tipo: 'conversa', estorno: true },
      });
    };

    // ── Contexto: o que a pessoa já cadastrou ─────────────────────────────
    // Só leitura, e só o essencial. Mandar o histórico inteiro de doses
    // encheria o contexto sem melhorar resposta nenhuma.
    const [{ data: meds }, { data: agenda }] = await Promise.all([
      mel.from('medicamentos')
         .select('nome, dosagem, doses ( horario, dias_semana, ativo )')
         .eq('perfil_id', perfil.id).eq('ativo', true).limit(20),
      mel.from('agendamentos')
         .select('titulo, tipo, data_hora, local, profissional')
         .eq('perfil_id', perfil.id)
         .gte('data_hora', new Date().toISOString())
         .neq('status', 'cancelado')
         .order('data_hora', { ascending: true }).limit(5),
    ]);

    const listaMeds = (meds ?? []).map((m: any) => {
      const horas = (m.doses ?? [])
        .filter((d: any) => d.ativo)
        .map((d: any) => String(d.horario).slice(0, 5))
        .sort()
        .join(', ');
      return `- ${[m.nome, m.dosagem].filter(Boolean).join(' ')}${horas ? ` às ${horas}` : ''}`;
    }).join('\n') || '- (nenhum remédio cadastrado)';

    const fmt = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: perfil.timezone || 'America/Sao_Paulo',
    });

    const listaAgenda = (agenda ?? []).map((a: any) =>
      `- ${a.titulo} em ${fmt.format(new Date(a.data_hora))}${a.local ? ` (${a.local})` : ''}`
    ).join('\n') || '- (nenhum compromisso marcado)';

    const contexto = `DADOS QUE ESTA PESSOA JÁ CADASTROU (só leitura, não altere nada):

Nome: ${perfil.nome === 'Meu perfil' ? '(não informado)' : perfil.nome}

Remédios:
${listaMeds}

Próximos compromissos:
${listaAgenda}

Hoje é ${fmt.format(new Date())}.`;

    // ── Modelo ────────────────────────────────────────────────────────────
    const mensagens = [
      { role: 'system', content: INSTRUCAO },
      { role: 'system', content: contexto },
      ...(historico ?? []).slice(-MAX_HISTORICO).map((m) => ({
        role: m.autor === 'pessoa' ? 'user' : 'assistant',
        content: m.texto,
      })),
      { role: 'user', content: mensagem.trim() },
    ];

    let resposta: string;

    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          // Teto baixo de propósito: resposta longa cansa e esconde o que
          // importa. A instrução já pede no máximo 4 frases.
          max_tokens: 400,
          messages: mensagens,
        }),
      });

      if (!r.ok) throw new Error(`modelo ${r.status}`);
      const json = await r.json();
      resposta = json?.choices?.[0]?.message?.content?.trim() ?? '';
      if (!resposta) throw new Error('resposta vazia');
    } catch (e) {
      console.error('conversa:', e);
      await estornar();
      return NextResponse.json({
        erro: 'falhou',
        mensagem: 'Não consegui responder agora. Tente de novo em instantes — seu crédito foi devolvido.',
      }, { status: 502 });
    }

    return NextResponse.json({
      resposta,
      saldoRestante: cob.saldo_novo,
    });
  } catch (e) {
    console.error('/api/melhoria/conversa:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
