// app/api/demo/create/route.ts
//
// Passo 0 do funil /lead: recebe ramo + nome do negócio + produto + preço,
// cria a demo_session e devolve o token para o frontend montar as URLs
// seguintes (/lead/[token], /cadastro?demo=[token], wa.me?text=...[token]).
//
// Segue a regra do README: req.text() + JSON.parse() em vez de req.json()
// é exigida em Edge Functions Supabase — aqui é Route Handler Next.js,
// onde request.json() é o padrão correto e seguro (Next não tem essa
// limitação). Mantemos request.json() de propósito.

import { NextRequest, NextResponse } from 'next/server';
import { createDemoSession } from '@/lib/demo-token';

export const runtime = 'nodejs';

// Espelha exatamente os segment_key de public.assistant_segments
// (verificado no banco — não inventar valores novos aqui, ou o
// Passo 4 de pré-população do Auxiliar de Criação perde o casamento
// direto com o segmento real da conta).
const RAMOS_VALIDOS = [
  'restaurante',
  'clinica',
  'loja',
  'servicos',
  'academia',
  'educacao',
  'outro',
] as const;

type Ramo = (typeof RAMOS_VALIDOS)[number];

// Mapeamento confirmado com o usuário:
// - restaurante, loja, educacao, outro → Vendas
// - clinica, servicos, academia → Agenda
function getAuxiliarPorRamo(ramo: Ramo): 'vendas' | 'agenda' {
  const ramosAgenda: Ramo[] = ['clinica', 'servicos', 'academia'];
  return ramosAgenda.includes(ramo) ? 'agenda' : 'vendas';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ramo,
      nomeNegocio,
      produto,
      preco,
      utmSource,
      utmMedium,
      utmCampaign,
      origemSimples,
    } = body;

    // ── Validação mínima, mas real ──────────────────────────
    if (!ramo || typeof ramo !== 'string' || !RAMOS_VALIDOS.includes(ramo as Ramo)) {
      return NextResponse.json(
        { error: `Ramo inválido. Use um de: ${RAMOS_VALIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!nomeNegocio || typeof nomeNegocio !== 'string' || nomeNegocio.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nome do negócio é obrigatório (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    if (!produto || typeof produto !== 'string' || produto.trim().length < 2) {
      return NextResponse.json(
        { error: 'Produto ou serviço principal é obrigatório.' },
        { status: 400 }
      );
    }

    const precoNumerico = Number(preco);
    if (!Number.isFinite(precoNumerico) || precoNumerico < 0) {
      return NextResponse.json(
        { error: 'Preço inválido.' },
        { status: 400 }
      );
    }

    // ── IP para rate limit (item 6, camada transversal) ─────
    // Capturado aqui para já persistir na sessão; a aplicação do
    // limite em si (3 sessões/IP/dia) é implementada depois.
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

    const session = await createDemoSession({
      ramo,
      nomeNegocio: nomeNegocio.trim(),
      produto: produto.trim(),
      preco: precoNumerico,
      ipAddress,
      utmSource: typeof utmSource === 'string' ? utmSource.trim() || null : null,
      utmMedium: typeof utmMedium === 'string' ? utmMedium.trim() || null : null,
      utmCampaign: typeof utmCampaign === 'string' ? utmCampaign.trim() || null : null,
      origemSimples: typeof origemSimples === 'string' ? origemSimples.trim() || null : null,
    });

    return NextResponse.json({
      token: session.token,
      ramo: session.ramo,
      nomeNegocio: session.nome_negocio,
      produto: session.produto,
      preco: session.preco,
      auxiliar: getAuxiliarPorRamo(ramo as Ramo),
      expiresAt: session.expires_at,
    });
  } catch (error: any) {
    console.error('[api/demo/create] Erro:', error.message);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de demonstração.' },
      { status: 500 }
    );
  }
}