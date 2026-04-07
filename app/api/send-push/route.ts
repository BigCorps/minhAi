import { NextRequest, NextResponse } from 'next/server';
// 🔴 Mude de createClient para createAdminClient
import { createAdminClient } from '@/lib/supabase-admin'; 
import webpush from 'web-push';

export const runtime = 'nodejs';
export const maxDuration = 60;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = 'mailto:contato@minhai.app'; 

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key');
    // Obs: Se for fazer push direto do dashboard (client), ajuste essa validação
    if (authHeader !== process.env.PUSH_SECRET_KEY) {
       return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await req.json();
    const { title, message, url, companyId, userId, broadcast } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    // 🔴 Use o supabaseAdmin aqui também
    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin.from('push_subscriptions').select('id, subscription');

    if (broadcast) {
      // Pega todos
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      return NextResponse.json({ error: 'Nenhum alvo definido.' }, { status: 400 });
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log("Nenhuma inscrição válida encontrada para envio.");
      return NextResponse.json({ success: true, sent: 0, message: 'Nenhuma inscrição encontrada.' });
    }

    const payload = JSON.stringify({ title, body: message, icon: '/icon512.png', url: url || '/' });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // 🔴 Use o supabaseAdmin para deletar também
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sent: subscriptions.length });

  } catch (error: any) {
    console.error("Erro interno do web-push:", error);
    return NextResponse.json({ error: 'Ocorreu um erro.' }, { status: 500 });
  }
}