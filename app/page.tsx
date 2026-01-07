import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  // Verificar se usuário está logado
  const user = await getUser();
  
  // Se está logado, redirecionar para dashboard
  if (user) {
    redirect('/dashboard');
  }

  // Se não está logado, mostrar landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Image 
              src="/logo.png" 
              alt="Gerente IA" 
              width={180} 
              height={48}
              className="h-12 w-auto"
            />
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#recursos" className="text-gray-600 hover:text-gray-900">Recursos</a>
              <a href="#precos" className="text-gray-600 hover:text-gray-900">Preços</a>
              <a href="#contato" className="text-gray-600 hover:text-gray-900">Contato</a>
            </nav>
            <Link
              href="/login"
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Atendimento ao Cliente
          </h1>
          <h2 className="text-5xl font-bold text-orange-600 mb-6">
            Por Voz com IA
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Transforme a experiência dos seus clientes com um assistente de voz inteligente
            que responde perguntas, tira dúvidas e oferece suporte 24/7.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-lg"
            >
              Começar Agora
            </Link>
            <Link
              href="/teste-wake-word"
              className="px-8 py-4 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition font-semibold text-lg"
            >
              Ver Demonstração
            </Link>
          </div>
        </div>

        {/* Demo Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Diga "Olá Assistente"
              </h3>
              <p className="text-gray-600 text-center mb-6">
                E comece a interagir com seu assistente de voz personalizado
              </p>
              <Link
                href="/teste-wake-word"
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
              >
                Testar Agora Gratuitamente
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Custo Baixo</h3>
            <p className="text-gray-600">
              A partir de R$ 0,12 por interação. Economia de 90% comparado a atendimento humano.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Totalmente Customizável</h3>
            <p className="text-gray-600">
              Configure wake words, saudações e prompts personalizados para cada empresa.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rápido e Fácil</h3>
            <p className="text-gray-600">
              Configure em minutos. Sem necessidade de código ou conhecimento técnico.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 bg-white dark:bg-[#0F140B]">
        <div className="px-4 text-center text-gray-700 dark:text-gray-300">
          <p>
            &copy; {new Date().getFullYear()} Gerente IA - Atendimento por Voz Inteligente.
          </p>
          <small>
            <a
              href="https://bigcorps.com.br"
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-gray-600 dark:text-gray-400"
            >
              Desenvolvido por BigCorps.
            </a>
          </small>
        </div>
      </footer>
    </div>
  )
}
