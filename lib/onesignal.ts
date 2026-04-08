// lib/onesignal.ts
export async function sendOneSignalPush({ 
  title, 
  message, 
  url, 
  userId, 
  broadcast 
}: { 
  title: string, 
  message: string, 
  url?: string, 
  userId?: string, 
  broadcast?: boolean 
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    throw new Error("Credenciais do OneSignal ausentes no .env");
  }

  const payload: any = {
    app_id: appId,
    headings: { en: title, pt: title },
    contents: { en: message, pt: message },
    url: url || 'https://www.minhai.app/dashboard',
    target_channel: "push"
  };

  if (broadcast) {
    // 🔴 Correção do erro 500: Nome atualizado do segmento no OneSignal
    payload.included_segments = ["Subscribed Users"];
  } else if (userId) {
    payload.include_aliases = { external_id: [userId] };
  }

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${restApiKey}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    console.error("🚨 Erro detalhado do OneSignal:", result);
    throw new Error(JSON.stringify(result.errors));
  }

  return result;
}