import { createClient } from '@/lib/supabase-server';
import { VoiceAssistantWithWakeWord } from '@/components/VoiceAssistant/VoiceAssistantWithWakeWord';
import Link from 'next/link';

export default async function TesteWakeWordPage() {
  // Buscar empresa de teste
  const supabase = createClient();
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .single();

  if (error || !company) {
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
            Execute o schema.sql do Supabase para criar a empresa de teste.
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
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                WAKE WORD ATIVO
              </span>
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                R$ 0 - GRÁTIS
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎤 Assistente com Wake Word Gratuito
            </h1>
            <p className="text-gray-600">
              Diga "Olá Assistente" e comece a conversar - sem apertar botões!
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

      {/* Requisitos */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-900 mb-2 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Requisitos Importantes:</span>
          </h2>
          <ul className="text-sm text-yellow-800 space-y-1 ml-7">
            <li>✓ Navegador: Chrome, Edge ou Safari (mais recentes)</li>
            <li>✓ Conexão com internet ativa</li>
            <li>✓ Permissão de microfone concedida</li>
            <li>✓ HTTPS obrigatório (já está em produção)</li>
            <li>✓ Fale claramente e em português</li>
          </ul>
        </div>
      </div>

      {/* Assistente */}
      <VoiceAssistantWithWakeWord 
        companyId={company.id} 
        companyName={company.name}
        wakeWord="olá assistente"
      />

      {/* Info Técnica */}
      <div className="max-w-4xl mx-auto mt-8">
        <details className="bg-white rounded-lg shadow-md p-6">
          <summary className="cursor-pointer font-semibold text-gray-900 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Informações Técnicas - Wake Word</span>
          </summary>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-gray-900">Tecnologia:</p>
                <p>Web Speech API (nativa do browser)</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Custo:</p>
                <p className="text-green-600 font-bold">R$ 0 (Totalmente Gratuito)</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-900 mb-2">Como Funciona:</p>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Web Speech API fica em reconhecimento contínuo</li>
                <li>Detecta quando você diz "olá assistente"</li>
                <li>Toca um beep de confirmação</li>
                <li>Inicia gravação automaticamente</li>
                <li>Processa com Whisper + GPT + TTS</li>
                <li>Responde em voz e volta a ouvir wake word</li>
              </ol>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-900 mb-2">Stack Completa:</p>
              <ul className="space-y-1 ml-4">
                <li>• <span className="font-medium">Wake Word:</span> Web Speech API (browser nativo)</li>
                <li>• <span className="font-medium">STT:</span> OpenAI Whisper (whisper-1)</li>
                <li>• <span className="font-medium">LLM:</span> OpenAI GPT-4o-mini</li>
                <li>• <span className="font-medium">TTS:</span> OpenAI TTS (tts-1, voice: nova)</li>
                <li>• <span className="font-medium">Database:</span> Supabase PostgreSQL</li>
              </ul>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-900 mb-2">Vantagens vs Porcupine:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-green-600">Web Speech API:</p>
                  <ul className="text-xs space-y-1">
                    <li>✓ R$ 0 (grátis)</li>
                    <li>✓ Sem limites de uso</li>
                    <li>✓ Qualquer wake word</li>
                    <li>✓ Fácil implementação</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-orange-600">Porcupine:</p>
                  <ul className="text-xs space-y-1">
                    <li>✗ R$ 250/mês</li>
                    <li>✗ 3 wake words max</li>
                    <li>✓ Funciona offline</li>
                    <li>✓ Mais privado</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-900 mb-2">Limitações:</p>
              <ul className="space-y-1 ml-4">
                <li>• Precisa de internet (usa API do Google)</li>
                <li>• Só funciona em HTTPS</li>
                <li>• Navegadores: Chrome, Edge, Safari</li>
                <li>• Não funciona em Firefox (ainda)</li>
              </ul>
            </div>

            <div className="border-t pt-3">
              <p className="font-semibold text-gray-900 mb-2">Custos por Interação:</p>
              <div className="bg-gray-50 rounded p-3 font-mono text-xs">
                Wake Word Detection: R$ 0,00<br/>
                Whisper (1 min): R$ 0,03<br/>
                GPT-4o-mini: R$ 0,01<br/>
                TTS (100 chars): R$ 0,08<br/>
                ────────────────────────<br/>
                <span className="font-bold">Total: ~R$ 0,12/interação</span>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Dicas de Uso */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💡 Dicas para Melhor Experiência</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Faça:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Fale claramente e pausadamente</li>
                <li>• Use um ambiente silencioso</li>
                <li>• Aguarde o beep antes de falar</li>
                <li>• Fale naturalmente após wake word</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">❌ Evite:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Falar muito baixo ou muito rápido</li>
                <li>• Ambientes com muito barulho</li>
                <li>• Usar em Firefox (não suportado)</li>
                <li>• Falar antes do beep de confirmação</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
