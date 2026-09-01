// app/site/[slug]/page.tsx
import { createAdminClient } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import SiteClient from './SiteClient';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url, assistant_role, webapp_enabled, webapp_home, webapp_theme_color, website, modo_vendas_enabled, modo_fila_enabled, modo_links_enabled')
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();
  if (!company.website) notFound();

  return <SiteClient company={company} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, webapp_logo_url')
    .eq('slug', slug)
    .single();

  if (!company) return { title: 'minhAi' };

  return {
    title: company.name,
    icons: company.logo_url ? { icon: company.logo_url } : undefined,
  };
}
