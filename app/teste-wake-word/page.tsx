import { createClient } from '@/lib/supabase-server';
import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function TesteWakeWordPage() {
  const supabase = createClient();
  
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  const company = companies?.[0];

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Empresa não encontrada
          </h1>
          <p className="text-gray-600 mb-6">
            Execute o SQL para criar empresa de teste
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                WAKE WORD: {company.wake_word || 'olá assistente'}
              </span>
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                R$ 0 - GRÁTIS
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎤 {company.name}
            </h1>
            <p className="text-gray-600">
              Diga "{company.wake_word || 'olá assistente'}" para começar
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-md"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <VoiceAssistantWithWakeWord 
        companyId={company.id} 
        companyName={company.name}
        wakeWord={company.wake_word || 'olá assistente'}
        greetingMessage={company.greeting_message || 'Olá! Como posso ajudar você hoje?'}
      />
    </div>
  );
}
