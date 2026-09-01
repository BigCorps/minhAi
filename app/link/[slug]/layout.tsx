// app/link/[slug]/layout.tsx
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase-admin';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, webapp_logo_url')
    .eq('slug', slug)
    .single();

  const title = company?.name ? `${company.name} — Links` : 'Links';
  const icon = company?.webapp_logo_url ?? company?.logo_url ?? '/icons/icon-192x192.png';

  return {
    title,
    icons: { icon },
  };
}

export default function LinkLayout({ children }: Props) {
  return <>{children}</>;
}
