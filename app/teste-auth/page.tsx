'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function TesteAuthPage() {
  const [resultado, setResultado] = useState<any>(null);
  const supabase = createClient();

  async function testarAuth() {
    console.log('=== TESTE DE AUTH ===');
    console.log('Origin:', window.location.origin);
    console.log('Redirect URL:', `${window.location.origin}/auth/callback`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    console.log('Resultado signInWithOAuth:');
    console.log('Data:', data);
    console.log('Error:', error);
    
    setResultado({ data, error });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-4">Teste de Auth</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'loading...'}
          </div>
          <div>
            <strong>Redirect URL:</strong> {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'loading...'}
          </div>
        </div>

        <button
          onClick={testarAuth}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Testar Login com Google
        </button>

        {resultado && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-bold mb-2">Resultado:</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <h3 className="font-bold mb-2">Instruções:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abra o console do navegador (F12)</li>
            <li>Clique no botão acima</li>
            <li>Veja os logs no console</li>
            <li>Autorize no Google</li>
            <li>Veja para onde redireciona</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
