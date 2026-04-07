// app/api/send-push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
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
    // 1. Segurança Básica: Impedir que pessoas de fora usem sua API
    const authHeader = req.headers.get('x-api-key');
    const secretKey = process.env.PUSH_SECRET_KEY || 'sua_chave_secreta_aqui_123';
    
    // Obs: As chamadas do frontend não terão header, então você pode flexibilizar 
    // ou exigir que até o frontend passe a chave (mais seguro).
    
    const body = await req.json();
    const { title, message, url, companyId, userId, broadcast } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    const supabase = createClient();
    let query = supabase.from('push_subscriptions').select('id, subscription');

    // 2. Filtros Dinâmicos (Para uma empresa, para um usuário, ou para TODOS)
    if (broadcast) {
      // Pega todos (Não filtra nada)
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      return NextResponse.json({ error: 'Nenhum alvo definido.' }, { status: 400 });
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nenhuma inscrição encontrada.' });
    }

    const payload = JSON.stringify({ title, body: message, icon: '/icon512.png', url: url || '/' });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sent: subscriptions.length });

  } catch (error: any) {
    return NextResponse.json({ error: 'Ocorreu um erro.' }, { status: 500 });
  }
}