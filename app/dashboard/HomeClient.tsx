// app/dashboard/HomeClient.tsx
// VERSÃO ULTRA BÁSICA - TESTE

'use client';

interface HomeClientProps {
  user: any;
  userId: string;
  totalCompanies: number;
  totalConversations: number;
  totalFAQs: number;
}

export default function HomeClient({ 
  user,
  userId,
  totalCompanies, 
  totalConversations, 
  totalFAQs 
}: HomeClientProps) {
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            🎉 Dashboard Funcionando!
          </h1>
          <h2 className="text-2xl mb-4">
            Olá, {displayName}!
          </h2>
          <p className="text-white/60">
            Bem-vindo ao eAi Dashboard
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <div className="text-white/60">Assistentes</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <div className="text-white/60">Conversas</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-white/10">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-2xl font-bold">{totalFAQs}</div>
            <div className="text-white/60">FAQs</div>
          </div>
        </div>

        {/* Links rápidos */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Links Rápidos</h3>
          <div className="space-y-2">
            <a href="/dashboard/assistentes" className="block text-blue-400 hover:text-blue-300">
              → Assistentes
            </a>
            <a href="/dashboard/funcoes" className="block text-blue-400 hover:text-blue-300">
              → Funções
            </a>
            <a href="/dashboard/saldo" className="block text-blue-400 hover:text-blue-300">
              → Saldo
            </a>
            <a href="/dashboard/historico" className="block text-blue-400 hover:text-blue-300">
              → Histórico
            </a>
          </div>
        </div>

        {/* Debug info */}
        <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 font-bold mb-2">✅ Dashboard está funcionando!</div>
          <div className="text-sm text-white/60">
            User ID: {userId}
          </div>
        </div>
      </div>
    </div>
  );
}