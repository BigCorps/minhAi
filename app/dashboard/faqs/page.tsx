// app/dashboard/faqs/page.tsx (Server Component)
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import FAQsClient from './FAQsClient';

// Força renderização dinâmica para resolver erro de cookies
export const dynamic = 'force-dynamic';

export default async function FAQsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <FAQsClient />;
}
