import { createClient } from '@/lib/supabase-server';
import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  const supabase = createClient();
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !company) {
    notFound();
  }

  const systemPrompt = company.system_prompt || 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 flex flex-col">
      {/* Header - centralizado */}
      <div className="w-full py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-1">
              {company.name}
            </h1>
            <p className="text-gray-600 text-lg">
              Assistente Virtual com Voz
            </p>
          </div>
          <Link
            href="https://meatend.bigcorps.com.br/login"
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition shadow-md font-semibold whitespace-nowrap"
          >
            Editar Meu Assistente
          </Link>
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

          {/* Footer */}
          <div className="text-center border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">
              Powered by MeAtend
            </p>
            <Link
              href="https://meatend.bigcorps.com.br"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium transition"
            >
              Crie seu próprio assistente de voz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
