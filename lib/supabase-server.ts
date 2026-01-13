import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  // Next.js 16+ - cookies agora retorna Promise
  // Mas o createServerClient espera objeto síncrono
  // Solução: criar wrapper que gerencia a Promise internamente
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = await cookies();
            cookieStore.set(name, value, options);
          } catch (error) {
            // Server Component não pode setar cookies
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = await cookies();
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // Server Component não pode remover cookies
          }
        },
      },
    }
  );
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}