import { createAdminClient } from '@/lib/supabase-admin';
import PixWikiV2PaymentPage from '@/components/pix/PixWikiV2PaymentPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ token: string }> };

function Unavailable({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#020617] px-5 text-white"><div className="mx-auto flex min-h-screen max-w-md items-center"><div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-2xl text-amber-400">!</div><h1 className="mt-4 text-xl font-black">Pagamento indisponível</h1><p className="mt-2 text-sm leading-6 text-white/55">{message}</p><a href="https://pix.wiki" className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70">Conhecer a PixWiki</a></div></div></main>;
}

export default async function PixWikiCheckoutPage({ params }: PageProps) {
  const { token } = await params;
  if (!/^chk_[A-Za-z0-9_-]{24,100}$/.test(token)) return <Unavailable message="O endereço desta cobrança é inválido." />;
  const admin = createAdminClient();
  const { data: checkout, error } = await admin.from('pixwiki_v2_checkout_sessions').select('id,public_token,company_id,amount_cents,description,status,expires_at').eq('public_token', token).maybeSingle();
  if (error || !checkout) return <Unavailable message="Esta cobrança não existe ou já não está disponível." />;
  const { data: company } = await admin.from('companies').select('id,name,slug,logo_url,is_active,segment_key').eq('id', checkout.company_id).eq('segment_key', 'pix_wiki').eq('is_active', true).maybeSingle();
  if (!company) return <Unavailable message="O recebedor desta cobrança não está disponível." />;
  return <PixWikiV2PaymentPage token={token} company={{ id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url }} amountCents={Number(checkout.amount_cents || 0)} description={checkout.description || null} />;
}
