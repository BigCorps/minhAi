import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import AssistenteClient from './assistente-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  // Next.js 16: params agora é async
  const { slug } = await params;
  
  const supabase = createClient();
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) {
    notFound();
  }

  // Passar dados para client component
  return (
    <AssistenteClient
      company={{
        id: company.id,
        name: company.name,
        wake_word: company.wake_word || 'olá assistente',
        greeting_message: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
      }}
    />
  );
}

// Gerar metadata dinâmica
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  
  const supabase = createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: company ? `${company.name} - Assistente Virtual` : 'Assistente Virtual',
    description: `Converse com o assistente virtual da ${company?.name || 'empresa'}`,
  };
}
