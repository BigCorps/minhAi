// app/debug/page.tsx
import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export default async function DebugPage() {
  const supabase = createClient();
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Debug - Sessão</h1>
      
      <div className="space-y-6">
        <div className="bg-slate-800 p-4 rounded">
          <h2 className="font-bold mb-2">Session:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
          {sessionError && (
            <p className="text-red-400 mt-2">Erro: {sessionError.message}</p>
          )}
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <h2 className="font-bold mb-2">User:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
          {userError && (
            <p className="text-red-400 mt-2">Erro: {userError.message}</p>
          )}
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <h2 className="font-bold mb-2">Cookies:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(allCookies, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}