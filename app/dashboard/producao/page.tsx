import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProducaoClient from './ProducaoClient';

export const dynamic = 'force-dynamic';

export default async function ProducaoPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return <ProducaoClient />;
}
