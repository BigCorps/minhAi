import { NextResponse, type NextRequest } from 'next/server';
import { exigirEventoDoUsuario, texto } from '@/lib/conviteria/gestao-servidor';
import {
  enviarComprovanteRodada,
  salvarTelefoneComprovante,
} from '@/lib/conviteria/whatsapp-comprovante-servidor';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as any;
  const eventoId = texto(body?.eventoId, 80);
  const acao = texto(body?.acao, 40);
  if (!eventoId || !acao) {
    return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 });
  }

  const acesso = await exigirEventoDoUsuario(req, eventoId);
  if ('erro' in acesso) {
    return NextResponse.json({ erro: acesso.erro }, { status: acesso.status });
  }

  if (acao === 'salvar_telefone') {
    try {
      const telefone = await salvarTelefoneComprovante(eventoId, body?.telefone);
      return NextResponse.json({ ok: true, telefone });
    } catch (error: any) {
      return NextResponse.json({ erro: String(error?.message ?? error) }, { status: 400 });
    }
  }

  if (acao === 'enviar') {
    const rodada = Number(body?.rodada);
    if (rodada !== 1 && rodada !== 2) {
      return NextResponse.json({ erro: 'Rodada inválida.' }, { status: 400 });
    }
    try {
      const resultado = await enviarComprovanteRodada(eventoId, rodada as 1 | 2);
      return NextResponse.json({ ok: true, ...resultado });
    } catch (error: any) {
      return NextResponse.json({ erro: String(error?.message ?? error) }, { status: 400 });
    }
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
}
