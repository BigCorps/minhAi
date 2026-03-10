// app/link/[slug]/page.tsx
// Server Component — resolve slug e redireciona para a rota real.
// Usa supabase-browser pois não há supabase-server no projeto.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function ShortLinkPage({ params }: { params: { slug: string } }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function resolve() {
      const { data: link } = await supabase
        .from('short_links')
        .select('type, target_token, expires_at')
        .eq('slug', params.slug)
        .maybeSingle();

      if (!link) {
        router.replace('/link/expirado');
        return;
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        router.replace('/link/expirado');
        return;
      }

      if (link.type === 'upload') {
        router.replace(`/arquivos?token=${link.target_token}`);
        return;
      }

      if (link.type === 'download') {
        router.replace(`/download/${link.target_token}`);
        return;
      }

      router.replace('/link/expirado');
    }

    resolve();
  }, [params.slug]); // eslint-disable-line

  // Tela de loading enquanto resolve
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
