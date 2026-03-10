'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { UploadContent } from '@/app/arquivos/page';
import { DownloadContent } from '@/app/download/[token]/page';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-white">Link não encontrado</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Este link não existe ou já foi removido.
        </p>
      </div>
    </PageWrapper>
  );
}

function ExpiredPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">⏱️</div>
        <h2 className="text-xl font-bold text-white">Link expirado</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Este link expirou. Volte ao assistente e gere um novo.
        </p>
      </div>
    </PageWrapper>
  );
}

export default function ShortLinkPage({ params }: { params: { slug: string } }) {
  const [state, setState] = useState<'loading' | 'upload' | 'download' | 'expired' | 'notfound'>('loading');
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function resolve() {
      const { data: link, error } = await supabase
        .from('short_links')
        .select('type, target_token, expires_at')
        .eq('slug', params.slug)
        .maybeSingle();

      if (error || !link) {
        setState('notfound');
        return;
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        setState('expired');
        return;
      }

      setResolvedToken(link.target_token);
      setState(link.type as 'upload' | 'download');
    }

    resolve();
  }, [params.slug]); // eslint-disable-line

  if (state === 'loading') return (
    <PageWrapper>
      <div className="flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </PageWrapper>
  );

  if (state === 'notfound') return <NotFoundPage />;
  if (state === 'expired') return <ExpiredPage />;
  if (state === 'upload' && resolvedToken) return <UploadContent token={resolvedToken} />;
  if (state === 'download' && resolvedToken) return <DownloadContent token={resolvedToken} />;

  return <NotFoundPage />;
}
