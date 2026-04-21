import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PayRedirectPage({ params }: Props) {
  const { slug } = await params;

  if (!slug || slug.length !== 6) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('short_links')
    .select('original_url, expires_at')
    .eq('slug', slug)
    .single();

  if (error || !data?.original_url) notFound();

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    notFound();
  }

  redirect(data.original_url);
}