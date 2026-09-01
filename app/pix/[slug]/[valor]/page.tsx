// app/pix/[slug]/[valor]/page.tsx
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase-server';
import PixLinkPage from '@/components/pix-link/PixLinkPage';
import PixWikiLinkPage from '@/components/pix/PixWikiLinkPage';

interface PageProps {
  params: Promise<{ slug: string; valor: string }>;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

function isPixWikiHost(host: string) {
  const clean = host.split(':')[0].toLowerCase();
  return clean === 'pix.wiki' || clean === 'www.pix.wiki' || clean.endsWith('.pix.wiki');
}

function NotAvailable({ pixWiki }: { pixWiki: boolean }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-white text-lg font-semibold">
          {pixWiki ? 'Pix Link indisponível' : 'Link não encontrado'}
        </p>
        <p className="text-slate-400 text-sm mt-2">
          {pixWiki
            ? 'Este endereço não existe ou o Pix Link deste recebedor não está ativo.'
            : 'Este link PIX não existe ou não está mais disponível.'}
        </p>
      </div>
    </div>
  );
}

export default async function PixSlugValorPage({ params }: PageProps) {
  const { slug, valor } = await params;
  const headerList = await headers();
  const host = headerList.get('host') || '';
  const pixWiki = isPixWikiHost(host);
  const supabase = createClient();

  const amount = Number.parseFloat(decodeURIComponent(valor).replace(',', '.'));
  const initialAmount = Number.isFinite(amount) && amount > 0 ? amount : null;

  if (pixWiki) {
    const { data: allowed } = await supabase.rpc('pixwiki_can_serve_subdomain', {
      p_slug: slug,
    });
    if (!allowed) return <NotAvailable pixWiki />;

    const { data: company } = await supabase
      .from('companies')
      .select('id,name,slug,logo_url')
      .eq('slug', slug)
      .eq('segment_key', 'pix_wiki')
      .eq('is_active', true)
      .maybeSingle();

    if (!company) return <NotAvailable pixWiki />;
    return <PixWikiLinkPage company={company as Company} initialAmount={initialAmount} />;
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id,name,slug,logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .or('segment_key.is.null,segment_key.neq.pix_wiki')
    .maybeSingle();

  if (!company) return <NotAvailable pixWiki={false} />;
  return <PixLinkPage company={company as Company} initialAmount={initialAmount} />;
}
