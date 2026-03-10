import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProducaoClient from './ProducaoClient';

export const dynamic = 'force-dynamic';

export default async function ProducaoPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, wake_word, slug')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  return <ProducaoClient companies={companies || []} user={user} />;
}
