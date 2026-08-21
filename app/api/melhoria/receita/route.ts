// app/api/melhoria/receita/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Leitura de receita por foto.
//
// ⚠️ ESTA É A ROTA MAIS PERIGOSA DO APLICATIVO INTEIRO.
//
// Se o OCR ler "0,25mg" como "25mg" e o lembrete for criado sozinho, isso é
// uma overdose programada — cem vezes a dose, todos os dias, avisada por push.
//
// Por isso ela NÃO cria medicamento nem dose. Ela só devolve uma PROPOSTA, que
// precisa passar pela tela de conferência. Quem grava é o cliente, depois que
// um adulto confirmou item por item, com a foto original ao lado.
//
// Além da segurança do usuário, isto é o que mantém o produto fora da
// classificação de dispositivo médico (ANVISA RDC 657/2022) e fora do
// escrutínio alto da Play Store: transcrever o que está escrito é OCR;
// sugerir, ajustar ou calcular dose é apoio à decisão clínica.
//
// Regras que NÃO podem ser afrouxadas:
//   · a IA nunca completa o que não conseguiu ler — devolve vazio e diz
//   · a IA nunca sugere dose, horário ou substituição
//   · medicamento gravado com origem='receita_ia' nasce revisado=false, e a
//     materialização de doses ignora não revisados (m.revisado no SQL)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const CUSTO = 3;   // OCR + extração estruturada + responsabilidade

const INSTRUCAO = `Você transcreve receitas médicas brasileiras. Você NÃO é médico e NÃO dá orientação.

REGRAS OBRIGATÓRIAS:
- Transcreva APENAS o que está escrito. Nunca complete, deduza ou corrija.
- Se não conseguir ler um campo com certeza, use null e marque confianca "baixa".
- NUNCA sugira dose, horário, medicamento alternativo ou tratamento.
- NUNCA converta unidades nem faça cálculo de dose.
- Se a imagem não for uma receita ou estiver ilegível, devolva legivel: false
  com medicamentos: [].
- Na dúvida entre dois valores de dosagem, use null e confianca "baixa". É
  melhor não saber do que errar.`;

// json_schema com strict: true — mesmo padrão do app/api/conviteria/briefing
// e do app/api/conviteria/sugerir. Aqui vale ainda mais que lá: o modelo fica
// impedido de inventar campo, então "dose sugerida" não tem onde caber na
// resposta, nem que ele queira.
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['legivel', 'medicamentos', 'observacao'],
  properties: {
    legivel: { type: 'boolean' },
    observacao: { type: ['string', 'null'] },
    medicamentos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'dosagem', 'forma', 'frequencia_texto', 'duracao_dias', 'confianca'],
        properties: {
          nome: { type: 'string' },
          dosagem: { type: ['string', 'null'] },
          forma: { type: ['string', 'null'] },
          frequencia_texto: { type: ['string', 'null'] },
          duracao_dias: { type: ['integer', 'null'] },
          confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
      },
    },
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const { imagemBase64 } = (await req.json()) as { imagemBase64?: string };
    if (!imagemBase64) {
      return NextResponse.json({ erro: 'imagem obrigatória' }, { status: 400 });
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
      .from('perfis').select('id, consentiu_saude_em')
      .eq('company_id', companyId).limit(1);
    const perfil = perfis?.[0];
    if (!perfil) return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });

    // Receita é dado sensível do art. 11. Sem consentimento registrado, nem
    // começa — e a checagem é no servidor, não só na interface.
    if (!perfil.consentiu_saude_em) {
      return NextResponse.json(
        { erro: 'sem_consentimento', mensagem: 'Precisamos da sua autorização para guardar informações de saúde.' },
        { status: 403 },
      );
    }

    // ── Cobrança fail-closed, antes do modelo ─────────────────────────────
    const { data: cobranca } = await admin.rpc('cobrar_credito_se_suficiente', {
      p_company_id: companyId,
      p_function_key: 'identificar_fraude',   // função de visão já cadastrada
      p_credits: CUSTO,
      p_metadata: { marca: 'melhoria', tipo: 'receita' },
    });

    const cob = Array.isArray(cobranca) ? cobranca[0] : cobranca;
    if (!cob?.sucesso) {
      return NextResponse.json(
        {
          erro: 'sem_creditos',
          mensagem: 'Seus usos acabaram. Você pode cadastrar o remédio digitando, que é sempre grátis.',
          necessario: CUSTO,
        },
        { status: 402 },
      );
    }

    const estornar = async () => {
      await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'identificar_fraude',
        p_credits: -CUSTO,
        p_metadata: { marca: 'melhoria', tipo: 'receita', estorno: true },
      });
    };

    // ── Leitura ───────────────────────────────────────────────────────────
    // Mesmo formato do handleCapture do IdentificarFraudeDisplay: base64 puro,
    // sem o prefixo data:.
    const limpa = imagemBase64.includes(',')
      ? imagemBase64.split(',')[1]
      : imagemBase64;

    let proposta: any;

    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          // temperatura 0: transcrever não é tarefa criativa. Variação aqui é
          // um número de dosagem mudando.
          temperature: 0,
          max_tokens: 1500,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'melhoria_receita', strict: true, schema: ESQUEMA },
          },
          messages: [
            { role: 'system', content: INSTRUCAO },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Transcreva esta receita seguindo exatamente as regras.' },
                {
                  type: 'image_url',
                  // detail 'high' importa: letra de médico em 'low' vira ruído.
                  image_url: { url: `data:image/jpeg;base64,${limpa}`, detail: 'high' },
                },
              ],
            },
          ],
        }),
      });

      if (!r.ok) throw new Error(`modelo ${r.status}`);

      const resposta = await r.json();
      const texto = (resposta?.choices?.[0]?.message?.content ?? '')
        .replace(/```json|```/g, '')
        .trim();

      proposta = JSON.parse(texto);
    } catch (e) {
      console.error('leitura de receita:', e);
      await estornar();
      return NextResponse.json(
        { erro: 'leitura_falhou', mensagem: 'Não consegui ler a receita. Tente uma foto com mais luz, ou cadastre digitando. Seus usos foram devolvidos.' },
        { status: 502 },
      );
    }

    if (!proposta?.legivel || !Array.isArray(proposta.medicamentos) || proposta.medicamentos.length === 0) {
      await estornar();
      return NextResponse.json({
        erro: 'ilegivel',
        mensagem: 'Não consegui identificar os remédios nesta foto. Tente de novo com mais luz e a receita bem aberta, ou cadastre digitando. Seus usos foram devolvidos.',
      }, { status: 422 });
    }

    // ── Guarda o documento para a conferência lado a lado ──────────────────
    const caminho = `${perfil.id}/${Date.now()}-receita.jpg`;
    let documentoId: string | null = null;

    try {
      const bytes = Buffer.from(limpa, 'base64');
      const { error: erroUpload } = await admin.storage
        .from('melhoria-documentos')     // bucket PRIVADO
        .upload(caminho, bytes, { contentType: 'image/jpeg', upsert: false });

      if (!erroUpload) {
        const { data: doc } = await mel.from('documentos').insert({
          perfil_id: perfil.id,
          tipo: 'receita',
          storage_path: caminho,
          ocr_json: proposta,
          revisado: false,
        }).select('id').single();
        documentoId = doc?.id ?? null;
      }
    } catch (e) {
      // Falhar o upload não invalida a leitura — a proposta ainda serve.
      console.error('upload da receita:', e);
    }

    // ── Devolve PROPOSTA, não cadastro ────────────────────────────────────
    return NextResponse.json({
      documentoId,
      // O cliente NUNCA deve gravar isto direto. A tela de conferência é
      // obrigatória, e é ela que chama o insert com revisado: true.
      proposta: proposta.medicamentos.map((m: any) => ({
        nome: m.nome ?? '',
        dosagem: m.dosagem ?? '',
        forma: m.forma ?? 'comprimido',
        frequencia_texto: m.frequencia_texto ?? '',
        duracao_dias: m.duracao_dias ?? null,
        confianca: m.confianca ?? 'baixa',
      })),
      observacao: proposta.observacao ?? null,
      // Sem horários. A IA não decide quando a pessoa toma remédio: ela lê
      // "de 12 em 12 horas" e quem escolhe 8h e 20h é a pessoa, na tela.
      avisoObrigatorio:
        'Confira cada remédio e cada dose com a receita na mão antes de confirmar. A leitura por foto pode errar.',
      saldoRestante: cob.saldo_novo,
    });
  } catch (e) {
    console.error('/api/melhoria/receita:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
