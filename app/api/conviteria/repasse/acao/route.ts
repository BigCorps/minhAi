import { NextResponse, type NextRequest } from 'next/server';
import { adminConviteria } from '@/lib/conviteria/servidor';
import { hashTokenRepasse, emailRepasseConcluido, emailRepasseFalhou } from '@/lib/conviteria/repasse-email';

export const runtime = 'nodejs';

function pagina(titulo: string, mensagem: string, ok = true) {
  return new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${titulo}</title></head>
  <body style="font-family:Arial,sans-serif;background:#fff7fa;color:#40232c;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px">
  <main style="max-width:560px;background:white;border:1px solid #edd4dc;border-radius:20px;padding:32px;text-align:center">
  <h1 style="color:${ok ? '#198754' : '#b42318'}">${titulo}</h1><p>${mensagem}</p><p style="font-size:12px;color:#777">ConviteIA</p></main></body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const token = u.searchParams.get('token')?.trim();
  const acao = u.searchParams.get('acao')?.trim();

  if (!token || !['confirmar','falhar'].includes(acao || '')) {
    return pagina('Link inválido', 'Este link de operação não é válido.', false);
  }

  const admin = adminConviteria();
  const { data, error } = await admin.rpc('processar_acao_repasse', {
    p_token_hash: hashTokenRepasse(token),
    p_acao: acao,
  });

  if (error) {
    const m = error.message || '';
    if (m.includes('token_usado') || m.includes('repasse_finalizado'))
      return pagina('Ação já registrada', 'Este repasse já foi processado. Nenhuma nova alteração foi feita.');
    if (m.includes('token_expirado'))
      return pagina('Link expirado', 'O link de confirmação expirou. Consulte a solicitação antes de realizar qualquer ação.', false);
    return pagina('Não foi possível processar', 'A ação não foi aplicada. Nenhuma alteração financeira adicional foi realizada.', false);
  }

  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return pagina('Não foi possível processar', 'Repasse não encontrado.', false);

  if (item.conta_email) {
    try {
      if (acao === 'confirmar') {
        await emailRepasseConcluido({
          para: item.conta_email,
          nome: item.conta_nome || 'Olá',
          valorCentavos: Number(item.valor_centavos),
          concluidoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        });
      } else {
        await emailRepasseFalhou({
          para: item.conta_email,
          nome: item.conta_nome || 'Olá',
          valorCentavos: Number(item.valor_centavos),
        });
      }
    } catch (e) {
      console.error('Falha ao enviar confirmação de repasse ao cliente:', e);
    }
  }

  return acao === 'confirmar'
    ? pagina('Repasse confirmado', 'O repasse foi marcado como concluído, o histórico financeiro foi atualizado e o cliente foi notificado por e-mail.')
    : pagina('Repasse não realizado', 'O repasse foi marcado como falhou e o valor foi devolvido ao saldo disponível do convite.');
}
