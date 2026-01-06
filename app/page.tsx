import Link from 'next/link';
import { getUser } from '@/lib/supabase-server';

export default async function Home() {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Gerente IA</h1>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="#features" className="text-gray-600 hover:text-orange-600 transition">
                Recursos
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-orange-600 transition">
                Preços
              </Link>
              <Link href="#contact" className="text-gray-600 hover:text-orange-600 transition">
                Contato
              </Link>
            </nav>
            
            <Link
              href={user ? '/dashboard' : '/login'}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              {user ? 'Dashboard' : 'Entrar'}
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            Atendimento ao Cliente
            <span className="block text-orange-600 mt-2">
              Por Voz com IA
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transforme a experiência dos seus clientes com um assistente de voz inteligente 
            que responde perguntas, tira dúvidas e oferece suporte 24/7.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link
              href={user ? '/dashboard' : '/login'}
              className="bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-700 transition shadow-lg"
            >
              {user ? 'Ir para Dashboard' : 'Começar Agora'}
            </Link>
            <button className="bg-white text-orange-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-orange-600 hover:bg-orange-50 transition">
              Ver Demonstração
            </button>
          </div>
        </div>
        
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center animate-pulse-slow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Diga "Olá Assistente"
            </h3>
            <p className="text-center text-gray-600 mb-8">
              E comece a interagir com seu assistente de voz personalizado
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-gray-600 text-center mt-4">
                ✅ Autenticação configurada<br/>
                ✅ OpenAI integrada<br/>
                🔄 Próximo: Sistema de empresas e prompts
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Recursos Principais
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-orange-50 rounded-xl p-8 border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Multi-Tenant
              </h3>
              <p className="text-gray-600">
                Gerencie múltiplas empresas em uma única plataforma, cada uma com seus próprios prompts e configurações.
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-xl p-8 border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Voz Natural
              </h3>
              <p className="text-gray-600">
                Reconhecimento de voz em português brasileiro com síntese de fala ultra-realista.
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-xl p-8 border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Analytics Completo
              </h3>
              <p className="text-gray-600">
                Dashboard com métricas detalhadas, histórico de conversas e insights para melhorar o atendimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600">
            © 2025 Gerente IA. Desenvolvido por BigCorps.
          </p>
        </div>
      </footer>
    </div>
  );
}
