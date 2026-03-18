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
    .select('logo_url')
    .eq('slug', slug)
    .single();

  if (!company?.logo_url) {
    return NextResponse.redirect(new URL('/favicon.ico', request.url));
  }

  // Redireciona para o logo da empresa no Supabase Storage
  return NextResponse.redirect(company.logo_url);
}
