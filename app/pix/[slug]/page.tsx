// app/pix/[slug]/page.tsx
import { createClient } from '@/lib/supabase-server';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PixSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white">Assistente não encontrado ou PIX não configurado.</p>
      </div>
    );
  }

  return <PixLinkPage company={company} initialAmount={null} />;
}
