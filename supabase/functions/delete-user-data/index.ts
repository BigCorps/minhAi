import { createClient } from 'npm:@supabase/supabase-js@2.41.0';

const ALLOWED_ORIGINS = new Set([
  'https://www.minhai.app',
  'https://minhai.app',
  'https://pix.wiki',
  'https://www.pix.wiki',
  'https://conviteia.com',
  'https://www.conviteia.com',
  'https://app.min.ia.br',
  'https://ia.artefinal.app',
  'https://consulta.tec.br',
  'https://www.consulta.tec.br',
]);

const EMAIL_TO = 'contato@bigcorps.com.br';

function cors(origin: string) {
  const allowed = ALLOWED_ORIGINS.has(origin);
  return {
    allowed: !origin || allowed,
    headers: {
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, x-client-info',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const corsState = cors(origin);

  if (!corsState.allowed) {
    return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
      status: 403,
      headers: { ...corsState.headers, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsState.headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsState.headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
      throw new Error('Env vars não configuradas.');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Usuário não autenticado.');

    const body = await req.json().catch(() => ({}));
    const requestedBrand = String(body?.brand ?? '').toLowerCase();
    const product =
      requestedBrand === 'pix'
        ? 'PixWiki'
        : requestedBrand === 'conviteia'
          ? 'ConviteIA'
          : requestedBrand === 'consultatec'
            ? 'ConsultaTec'
            : 'minhAi';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'BigCorps <contato@bigcorps.com.br>',
        to: [EMAIL_TO],
        subject: `URGENTE: Solicitação de Exclusão ${product} - ${user.email}`,
        html: `
          <h1>Solicitação de Exclusão de Dados</h1>
          <p>Produto informado: <strong>${product}</strong></p>
          <ul>
            <li><strong>ID:</strong> ${user.id}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
          </ul>
          <p>Verificar vínculos do mesmo usuário com outros produtos antes da exclusão definitiva.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      throw new Error('Erro ao enviar solicitação de exclusão.');
    }

    return new Response(JSON.stringify({ message: 'Solicitação enviada com sucesso.' }), {
      status: 200,
      headers: { ...corsState.headers, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[delete-user-data]', error?.message ?? error);

    return new Response(
      JSON.stringify({ error: error?.message ?? 'Erro interno.' }),
      {
        status: 400,
        headers: { ...corsState.headers, 'Content-Type': 'application/json' },
      },
    );
  }
});
