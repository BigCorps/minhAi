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

  // Buscar prompt ativo da empresa
  const { data: prompt } = await supabase
    .from('company_prompts')
    .select('system_prompt')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .single();

  // Usar system_prompt da empresa ou do company_prompts
  const systemPrompt = company.system_prompt || prompt?.system_prompt || 'Você é um assistente virtual prestativo. Responda de forma clara, objetiva e educada.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                PALAVRAS DE ATIVAÇÃO: {company.wake_word}
              </span>
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                R$ 0 - GRÁTIS
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎤 {company.name}
            </h1>
            <p className="text-gray-600">
              Diga "{company.wake_word}" para começar
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-md"
          >
            Criar Meu Assistente
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-900 mb-2">
            📋 Como usar:
          </h2>
          <ol className="text-sm text-yellow-800 space-y-1 ml-4">
            <li>1. Permita acesso ao microfone</li>
            <li>2. Aguarde indicador verde</li>
            <li>3. Diga: <strong>"{company.wake_word}"</strong></li>
            <li>4. Ouça a saudação</li>
            <li>5. Fale sua pergunta</li>
            <li>6. O assistente responderá em voz</li>
          </ol>
        </div>
      </div>

      <VoiceAssistantWithWakeWord 
        companyId={company.id} 
        companyName={company.name}
        wakeWord={company.wake_word || 'olá assistente'}
        greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
      />

      <div className="max-w-4xl mx-auto mt-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            MeAtend
          </p>
          <Link
            href="/"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Crie seu próprio assistente de voz →
          </Link>
        </div>
      </div>
    </div>
  );
}
