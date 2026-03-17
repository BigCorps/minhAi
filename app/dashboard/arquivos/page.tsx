// app/dashboard/arquivos/page.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ArquivosClient from './ArquivosClient';

export const dynamic = 'force-dynamic';

export default async function ArquivosPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return <ArquivosClient />;
}
