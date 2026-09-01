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

  // Log para confirmar o que está chegando
  console.log("📦 Broadcast payload recebido:", JSON.stringify({ 
    enviar: record?.enviar, 
    tipo_enviar: typeof record?.enviar,
    old_enviar: old_record?.enviar,
    tipo_old: typeof old_record?.enviar
  }));

  // Aceita tanto boolean true quanto string "true"
  const isEnviar = record?.enviar === true || record?.enviar === 'true';
  const wasEnviar = old_record?.enviar === false || old_record?.enviar === 'false' || old_record?.enviar == null;

  if (isEnviar && wasEnviar) {
    try {
      console.log("📤 Enviando broadcast:", record.titulo);
      
      await sendOneSignalPush({
        title: record.titulo,
        message: record.mensagem,
        url: record.url,
        broadcast: true
      });

      console.log("✅ Broadcast enviado com sucesso");

      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from('push_broadcasts')
        .update({ enviado_em: new Date().toISOString() })
        .eq('id', record.id);

    } catch (error: any) {
      console.error("❌ Erro no envio do broadcast:", error);
      return NextResponse.json({ error: 'Falha ao enviar broadcast' }, { status: 500 });
    }
  } else {
    console.log("⏭️ Condição não atendida, ignorando:", { isEnviar, wasEnviar });
  }

  return NextResponse.json({ success: true });
}
