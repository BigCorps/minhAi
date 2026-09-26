import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { adminMidia, adminMidiaStorage } from '@/lib/midia/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeDownloadName(value: string) {
  const cleaned = String(value || 'midia-pro-arquivo')
    .replace(/[\\/\r\n\t\0]/g, '-')
    .replace(/[^\p{L}\p{N}._() -]+/gu, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return cleaned || 'midia-pro-arquivo';
}

export async function GET(request: Request) {
  const creativeId = new URL(request.url).searchParams.get('creativeId')?.trim() || '';
  if (!creativeId) return NextResponse.json({ error: 'creative_required' }, { status: 400 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = adminMidia();
  const { data: publisher } = await admin
    .from('publishers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!publisher) return NextResponse.json({ error: 'publisher_not_found' }, { status: 404 });

  const { data: creative } = await admin
    .from('creatives')
    .select('id,publisher_id,file_name,storage_path,status')
    .eq('id', creativeId)
    .eq('publisher_id', publisher.id)
    .eq('status', 'ready')
    .maybeSingle();
  if (!creative) return NextResponse.json({ error: 'creative_not_found' }, { status: 404 });

  const storage = adminMidiaStorage();
  const { data, error } = await storage.storage
    .from('midia-assets')
    .createSignedUrl(creative.storage_path, 120, {
      download: safeDownloadName(creative.file_name),
    });

  if (error || !data?.signedUrl) {
    console.error('[midia/media/download]', error);
    return NextResponse.json({ error: 'download_unavailable' }, { status: 503 });
  }

  const response = NextResponse.redirect(data.signedUrl, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
