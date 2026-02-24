const GoogleEmailForm = ({ companyId }: any) => {
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (companyId) {
      checkGoogleConnection();
    }
  }, [companyId]);

  async function checkGoogleConnection() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGoogleAccount(data);
      console.log('✅ Conta Google encontrada:', data); // Debug
    } catch (error) {
      console.error('Erro ao verificar conta Google:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleGoToAgenda() {
    if (!companyId) {
      console.error('❌ companyId não está definido');
      alert('Erro: ID da empresa não encontrado');
      return;
    }
    
    console.log('🔗 Navegando para /dashboard/agenda com companyId:', companyId);
    window.location.href = `/dashboard/agenda?companyId=${companyId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informação sobre a função */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Como funciona o Envio de Email
        </h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>✓ Diga: <strong>"Enviar email"</strong> para iniciar</li>
          <li>✓ Informe o destinatário por voz</li>
          <li>✓ Dite o assunto e conteúdo</li>
          <li>✓ Confirme ou edite antes de enviar</li>
        </ul>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs font-mono">
          CompanyId: {companyId || 'undefined'} | Conta: {googleAccount?.google_email || 'não encontrada'}
        </div>
      )}

      {/* Status da conexão Google */}
      {googleAccount ? (
        // ✅ CONECTADO
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  ✅ Conta Google Conectada
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Email: <span className="font-mono">{googleAccount.google_email}</span>
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Esta conta será usada para enviar os emails pelo assistente.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Gerenciar Conexão Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Comandos de Voz
            </h5>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>• "Enviar email para João"</li>
              <li>• "Mandar email para cliente"</li>
              <li>• "Envie um email"</li>
            </ul>
          </div>
        </div>
      ) : (
        // ❌ NÃO CONECTADO
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Conta Google não conectada
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Para enviar emails por voz, você precisa conectar uma conta Google primeiro.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Conectar Conta Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Você será redirecionado para a seção <strong>Agenda</strong> onde poderá conectar sua conta Google e gerenciar emails e calendário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
