export function connectMercadoPago(companyId: string, nextPath: string) {
  const nonce = crypto.randomUUID();
  const state = `${nonce}.${companyId}.${encodeURIComponent(nextPath)}`;
  document.cookie = `mp_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;

  const params = new URLSearchParams({
    client_id: '882728597014322',
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: process.env.NEXT_PUBLIC_MP_REDIRECT_URI!,
    state,
  });
  window.location.href = `https://auth.mercadopago.com.br/authorization?${params}`;
}
