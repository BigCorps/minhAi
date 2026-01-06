export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Dashboard
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Dashboard em Desenvolvimento
          </h2>
          
          <p className="text-gray-600 mb-6">
            Esta página será implementada nas próximas etapas.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Próximas Etapas:</h3>
            <ul className="space-y-2 text-left text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Estrutura base do projeto criada</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">⏳</span>
                <span>Configurar Supabase e executar schema do banco</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">○</span>
                <span>Integrar OpenAI API (Whisper + GPT + TTS)</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">○</span>
                <span>Configurar Porcupine Wake Word Detection</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">○</span>
                <span>Implementar sistema de autenticação</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">○</span>
                <span>Criar CRUD de prompts e empresas</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">○</span>
                <span>Desenvolver cliente de voz para tablets</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
