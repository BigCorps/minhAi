'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ExclusionPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [supabase]);

  async function handleDeleteAccount() {
    if (confirmText.toLowerCase() !== 'excluir permanentemente') {
      setMessage({ 
        type: 'error', 
        text: 'Por favor, digite "excluir permanentemente" para confirmar.' 
      });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      // Call deletion edge function
      const { data, error } = await supabase.functions.invoke('delete-user-data', {
        body: { userId: user?.id, email: user?.email },
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Solicitação de exclusão enviada com sucesso! Você receberá um email de confirmação em até 48 horas.' 
      });

      // Logout after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }, 3000);

    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao processar solicitação. Tente novamente ou entre em contato pelo email.' 
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Botão de Toggle de Tema */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`}
      >
        {theme === 'dark' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="container mx-auto py-6 md:py-12 w-full max-w-4xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className={`p-2 rounded-lg transition-all ${
              theme === 'dark'
                ? 'hover:bg-white/10 text-white'
                : 'hover:bg-black/5 text-black'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className={`text-2xl md:text-3xl font-bold transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Exclusão de Dados
          </h1>
          <div className="w-10" />
        </div>

        {/* Main Content Card */}
        <div className={`rounded-2xl shadow-xl p-6 md:p-8 mb-6 transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
            : 'bg-white'
        }`}>
          <div className="max-h-[60vh] overflow-y-auto pr-4">
            <div className={`prose max-w-none transition-colors ${
              theme === 'dark' ? 'text-white/80 prose-headings:text-white prose-strong:text-white prose-li:text-white/80 prose-p:text-white/80' 
                               : 'text-gray-800'
            }`}>
              
              <h2>Como Funciona a Exclusão de Dados</h2>
              <p>Você pode solicitar a exclusão permanente de todos os seus dados pessoais do eAi a qualquer momento, conforme garantido pela Lei Geral de Proteção de Dados (LGPD).</p>

              <div className={`p-4 rounded-lg border my-4 ${
                theme === 'dark'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-red-50 border-red-200'
              }`}>
                <h3 className="!mt-0 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Importante: Esta Ação é Irreversível
                </h3>
                <p className="!mb-0">Após a exclusão, não será possível recuperar seus dados, conversas, configurações ou histórico. Certifique-se de que realmente deseja prosseguir.</p>
              </div>

              <h2>O Que Será Excluído</h2>
              <ul>
                <li><strong>Dados da Conta:</strong> Email, nome, senha e informações de perfil</li>
                <li><strong>Dados de Uso:</strong> Histórico de conversas, mensagens e interações</li>
                <li><strong>Configurações:</strong> Preferências e personalizações</li>
                <li><strong>Integrações:</strong> Conexões com plataformas de terceiros (Meta, Google, etc.)</li>
                <li><strong>Dados Técnicos:</strong> Logs de acesso e informações de dispositivos</li>
              </ul>

              <h2>Prazo de Exclusão</h2>
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}>
                <ol className="space-y-2 !mb-0">
                  <li><strong>Confirmação Imediata:</strong> Você receberá um email de confirmação em até 48 horas</li>
                  <li><strong>Processamento:</strong> A exclusão será processada em até 7 dias úteis</li>
                  <li><strong>Confirmação Final:</strong> Email confirmando a exclusão completa dos dados</li>
                  <li><strong>Backups:</strong> Dados em backups serão removidos no próximo ciclo (até 30 dias)</li>
                </ol>
              </div>

              <h2>Retenção Legal</h2>
              <p>Alguns dados podem ser retidos temporariamente para cumprir obrigações legais, contábeis ou fiscais, conforme exigido pela legislação brasileira. Esses dados serão excluídos assim que o período legal expirar.</p>

              <h2>Métodos de Exclusão</h2>
              
              <h3>Opção 1: Através da Plataforma (Recomendado)</h3>
              {user ? (
                <p>Você está logado como <strong>{user.email}</strong>. Use o formulário abaixo para solicitar a exclusão imediata.</p>
              ) : (
                <p>Faça login na sua conta para usar esta opção de exclusão rápida.</p>
              )}

              <h3>Opção 2: Por Email</h3>
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}>
                <p><strong>Para:</strong> contato@bigcorps.com.br</p>
                <p><strong>Assunto:</strong> Solicitação de Exclusão de Dados - LGPD</p>
                <p><strong>Corpo do email:</strong></p>
                <pre className={`text-sm p-3 rounded whitespace-pre-wrap !bg-opacity-50 ${
                  theme === 'dark' ? 'bg-slate-600' : 'bg-gray-100'
                }`}>{`Nome completo:
Email da conta:
Confirmação: "Solicito a exclusão permanente de todos os meus dados pessoais conforme a LGPD"`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Deletion Form */}
        {user ? (
          <div className={`rounded-2xl shadow-xl p-6 md:p-8 mb-6 transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
              : 'bg-white'
          }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Solicitar Exclusão de Dados
            </h2>

            {message && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 border ${
                message.type === 'success' 
                  ? theme === 'dark'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
                  : theme === 'dark'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <div className={`mb-4 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>
                <strong>Conta:</strong> {user.email}
              </p>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>
                <strong>Nome:</strong> {user.user_metadata?.name || 'Não informado'}
              </p>
            </div>

            {!showConfirmation ? (
              <button
                onClick={() => setShowConfirmation(true)}
                className={`w-full px-6 py-3 rounded-lg transition-all font-medium ${
                  theme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                }`}
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Continuar com a Exclusão
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Para confirmar, digite: <strong>"excluir permanentemente"</strong>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="excluir permanentemente"
                    className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 border border-white/10 text-white placeholder-white/40'
                        : 'bg-white border border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setConfirmText('');
                      setMessage(null);
                    }}
                    disabled={isDeleting}
                    className={`flex-1 px-6 py-3 rounded-lg transition-all font-medium ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-white hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmText.toLowerCase() !== 'excluir permanentemente'}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : (
                      'Confirmar Exclusão'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`rounded-2xl shadow-xl p-6 md:p-8 text-center transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
              : 'bg-white'
          }`}>
            <p className={`mb-4 ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
              Você precisa estar logado para solicitar a exclusão através da plataforma.
            </p>
            <Link href="/login">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                Fazer Login
              </button>
            </Link>
          </div>
        )}

        {/* Contact Info */}
        <div className={`rounded-2xl shadow-xl p-6 md:p-8 transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
            : 'bg-white'
        }`}>
          <h2 className={`text-xl font-bold mb-4 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Precisa de Ajuda?
          </h2>
          <p className={`mb-4 ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>
            Se você tiver dúvidas sobre o processo de exclusão ou precisar de assistência:
          </p>
          <div className={`space-y-2 ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>
            <p><strong>Email:</strong> contato@bigcorps.com.br</p>
            <p><strong>Horário:</strong> Segunda a Sexta, 9h às 18h (horário de Brasília)</p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/privacy">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Aviso de Privacidade
            </button>
          </Link>
          <a href="mailto:contato@bigcorps.com.br">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contato de Privacidade
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}