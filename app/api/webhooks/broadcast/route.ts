// app/api/webhooks/broadcast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Segurança do Webhook
  const authHeader = req.headers.get('x-api-key');
  if (authHeader !== process.env.PUSH_SECRET_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const payload = await req.json();
  const { record, old_record } = payload;

  // Só prossegue se a coluna "enviar" mudou de FALSE para TRUE
  if (record.enviar === true && old_record.enviar === false) {
    
    // Dispara a requisição para a sua própria API centralizada de Push
    await fetch('https://www.minhai.app/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PUSH_SECRET_KEY!
      },
      body: JSON.stringify({
        title: record.titulo,
        message: record.mensagem,
        url: record.url,
        broadcast: true // A flag mágica que criamos no Passo 1
      })
    });

    // Marca como enviado no banco para você ter o controle
    const supabase = createClient();
    await supabase
      .from('push_broadcasts')
      .update({ enviado_em: new Date().toISOString() })
      .eq('id', record.id);
  }

  return NextResponse.json({ success: true });
}