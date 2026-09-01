const RESEND_URL = 'https://api.resend.com/emails';

export async function enviarEmailConviteIA({
  para, assunto, html, replyTo,
}: {
  para: string | string[];
  assunto: string;
  html: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada.');

  const de =
    process.env.CONVITEIA_EMAIL_FROM ||
    'ConviteIA <notificacoes@conviteia.com>';

  const r = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: de,
      to: Array.isArray(para) ? para : [para],
      subject: assunto,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail (${r.status}): ${texto.slice(0, 300)}`);
  }

  return r.json().catch(() => ({}));
}

export function escaparHtml(v: unknown) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
