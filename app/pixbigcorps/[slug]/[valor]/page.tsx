import { createClient } from '@/lib/supabase-server';
import PixLinkPage from '@/components/pix-link/PixLinkPage';

export default async function PixSlugValorPage({
  params,
}: {
  params: { slug: string; valor: string };
}) {
  const supabase = createClient();

const { data: company } = await supabase
  .from('companies')
  .select('id, name, slug, logo_url')
  .eq('slug', params.slug)
  .eq('is_active', true)
  .single();

if (!company) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white">Assistente não encontrado ou PIX não configurado.</p>
      </div>
    );
  }

  const valor = parseFloat(params.valor);
  const initialAmount = isNaN(valor) || valor <= 0 ? null : valor;

  return <PixLinkPage company={company} initialAmount={initialAmount} />;
}
