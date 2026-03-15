// app/api/auth/signout/route.ts
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createClient();
  
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/login', requestUrl.origin));
  
  // Limpar todos os cookies de sessão do Supabase
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  response.cookies.delete('lastLoggedInUser');
  
  // Limpar cookies com nome dinâmico do Supabase (padrão sb-[project-ref]-auth-token)
  const cookieHeader = request.headers.get('cookie') || '';
  cookieHeader.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('sb-')) {
      response.cookies.delete(name);
    }
  });

  return response;
}