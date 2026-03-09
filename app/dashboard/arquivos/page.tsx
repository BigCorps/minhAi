// app/dashboard/arquivos/page.tsx
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ArquivosClient from './ArquivosClient';

export const dynamic = 'force-dynamic';

export default async function ArquivosPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, wake_word, slug')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  return <ArquivosClient companies={companies || []} user={user} />;
}