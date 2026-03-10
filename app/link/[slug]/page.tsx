// app/link/[slug]/page.tsx
// Redirecionador server-side simples.
// Resolve o slug e redireciona para a URL real — sem lógica de client.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function ShortLinkPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: link } = await supabase
    .from('short_links')
    .select('type, target_token, expires_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  // Expirado — redireciona para página genérica de expirado
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    redirect('/link/expirado');
  }

  // Redireciona para a rota real com o token UUID
  if (link.type === 'upload') {
    redirect(`/arquivos?token=${link.target_token}`);
  }

  if (link.type === 'download') {
    redirect(`/download/${link.target_token}`);
  }

  notFound();
}
