// app/api/send-push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import webpush from 'web-push';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Configuração do Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
// O e-mail é obrigatório pelo protocolo para que os provedores (Google/Apple) possam contatar em caso de abuso
const vapidEmail = 'mailto:contato@minhai.app'; 

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();
    
    // Você pode adaptar para receber user_id ou profile_id dependendo de quem quer notificar
    const { title, message, url, companyId } = body;

    if (!companyId || !title || !message) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    // 1. Buscar todas as inscrições ativas daquela empresa
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('company_id', companyId);

    if (error) {
      console.error('Erro ao buscar inscrições:', error.message);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nenhuma inscrição encontrada.' });
    }

    // 2. Montar o payload que o sw.js vai receber
    const payload = JSON.stringify({
      title: title,
      body: message,
      icon: '/icon512.png', // Mesmo que configuramos no manifest
      url: url || '/',
    });

    // 3. Disparar para todos os aparelhos
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
      } catch (err: any) {
        // Se o erro for 410 (Gone) ou 404 (Not Found), significa que o usuário 
        // revogou a permissão no celular ou limpou os dados do navegador.
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🧹 Removendo inscrição expirada: ${sub.id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`Erro ao enviar para ${sub.id}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ 
      success: true, 
      sent: subscriptions.length 
    });

  } catch (error: any) {
    console.error('❌ Erro no Web Push:', error.message);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao enviar a notificação.' }, 
      { status: 500 }
    );
  }
}