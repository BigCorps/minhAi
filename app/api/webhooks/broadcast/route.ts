import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendOneSignalPush } from '@/lib/onesignal';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-api-key');
  if (authHeader !== process.env.PUSH_SECRET_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const payload = await req.json();
  const { record, old_record } = payload;

  // Optional chaining: old_record pode ser undefined em inserções novas
  if (record.enviar === true && old_record?.enviar === false) {
    try {
      await sendOneSignalPush({
        title: record.titulo,
        message: record.mensagem,
        url: record.url,
        broadcast: true
      });

      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from('push_broadcasts')
        .update({ enviado_em: new Date().toISOString() })
        .eq('id', record.id);
    } catch (error: any) {
      console.error("Erro no envio do broadcast:", error);
      return NextResponse.json({ error: 'Falha ao enviar broadcast' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
