import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.redirect(new URL('/favicon.ico', request.url));
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('webapp_logo_url')
    .eq('slug', slug)
    .single();

  if (!company?.webapp_logo_url) {
    return NextResponse.redirect(new URL('/favicon.ico', request.url));
  }

  // Redireciona para o logo da empresa no Supabase Storage — sem cache
  return NextResponse.redirect(company.webapp_logo_url, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}
