// app/api/melhoria/verificar/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Análise de fraude que USA IA e, portanto, CONSOME CRÉDITO.
//
// A validação de linha digitável NÃO passa por aqui: ela é aritmética pura,
// roda no navegador (lib/melhoria/boleto.ts) e é grátis e ilimitada.
// Aqui só entra o que precisa de modelo: imagem de boleto, comprovante e link.
//
// ── POR QUE A COBRANÇA ESTÁ NO SERVIDOR ─────────────────────────────────────
// Existem dois padrões de cobrança no repositório, e só um serve:
//
//   register_function_usage   — chamado do NAVEGADOR, fire-and-forget. Quando
//                               o saldo não dá, ele faz
//                                 IF v_new_credits < 0 THEN v_new_credits := 0
//                               e EXECUTA ASSIM MESMO. Não bloqueia nada.
//   cobrar_credito_se_suficiente — no servidor, trava a linha com FOR UPDATE,
//                               e é fail-closed: saldo insuficiente devolve
//                               sucesso = false SEM debitar.
//
// Aqui usamos exclusivamente o segundo. E cobramos ANTES de chamar o modelo:
// cobrar depois significa entregar o resultado de graça quando a chamada de
// cobrança falha.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

type TipoVerificacao = 'url' | 'boleto_imagem' | 'comprovante';

const CUSTO: Record<TipoVerificacao, number> = {
  url: 1,
  boleto_imagem: 2,
  comprovante: 2,
};

export async function POST(req: NextRequest) {
  try {
    const { tipo, entrada, imagemBase64 } = (await req.json()) as {
      tipo: TipoVerificacao;
      entrada?: string;
      imagemBase64?: string;
    };

    if (!tipo || !(tipo in CUSTO)) {
      return NextResponse.json({ erro: 'tipo inválido' }, { status: 400 });
    }

    // ── Sessão ────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const comoUsuario = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => { /* rota só de leitura de sessão */ },
        },
      },
    );

    const { data: sessao } = await comoUsuario.auth.getUser();
    if (!sessao?.user) {
      return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // company + perfil
    const { data: companies } = await admin
      .from('companies')
      .select('id')
      .eq('user_id', sessao.user.id)
      .eq('segment_key', 'melhoria')
      .limit(1);

    const companyId = companies?.[0]?.id;
    if (!companyId) {
      return NextResponse.json({ erro: 'conta não encontrada' }, { status: 404 });
    }

    const melhoria = admin.schema('melhoria');
    const { data: perfis } = await melhoria
      .from('perfis')
      .select('id')
      .eq('company_id', companyId)
      .limit(1);

    const perfilId = perfis?.[0]?.id;
    if (!perfilId) {
      return NextResponse.json({ erro: 'perfil não encontrado' }, { status: 404 });
    }

    // ── Cobrança ANTES da análise, fail-closed ────────────────────────────
    const custo = CUSTO[tipo];
    const { data: cobranca, error: erroCobranca } = await admin.rpc(
      'cobrar_credito_se_suficiente',
      {
        p_company_id: companyId,
        p_function_key: 'identificar_fraude',
        p_credits: custo,
        p_metadata: { marca: 'melhoria', tipo },
      },
    );

    if (erroCobranca) {
      console.error('cobrança:', erroCobranca);
      return NextResponse.json({ erro: 'falha ao processar' }, { status: 500 });
    }

    const resultado = Array.isArray(cobranca) ? cobranca[0] : cobranca;

    if (!resultado?.sucesso) {
      // Mensagem em português claro. Nunca "insufficient credits".
      return NextResponse.json(
        {
          erro: 'sem_creditos',
          mensagem:
            'Seus usos acabaram. Você ainda pode conferir boletos digitando os números — isso é sempre grátis.',
          saldo: resultado?.saldo_anterior ?? 0,
          necessario: custo,
        },
        { status: 402 },
      );
    }

    // ── Análise ───────────────────────────────────────────────────────────
    // Reaproveita a edge function camera-process, EXATAMENTE como o
    // IdentificarFraudeDisplay da minhAi a chama em produção:
    //
    //   imagem  → { action: 'fraude',     image: <base64 sem prefixo> }
    //   link    → { action: 'fraude_url', url: <url normalizada> }
    //   boleto  → { action: 'fraude_boleto_linha', linha: <só dígitos> }
    //
    // ⚠️ A action de imagem é 'fraude', NÃO 'fraude_imagem'. Conferido no
    // handleCapture do IdentificarFraudeDisplay — inventar um nome de action
    // faz a edge devolver erro genérico e o crédito já teria sido cobrado.
    const acao = tipo === 'url' ? 'fraude_url' : 'fraude';

    // O camera-process espera base64 puro. O modal faz exatamente isto:
    //   const clean = base64.includes(',') ? base64.split(',')[1] : base64;
    const imagemLimpa = imagemBase64?.includes(',')
      ? imagemBase64.split(',')[1]
      : imagemBase64;

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/camera-process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: acao,
          url: tipo === 'url' ? entrada : undefined,
          image: imagemLimpa,
          company_id: companyId,
        }),
      },
    );

    if (!resposta.ok) {
      // A cobrança já saiu. Devolver o crédito é o certo: a pessoa não
      // recebeu nada. Registramos como estorno para não sumir do extrato.
      await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'identificar_fraude',
        p_credits: -custo,
        p_metadata: { marca: 'melhoria', tipo, estorno: true },
      });

      return NextResponse.json(
        { erro: 'analise_falhou', mensagem: 'Não consegui analisar agora. Tente de novo em instantes. Seus usos foram devolvidos.' },
        { status: 502 },
      );
    }

    const bruto = await resposta.json();

    // A edge devolve { success, fraude: {...}, speech_text }. O modal da
    // minhAi lê res.fraude — e checa res.success mesmo com HTTP 200.
    if (!bruto?.success) {
      await admin.rpc('cobrar_credito_se_suficiente', {
        p_company_id: companyId,
        p_function_key: 'identificar_fraude',
        p_credits: -custo,
        p_metadata: { marca: 'melhoria', tipo, estorno: true },
      });
      return NextResponse.json(
        { erro: 'analise_falhou', mensagem: 'Não consegui analisar agora. Seus usos foram devolvidos.' },
        { status: 502 },
      );
    }

    const analise = bruto.fraude ?? {};

    // ── Normaliza o veredito ──────────────────────────────────────────────
    // Três estados, e o melhor deles é "não encontramos indícios". NUNCA
    // "é seguro" nem "pode pagar": falso negativo que leva alguém a pagar
    // boleto falso de R$ 3.000 é dano concreto.
    const score = Number(analise?.score ?? analise?.risco ?? 0);
    const veredito =
      score >= 70 ? 'alto_risco' : score >= 30 ? 'atencao' : 'sem_indicios';

    const motivos: string[] = Array.isArray(analise?.motivos)
      ? analise.motivos
      : analise?.resumo
        ? [String(analise.resumo)]
        : [];

    await melhoria.from('verificacoes').insert({
      perfil_id: perfilId,
      tipo,
      entrada: tipo === 'url' ? entrada?.slice(0, 500) : '[imagem]',
      veredito,
      score,
      motivos,
      creditos_gastos: custo,
    });

    return NextResponse.json({
      veredito,
      score,
      motivos,
      orientacao:
        veredito === 'sem_indicios'
          ? 'Não encontramos indícios de fraude. Mesmo assim, se você não estava esperando isto, confirme por telefone com quem enviou.'
          : veredito === 'atencao'
            ? 'Encontramos coisas estranhas. Confirme por telefone com quem enviou antes de pagar ou clicar.'
            : 'Não pague e não clique. Isto tem sinais claros de golpe. Fale com alguém de confiança.',
      saldoRestante: resultado.saldo_novo,
    });
  } catch (e) {
    console.error('/api/melhoria/verificar:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
