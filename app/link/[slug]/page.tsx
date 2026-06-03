// app/link/[slug]/page.tsx
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import LinkClient from './LinkClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LinkPage({ params }: Props) {
  const { slug } = await params;

  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      id, name, slug, logo_url, webapp_logo_url, webapp_enabled,
      webapp_theme_color, webapp_home, assistant_role, brand_description,
      modo_links_enabled, modo_vendas_enabled, modo_fila_enabled,
      whatsapp_number, instagram_username, website, facebook,
      email_contato, telefone_fixo, tiktok, twitter, linkedin,
      youtube_channel_url
    `)
    .eq('slug', slug)
    .single();

  if (error || !company) {
    redirect('/');
  }

  const { data: links } = await supabase
    .from('company_links')
    .select('id, titulo, url, display_order, is_broken')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  return (
    <LinkClient
      company={company}
      links={links ?? []}
      slug={slug}
    />
  );
}
