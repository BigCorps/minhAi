import { createClient } from '@/lib/supabase-server';
import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  // Next.js 16: params agora é async
  const { slug } = await params;
  
  const supabase = createClient();
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) {
    notFound();
  }

  const systemPrompt = company.system_prompt || 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 flex flex-col">
      {/* Header - centralizado */}
      <div className="w-full py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {company.name}
          </h1>
          <p className="text-gray-600 text-lg">
            Assistente Virtual com Voz
          </p>
        </div>
      </div>

      {/* Conteúdo Principal - centralizado verticalmente */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <VoiceAssistantWithWakeWord 
            companyId={company.id} 
            companyName={company.name}
            wakeWord={company.wake_word || 'olá assistente'}
            greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
          />
        </div>
      </div>

      {/* Instruções - fixas embaixo */}
      <div className="w-full py-6 px-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Como usar o assistente:
            </h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
                <span>Permita o microfone</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                <span>Diga: "{company.wake_word || 'olá assistente'}"</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
                <span>Faça sua pergunta</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">4</span>
                <span>Diga "tchau" para encerrar</span>
              </div>
            </div>
          </div>

          {/* Footer com Links */}
          <div className="text-center border-t border-gray-200 pt-6">
            <div className="flex items-center justify-center space-x-4 mb-3">
              <Link
                href="https://itend.com.br"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Crie seu próprio assistente de voz
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="https://itend.com.br/login"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Editar Meu Assistente
              </Link>
            </div>
            <Link
              href="https://bigcorps.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-700 transition"
            >
              iTend - Desenvolvido por Bigcorps
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gerar metadata dinâmica - TAMBÉM precisa await params
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  
  const supabase = createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: company ? `${company.name} - Assistente Virtual` : 'Assistente Virtual',
    description: `Converse com o assistente virtual da ${company?.name || 'empresa'}`,
  };
}