import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.PUSH_SECRET_KEY) {
       return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await req.json();
    const { title, message, url, userId, broadcast } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      throw new Error("Credenciais do OneSignal ausentes");
    }

    // Payload padrão do OneSignal
    const onesignalPayload: any = {
      app_id: appId,
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
      url: url || 'https://www.minhai.app/dashboard',
    };

    // A mágica do direcionamento
    if (broadcast) {
      // Envia para todos os inscritos (Targeting "All")
      onesignalPayload.included_segments = ["Subscribed Users"];
    } else if (userId) {
      // Envia especificamente para o usuário logado (Aquele OneSignal.login(userId) do Frontend)
      onesignalPayload.include_aliases = { external_id: [userId] };
      onesignalPayload.target_channel = "push";
    } else {
      return NextResponse.json({ error: 'Nenhum alvo definido.' }, { status: 400 });
    }

    // Dispara para a API do OneSignal
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify(onesignalPayload)
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      console.error("Erro do OneSignal:", result);
      return NextResponse.json({ error: 'Erro ao enviar para o OneSignal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });

  } catch (error: any) {
    console.error("Erro na API de envio:", error);
    return NextResponse.json({ error: 'Ocorreu um erro interno.' }, { status: 500 });
  }
}