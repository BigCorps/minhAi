import { createAdminClient } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import KioskWrapper from './KioskWrapper';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, assistant_role, webapp_theme_color')
    .eq('slug', slug)
    .single();
  
  if (error || !company) notFound();
  
  return (
    <div className="min-h-screen flex flex-col">
      <KioskWrapper>
        {children}
      </KioskWrapper>
    </div>
  );
}
