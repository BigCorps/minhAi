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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {company.name}
            </h1>
            <p className="text-gray-600">
              Assistente Virtual com Voz
            </p>
          </div>
          <Link
            href="https://meatend.bigcorps.com.br/login"
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition shadow-md font-semibold"
          >
            Editar Meu Assistente
          </Link>
        </div>
      </div>

      {/* Instruções */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">
            Como usar:
          </h2>
          <ol className="text-sm text-gray-700 space-y-2 ml-4">
            <li>1. Permita acesso ao microfone quando solicitado</li>
            <li>2. Aguarde o indicador verde (sistema pronto para ouvir)</li>
            <li>3. Diga: <strong>"{company.wake_word || 'olá assistente'}"</strong></li>
            <li>4. Aguarde a saudação do assistente</li>
            <li>5. Faça sua pergunta ou solicitação</li>
            <li>6. O assistente responderá em voz</li>
          </ol>
        </div>
      </div>

      {/* Voice Assistant */}
      <VoiceAssistantWithWakeWord 
        companyId={company.id} 
        companyName={company.name}
        wakeWord={company.wake_word || 'olá assistente'}
        greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
      />

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="text-center border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 mb-3">
            Powered by MeAtend
          </p>
          <Link
            href="https://meatend.bigcorps.com.br"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition"
          >
            Crie seu próprio assistente de voz
          </Link>
        </div>
      </div>
    </div>
  );
}
