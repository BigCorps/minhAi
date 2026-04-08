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
  payload.included_segments = ["Total Subscriptions"];
} else if (userId) {
    payload.include_aliases = { external_id: [userId] };
    payload.target_channel = "push";
  } else {
    throw new Error("É necessário fornecer userId ou broadcast=true");
  }

console.log("📤 Payload enviado ao OneSignal:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${restApiKey}`
    },
    body: JSON.stringify(payload)
  });

const result = await response.json();

// Log completo da resposta do OneSignal
console.log("📬 Resposta completa do OneSignal:", JSON.stringify(result));
console.log("📊 Status HTTP:", response.status);
console.log("👥 Recipients:", result.recipients);
console.log("🆔 Notification ID:", result.id);

if (!response.ok || result.errors) {
  console.error("🚨 Erro detalhado do OneSignal:", result);
  throw new Error(JSON.stringify(result.errors));
}

return result;
}
