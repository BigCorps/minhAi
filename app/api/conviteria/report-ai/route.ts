import { NextResponse, type NextRequest } from 'next/server';
import { adminPublic, ipDaRequisicao } from '@/lib/conviteria/servidor';

export const runtime = 'nodejs';

const ALLOWED_REASONS = new Set([
  'ofensivo',
  'incorreto',
  'inapropriado',
  'spam',
  'outro',
]);

// Denúncia precisa funcionar também antes do login, porque a IA do ConviteIA
// pode ser usada no briefing e no wizard anônimo. O rate limit evita abuso sem
// exigir autenticação e sem armazenar IP do usuário.
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function allowed(ip: string) {
  const now = Date.now();
  const current = rateLimit.get(ip);

  if (!current || now > current.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }

  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = ipDaRequisicao(req);
  if (!allowed(ip)) {
    return NextResponse.json(
      { erro: 'Muitas denúncias em pouco tempo. Tente novamente mais tarde.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const reason = String(body?.reason ?? '').trim();
  const messageId = String(body?.messageId ?? '').trim().slice(0, 250);
  const messageText = String(body?.messageText ?? '').trim().slice(0, 8000);

  if (!ALLOWED_REASONS.has(reason) || !messageId || !messageText) {
    return NextResponse.json({ erro: 'Denúncia inválida.' }, { status: 400 });
  }

  const admin = adminPublic();
  let userId: string | null = null;

  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) {
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
  }

  const { error } = await admin.from('ai_content_reports').insert({
    user_id: userId,
    company_id: null,
    message_id: messageId,
    message_text: messageText,
    reason,
    source: 'conviteia',
    details: 'Submitted from the ConviteIA in-product AI content reporting mechanism.',
  });

  if (error) {
    console.error('ConviteIA AI report:', error);
    return NextResponse.json(
      { erro: 'Não foi possível registrar a denúncia agora.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
