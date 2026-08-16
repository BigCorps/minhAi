// app/pix/[slug]/[valor]/page.tsx
import { createClient } from '@/lib/supabase-server';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

interface PageProps {
  params: Promise<{ slug: string; valor: string }>;
}

function NotAvailable() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-white text-lg font-semibold">Pix Link indisponível</p>
        <p className="text-slate-400 text-sm mt-2">
          Este endereço não existe ou o Pix Link desta empresa não está ativo.
        </p>
      </div>
    </div>
  );
}

export default async function PixSlugValorPage({ params }: PageProps) {
  const { slug, valor } = await params;
  const supabase = createClient();

  const { data: allowed } = await supabase.rpc('pixwiki_can_serve_subdomain', {
    p_slug: slug,
  });

  if (!allowed) return <NotAvailable />;

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .eq('segment_key', 'pix_wiki')
    .eq('is_active', true)
    .single();

  if (!company) return <NotAvailable />;

  const normalizedValor = decodeURIComponent(valor).replace(',', '.');
  const amount = parseFloat(normalizedValor);
  const initialAmount = Number.isFinite(amount) && amount > 0 ? amount : null;

  return <PixLinkPage company={company} initialAmount={initialAmount} />;
}
