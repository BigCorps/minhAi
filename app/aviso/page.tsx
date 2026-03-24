'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivacyPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

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
            Aviso de Privacidade
          </h1>
          <div className="w-10" />
        </div>

        {/* Alert Box */}
        <div className={`mb-6 p-4 rounded-lg border transition-colors ${
          theme === 'dark'
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <svg className={`h-6 w-6 shrink-0 mt-1 ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className={`font-semibold ${
                  theme === 'dark' ? 'text-amber-100' : 'text-amber-900'
                }`}>
                  Deseja excluir seus dados?
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-amber-200' : 'text-amber-700'
                }`}>
                  Você pode solicitar a exclusão completa de todos os seus dados a qualquer momento
                </p>
              </div>
            </div>
            <Link href="/exclusao">
              <button className={`shrink-0 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}>
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir Meus Dados
              </button>
            </Link>
          </div>
        </div>

        {/* Main Content Card */}
        <div className={`rounded-2xl shadow-xl p-6 md:p-8 transition-colors ${
          theme === 'dark' 
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10' 
            : 'bg-white'
        }`}>
          <div className="h-[70vh] overflow-y-auto pr-4">
            <div className={`prose max-w-none transition-colors ${
              theme === 'dark' ? 'text-white/80 prose-headings:text-white prose-strong:text-white prose-li:text-white/80 prose-p:text-white/80' 
                               : 'text-gray-800'
            }`}>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <strong>Última atualização:</strong> 24 de março de 2026
              </p>
              
              <p>Este Aviso de Privacidade descreve como o <strong>minhAi</strong> (desenvolvido pela <strong>BigCorps Tecnologia LTDA</strong>) coleta, usa, armazena e protege suas informações pessoais. Levamos sua privacidade muito a sério e estamos comprometidos em proteger seus dados.</p>
              
              <h2>1. Informações que Coletamos</h2>
              <p>Coletamos diferentes tipos de informações para fornecer e melhorar nossos serviços:</p>
              <ul>
                <li><strong>Informações de Conta:</strong> Nome, email, senha (criptografada) e foto de perfil</li>
                <li><strong>Informações de Uso:</strong> Dados sobre como você utiliza a plataforma, incluindo páginas visitadas e ações realizadas</li>
                <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de navegador, dispositivo utilizado e sistema operacional</li>
              </ul>

              <h2>2. Como Usamos suas Informações</h2>
              <p>Utilizamos suas informações para os seguintes propósitos:</p>
              <ul>
                <li>Fornecer, operar e manter nossos serviços de assistência de voz e produtividade</li>
                <li>Gerenciar sua conta e autenticação segura</li>
                <li>Processar comunicações através de plataformas integradas (Google, Meta, etc.)</li>
                <li>Enviar notificações sobre atualizações e segurança</li>
                <li><strong>Cumprir obrigações legais e regulatórias (LGPD)</strong></li>
              </ul>

              <div className={`p-4 rounded-lg border my-4 ${
                theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className="text-sm !mb-0">
                  <strong>Conformidade com APIs do Google:</strong> O uso e a transferência de informações recebidas das APIs do Google pelo <strong>minhAi</strong> para qualquer outro aplicativo seguirão a{' '}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className={`underline font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    Política de Dados do Usuário dos Serviços de API do Google
                  </a>, incluindo os requisitos de <strong>Uso Limitado (Limited Use)</strong>.
                </p>
              </div>

              <h2>3. Proteção de Dados</h2>
              <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:</p>
              <ul>
                <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso</li>
                <li>Armazenamento seguro de senhas usando hashing bcrypt</li>
                <li>Acesso restrito a dados pessoais apenas para pessoal autorizado</li>
              </ul>

              <h2>4. Compartilhamento de Dados</h2>
              <p>Respeitamos sua privacidade e não vendemos seus dados pessoais. Podemos compartilhar informações apenas nas seguintes circunstâncias:</p>
              <ul>
                <li><strong>Com o Google:</strong> Os dados acessados via APIs do Google (Gmail, Drive, Agenda, YouTube, Fotos e SDM) são utilizados estritamente para as funcionalidades de automação e produtividade solicitadas pelo usuário.
                  <ul className="ml-4 mt-2 list-disc">
                    <li>Não utilizamos dados do Google para fins de publicidade ou marketing.</li>
                    <li>Não permitimos que humanos leiam seus dados das APIs do Google, exceto sob consentimento explícito para suporte técnico.</li>
                    <li>O acesso ao Google Drive é restrito à leitura de arquivos para exibição em dashboards solicitados pelo usuário.</li>
                  </ul>
                </li>
                <li><strong>Com a Meta:</strong> Apenas os dados necessários para operar as integrações do Facebook, Instagram e WhatsApp</li>
                <li><strong>Requisitos Legais:</strong> Quando exigido por lei ou regulamentação governamental</li>
              </ul>

              <h2>5. Exclusão de Dados</h2>
              <div className={`p-4 rounded-lg border my-4 ${
                theme === 'dark'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className="!mt-0">Como Excluir Seus Dados</h3>
                <p>Você tem o direito de solicitar a exclusão de todos os seus dados pessoais a qualquer momento:</p>
                
                <h4>Opção 1: Através da Plataforma</h4>
                <ol>
                  <li>Faça login na sua conta no <strong>minhAi</strong></li>
                  <li>Acesse a <Link href="/exclusao" className={`underline font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>página de Exclusão de Dados</Link></li>
                  <li>Confirme sua solicitação de exclusão permanente</li>
                </ol>
                
                <h4>Opção 2: Por Email</h4>
                <p>Envie um email para <strong>contato@bigcorps.com.br</strong> com o assunto "Solicitação de Exclusão de Dados - LGPD".</p>
              </div>

              <h2>6. Seus Direitos (LGPD)</h2>
              <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direitos de acesso, correção, exclusão e portabilidade de seus dados. Para exercê-los, entre em contato através do email oficial de suporte.</p>

              <h2>7. Contato e Responsabilidade Legal</h2>
              <div className={`p-4 rounded-lg space-y-2 ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}>
                <p>O <strong>minhAi</strong> é um produto desenvolvido e operado por:</p>
                <p><strong>BigCorps Tecnologia LTDA</strong></p>
                <p><strong>Email de Privacidade:</strong> contato@bigcorps.com.br</p>
                <p><strong>Endereço:</strong> Rua Saguairu, 925 - São Paulo - SP - 02514-000 - Brasil</p>
              </div>

              <hr className="my-6" />
              <div className={`text-center text-sm ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <p><strong>Ao usar o minhAi, você confirma que leu e compreende este Aviso de Privacidade.</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/exclusao">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg transition-all font-medium ${
              theme === 'dark'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}>
              Excluir Meus Dados
            </button>
          </Link>
          <a href="mailto:contato@bigcorps.com.br">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              Contato de Privacidade
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
