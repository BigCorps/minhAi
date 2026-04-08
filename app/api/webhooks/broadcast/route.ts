import { NextRequest, NextResponse } from 'next/server';
// 🔴 Mude de createClient para createAdminClient
import { createAdminClient } from '@/lib/supabase-admin'; 

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-api-key');
  if (authHeader !== process.env.PUSH_SECRET_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const payload = await req.json();
  const { record, old_record } = payload;

  if (record.enviar === true && old_record.enviar === false) {
    
const host = req.headers.get('host') || 'www.minhai.app';
const protocol = host.includes('localhost') ? 'http' : 'https';

await fetch(`${protocol}://${host}/api/send-push`, {
  method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PUSH_SECRET_KEY!
      },
      body: JSON.stringify({
        title: record.titulo,
        message: record.mensagem,
        url: record.url,
        broadcast: true
      })
    });

    // 🔴 Use o supabaseAdmin e adicionei um log para garantir
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('push_broadcasts')
      .update({ enviado_em: new Date().toISOString() })
      .eq('id', record.id);
      
    if (error) {
       console.error('Erro ao salvar enviado_em:', error);
    }
  }

  return NextResponse.json({ success: true });
}
