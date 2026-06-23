// app/api/demo/[token]/route.ts
//
// GET: usado pelo frontend em /lead/[token] (Passo 1+) para recuperar
// o estado da sessão (ramo, produto, preço, nome do negócio, nome do
// lead já capturado, objetivo_cumprido, etc.) sem expor a tabela
// demo_sessions diretamente ao client (RLS sem policies bloquearia
// isso de qualquer forma — esta rota é o único caminho de leitura).
//
// Não retorna campos sensíveis de vínculo de conta (linked_user_id)
// nem o ip_address — só o que a UI da demo precisa para renderizar.

import { NextRequest, NextResponse } from 'next/server';
import { getDemoSessionByToken } from '@/lib/demo-token';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Next 15+: params é Promise — aguardar antes de usar (regra do README)
  const { token } = await params;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
  }

  const session = await getDemoSessionByToken(token);

  if (!session) {
    // Não diferencia "não existe" de "expirou" na resposta — ambos
    // resultam na mesma ação no frontend (mostrar tela de sessão
    // expirada/inválida, sem recuperação estendida, conforme decisão
    // travada no relatório original: TTL 24h, sessão nova se expirar).
    return NextResponse.json(
      { error: 'Sessão de demonstração não encontrada ou expirada.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    token: session.token,
    ramo: session.ramo,
    nomeNegocio: session.nome_negocio,
    produto: session.produto,
    preco: session.preco,
    nomeLead: session.nome_lead,
    status: session.status,
    canalAtual: session.canal_atual,
    objetivoCumprido: session.objetivo_cumprido,
    context: session.context,
    temEmail: !!session.email,
    temPhone: !!session.phone,
    expiresAt: session.expires_at,
  });
}