import { NextResponse, type NextRequest } from 'next/server';
import { gerarMonograma } from '@/lib/conviteria/lacre';

// opentype.js le arquivo do disco: precisa de Node, nao de edge runtime.
export const runtime = 'nodejs';

const limite = new Map<string, { n: number; ate: number }>();

function passouNoLimite(ip: string) {
  const agora = Date.now();
  const e = limite.get(ip);
  if (!e || agora > e.ate) {
    limite.set(ip, { n: 1, ate: agora + 60_000 });
    return true;
  }
  if (e.n >= 60) return false;
  e.n++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  if (!passouNoLimite(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  const iniciais = new URL(req.url).searchParams.get('iniciais') ?? '';
  if (!iniciais || iniciais.length > 6) {
    return NextResponse.json({ erro: 'Iniciais inválidas' }, { status: 400 });
  }

  try {
    const m = gerarMonograma(iniciais);
    if (!m.d) return NextResponse.json({ erro: 'Não foi possível gerar' }, { status: 422 });

    // Imutavel: o mesmo par de iniciais sempre gera o mesmo contorno.
    return NextResponse.json(m, {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return NextResponse.json({ erro: 'Falha ao gerar monograma' }, { status: 500 });
  }
}
