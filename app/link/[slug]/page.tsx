// app/link/[slug]/page.tsx
// Página unificada de short links — resolve slug e renderiza upload ou download
// sem redirect, mantendo a URL curta na barra do celular.

import { createClient } from '@/lib/supabase-server';
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

export default async function ShortLinkPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: link } = await supabase
    .from('short_links')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!link) {
    return <NotFoundPage />;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return <ExpiredPage />;
  }

  if (link.type === 'upload') {
    return <UploadContent token={link.target_token} />;
  }

  if (link.type === 'download') {
    return <DownloadContent token={link.target_token} />;
  }

  // Fallback — tipo desconhecido
  return <NotFoundPage />;
}
