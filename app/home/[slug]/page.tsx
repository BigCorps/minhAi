// app/home/[slug]/page.tsx
import { createAdminClient } from '@/lib/supabase-admin';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';

// ─── Templates ───────────────────────────────────────────────────────────────
import TemplateModerno    from './templates/TemplateModerno';
import TemplateMinimalista from './templates/TemplateMinimalista';
import TemplateBold       from './templates/TemplateBold';
import TemplateFood       from './templates/TemplateFood';
import TemplateClinica    from './templates/TemplateClinica';
import TemplateTotem      from './templates/TemplateTotem';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dados da empresa necessários para todos os templates
export interface LandingCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  webapp_logo_url: string | null;
  webapp_theme_color: string | null;
  webapp_landing_template: string | null;
  webapp_home: string | null;
  webapp_enabled: boolean;
  assistant_role: string | null;
  brand_description: string | null;
  business_hours: string | null;
  business_address: string | null;
  whatsapp_number: string | null;
  instagram_username: string | null;
  website: string | null;
  facebook: string | null;
  email_contato: string | null;
  telefone_fixo: string | null;
  tiktok: string | null;
  twitter: string | null;
  linkedin: string | null;
  youtube_channel_url: string | null;
  modo_vendas_enabled: boolean;
  modo_fila_enabled: boolean;
  modo_links_enabled: boolean;
}

const TEMPLATES: Record<string, React.ComponentType<{ company: LandingCompany }>> = {
  moderno:      TemplateModerno,
  minimalista:  TemplateMinimalista,
  bold:         TemplateBold,
  food:         TemplateFood,
  clinica:      TemplateClinica,
  totem:        TemplateTotem,
};

export default async function HomeSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      id, name, slug,
      logo_url, webapp_logo_url, webapp_theme_color,
      webapp_landing_template, webapp_home, webapp_enabled,
      assistant_role, brand_description,
      business_hours, business_address,
      whatsapp_number, instagram_username, website,
      facebook, email_contato, telefone_fixo,
      tiktok, twitter, linkedin, youtube_channel_url,
      modo_vendas_enabled, modo_fila_enabled, modo_links_enabled
    `)
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();

  // ── Redirecionar baseado em webapp_home ──────────────────────────────────
  const home = company.webapp_home ?? 'ia';

  switch (home) {
    case 'ia':
      redirect(`/ia/${slug}`);
    case 'vendas':
      redirect(`/vendas/${slug}`);
    case 'fila':
      redirect(`/fila/${slug}`);
    case 'links':
      redirect(`/link/${slug}`);
    case 'home':
      break; // continua e renderiza a landing
    default:
      redirect(`/ia/${slug}`);
  }

  // ── Renderizar template escolhido ────────────────────────────────────────
  const templateKey = company.webapp_landing_template ?? 'moderno';
  const Template = TEMPLATES[templateKey] ?? TemplateModerno;

  return <Template company={company as LandingCompany} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, webapp_logo_url, logo_url, webapp_theme_color, brand_description')
    .eq('slug', slug)
    .single();

  if (!company) return { title: 'minhAi' };

  const iconUrl = company.webapp_logo_url || null;

  return {
    title: `${company.name}`,
    description: company.brand_description || `Conheça ${company.name} — powered by minhAi`,
    icons: iconUrl ? { icon: iconUrl, apple: iconUrl } : undefined,
    openGraph: {
      title: company.name,
      description: company.brand_description || `Conheça ${company.name}`,
      images: iconUrl ? [{ url: iconUrl }] : [],
    },
  };
}

export async function generateViewport({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('webapp_theme_color')
    .eq('slug', slug)
    .single();

  return {
    themeColor: company?.webapp_theme_color || '#f97316',
  };
}
