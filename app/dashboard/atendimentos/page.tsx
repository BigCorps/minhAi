'use client';
// ARQUIVO: app/dashboard/atendimentos/page.tsx
import { useState, useEffect } from 'react';
import { ConnectionManager } from './_components/ConnectionManager';
import { QuickActionsPanel } from './_components/QuickActionsPanel';
import { createClient } from '@/lib/supabase-browser';
import { HelpCircle, X, ExternalLink, Smartphone, Monitor, ChevronRight, Share2, Zap } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  wake_word?: string;
}

export default function AtendimentosPage() {
  const supabase = createClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'connections' | 'actions'>('connections');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies')
        .select('id, name, wake_word')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      if (data && data.length > 0) {
        setCompanies(data);
        setSelectedCompanyId(data[0].id);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Serviços Meta
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure seus assistentes ao WhatsApp, Instagram e Facebook.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => setShowHelp(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <HelpCircle className="w-4 h-4" />
                  Ajuda
                </button>
                {/* Seletor de Assistente */}
                {companies.length > 0 && (
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-white text-gray-900 border-gray-300 dark:bg-slate-800 dark:text-white dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Selecione um assistente...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Sem assistente selecionado */}
          {!selectedCompanyId && (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
              <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Selecione um Assistente
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Escolha um assistente acima para gerenciar suas conexões Meta
              </p>
            </div>
          )}

          {/* Conteúdo Principal */}
          {selectedCompanyId && (
            <>
              {/* Tabs */}
              <div className="mb-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setActiveTab('connections')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'connections'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    Conexões Meta
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                      activeTab === 'actions'
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Ações Rápidas
                  </button>
                </div>
              </div>

              {/* Conteúdo da aba */}
              <div className="space-y-6">
                {activeTab === 'connections' && (
                  <ConnectionManager
                    selectedCompanyId={selectedCompanyId}
                    onCompanyChange={setSelectedCompanyId}
                  />
                )}
                {activeTab === 'actions' && (
                  <QuickActionsPanel selectedCompanyId={selectedCompanyId} />
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Modal de Ajuda */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-10"
              aria-label="Fechar"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/10 pr-14">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Como configurar o Meta Business Suite
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Siga os passos para conectar WhatsApp, Instagram e Facebook
              </p>
            </div>

            <div className="p-6 space-y-6">

              {/* Intro */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  O <strong>Meta Business Suite</strong> é a plataforma gratuita da Meta que centraliza
                  a gestão de contas empresariais do Facebook, Instagram e WhatsApp Business.
                  Você precisa configurá-lo antes de conectar suas contas aqui.
                </p>
              </div>

              {/* Via App */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pelo aplicativo (celular)</h3>
                </div>
                <ol className="space-y-2.5">
                  {[
                    <>Baixe o app <strong>Meta Business Suite</strong> na App Store ou Google Play.</>,
                    <>Faça login com a conta do Facebook que administra a Página da empresa.</>,
                    <>Toque em <strong>Menu</strong> (☰) → <strong>Configurações</strong> → <strong>Contas vinculadas</strong>.</>,
                    <>Em <strong>Instagram</strong>: toque em <strong>Conectar conta</strong> e autorize a conta profissional/comercial.</>,
                    <><strong>WhatsApp</strong>: toque em <strong>Adicionar número</strong>, insira o número e confirme o código SMS.
                      <span className="block text-xs text-yellow-700 dark:text-yellow-400 mt-1">⚠️ O número não pode estar ativo em outro WhatsApp pessoal.</span></>,
                    <>Confirme que a Página do Facebook está como <strong>Conta principal</strong> no painel.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-gray-200 dark:border-white/10" />

              {/* Via Site */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pelo navegador (computador)</h3>
                </div>
                <ol className="space-y-2.5">
                  {[
                    <><a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-blue-800 dark:hover:text-blue-300">business.facebook.com <ExternalLink className="w-3 h-3" /></a> — faça login com a conta da empresa.</>,
                    <>No menu lateral: <strong>Configurações</strong> → <strong>Contas</strong>.</>,
                    <>Em <strong>Contas do Instagram</strong>: clique em <strong>Adicionar</strong> e siga o fluxo de autorização.</>,
                    <>Em <strong>Contas do WhatsApp</strong>: clique em <strong>Adicionar</strong>, insira o número e confirme o código.
                      <span className="block text-xs text-yellow-700 dark:text-yellow-400 mt-1">⚠️ O número precisa ser um chip disponível, nunca usado em WhatsApp pessoal.</span></>,
                    <>Vá em <strong>Páginas</strong> e confirme que a Página da empresa está vinculada ao portfólio.</>,
                    <>Volte aqui e clique em <strong>Conectar conta Meta</strong> — o sistema detectará automaticamente as contas configuradas.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-gray-200 dark:border-white/10" />

              {/* FAQ */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Dúvidas frequentes</h3>
                <div className="space-y-2">
                  {[
                    {
                      q: 'Por que o WhatsApp não aparece após conectar?',
                      a: 'O número precisa estar vinculado a uma conta WhatsApp Business Account no Business Suite antes de conectar aqui. Siga os passos acima e reconecte a conta.',
                    },
                    {
                      q: 'Posso usar meu WhatsApp pessoal?',
                      a: 'Não. O Meta exige um número exclusivo para o WhatsApp Business. Use um chip novo ou um número fixo que nunca teve WhatsApp.',
                    },
                    {
                      q: 'O Instagram não aparece na conexão.',
                      a: 'A conta do Instagram precisa ser do tipo Profissional ou Comercial. Acesse o Instagram → Configurações → Conta → Mudar para conta profissional.',
                    },
                  ].map(({ q, a }, i) => (
                    <details key={i} className="group border border-gray-200 dark:border-white/10 rounded-lg">
                      <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{q}</span>
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0" />
                      </summary>
                      <p className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
                    </details>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 pb-6 pt-0">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
