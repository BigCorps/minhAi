'use client';

// app/(dashboard)/page.tsx
// ALTERNATIVA CLIENT-SIDE: Verifica sessão no navegador

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

// Importar seus componentes (ajuste os caminhos)
// import LandingPage from '@/components/LandingPage';
// import DashboardHome from '@/components/DashboardHome';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      console.log('🔍 Verificando sessão...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('📊 Sessão:', session);
      console.log('👤 User:', session?.user?.email);
      console.log('❌ Error:', error);
      
      if (session?.user) {
        console.log('✅ Usuário logado:', session.user.email);
        setUser(session.user);
      } else {
        console.log('👤 Usuário NÃO logado');
        setUser(null);
      }
      
      setLoading(false);
    }

    checkUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth mudou:', event, session?.user?.email);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-green"></div>
      </div>
    );
  }

  // NÃO logado → Landing Page
  if (!user) {
    console.log('🏠 Renderizando Landing Page');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">Bem-vindo ao eAi</h1>
          <p className="text-xl mb-8">Seu assistente virtual inteligente</p>
          <a 
            href="/login" 
            className="bg-primary-green hover:bg-primary-green-dark text-white font-bold py-3 px-8 rounded-lg"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  // LOGADO → Dashboard
  console.log('✅ Renderizando Dashboard para:', user.email);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-6">Dashboard</h1>
        <p className="text-xl mb-4">Bem-vindo, {user.email}!</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Assistentes</h3>
            <p>Gerencie seus assistentes virtuais</p>
            <a href="/assistentes" className="text-primary-green hover:underline mt-4 block">
              Ver assistentes →
            </a>
          </div>
          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Funções</h3>
            <p>Configure funções disponíveis</p>
            <a href="/funcoes" className="text-primary-green hover:underline mt-4 block">
              Ver funções →
            </a>
          </div>
          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Saldo</h3>
            <p>Verifique seu saldo de créditos</p>
            <a href="/saldo" className="text-primary-green hover:underline mt-4 block">
              Ver saldo →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}