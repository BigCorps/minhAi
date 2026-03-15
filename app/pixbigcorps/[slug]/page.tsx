import { createClient } from '@/lib/supabase-server';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

export default async function PixSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url, receiving_pix_key')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!company || !company.receiving_pix_key) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white">Assistente não encontrado ou PIX não configurado.</p>
      </div>
    );
  }

  return <PixLinkPage company={company} initialAmount={null} />;
}
