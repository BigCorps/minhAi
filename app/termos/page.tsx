'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TermsPage() {
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
            Termos de Uso
          </h1>
          <div className="w-10" />
        </div>

        {/* Alert Box */}
        <div className={`mb-6 p-4 rounded-lg border transition-colors ${
          theme === 'dark'
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <svg className={`h-6 w-6 shrink-0 mt-1 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className={`font-semibold ${
                  theme === 'dark' ? 'text-blue-100' : 'text-blue-900'
                }`}>
                  Sua privacidade é importante
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                }`}>
                  Leia nossa política de privacidade para entender como protegemos seus dados
                </p>
              </div>
            </div>
            <Link href="/aviso">
              <button className={`shrink-0 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Aviso de Privacidade
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
                <strong>Última atualização:</strong> 23 de janeiro de 2026
              </p>
              
              <p>Bem-vindo ao minhAi. Ao utilizar nossos serviços, você concorda com estes Termos de Uso. Leia-os atentamente.</p>
              
              <h2>1. Aceitação dos Termos</h2>
              <p>Ao acessar e usar o minhAi, você aceita e concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este serviço.</p>

              <h2>2. Descrição do Serviço</h2>
              <p>O minhAi é uma plataforma de atendimento automatizado que utiliza inteligência artificial para te auxiliar de diversas formas.</p>
              <p>Nossos serviços incluem:</p>
              <ul>
                <li>Integração com plataformas diversas</li>
                <li>Assistente virtual baseado em IA para atendimento automatizado</li>
                <li>Gerenciamento centralizado de conversas e contatos</li>
              </ul>

              <h2>3. Conta de Usuário</h2>
              <p>Para utilizar o minhAi, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram em sua conta.</p>

              <h2>4. Conexão com Google e outros</h2>
              
              <h3>4.1 Autorização de Acesso</h3>
              <p>Ao conectar suas contas ao minhAi, você nos autoriza a:</p>
              <ul>
                <li>Acessar e gerenciar suas páginas conexões para o assistente te auxiliar da melhor forma</li>
                <li>Não temos acesso a nenhum dado, apenas o agente tem acesso, quando solicitado</li>
              </ul>

              <h3>4.2 Responsabilidade pelo Conteúdo</h3>
              <p>Você é totalmente responsável por:</p>
              <ul>
                <li>Todo o conteúdo enviado através do minhAi para suas páginas e perfis</li>
                <li>Garantir que o uso do serviço está em conformidade com os Termos de Serviço da Meta</li>
                <li>Respeitar as políticas de uso de cada plataforma (Facebook, Instagram, WhatsApp)</li>
                <li>Obter o consentimento necessário dos destinatários de suas mensagens</li>
                <li>Não enviar spam, conteúdo ofensivo ou ilegal</li>
              </ul>

              <h3>4.3 Revogação de Acesso</h3>
              <p>Você pode revogar o acesso do minhAi às suas contas a qualquer momento através de:</p>
              <ul>
                <li>Configurações da sua conta no minhAi</li>
                <li>Configurações de aplicativos nas plataformas da Meta</li>
                <li>Nossa página de <Link href="/aviso" className="text-blue-500 underline">Aviso de Privacidade</Link></li>
              </ul>

              <h2>5. Assistente de IA</h2>
              
              <h3>5.1 Ativação Voluntária</h3>
              <p>O uso do assistente de IA é opcional e controlado por você. Ao ativar este recurso:</p>
              <ul>
                <li>Você autoriza o processamento de mensagens através de nosso sistema de IA</li>
                <li>O assistente responderá automaticamente com base no contexto da conversa</li>
                <li>As respostas são geradas por inteligência artificial e podem conter erros</li>
                <li>Você pode desativar o assistente a qualquer momento</li>
              </ul>

              <h3>5.2 Controle e Supervisão</h3>
              <p>Você mantém controle total sobre o assistente de IA:</p>
              <ul>
                <li>Pode ativar ou desativar o assistente para conversas específicas</li>
                <li>Pode revisar e editar respostas antes do envio (quando configurado)</li>
                <li>Pode personalizar o comportamento e tom do assistente</li>
                <li>É responsável por supervisionar as interações automatizadas</li>
              </ul>

              <h3>5.3 Limitações e Isenções</h3>
              <p>Ao utilizar o assistente de IA, você reconhece que:</p>
              <ul>
                <li>As respostas são geradas automaticamente e podem não ser 100% precisas</li>
                <li>O minhAi não se responsabiliza por respostas inadequadas ou imprecisas</li>
                <li>Você deve revisar periodicamente as conversas automatizadas</li>
                <li>É sua responsabilidade garantir que o conteúdo gerado esteja correto</li>
                <li>O assistente não substitui atendimento humano em casos críticos</li>
              </ul>

              <h2>6. Conduta do Usuário</h2>
              <p>Ao usar o minhAi, você concorda em NÃO:</p>
              <ul>
                <li>Usar o serviço para atividades ilegais ou não autorizadas</li>
                <li>Enviar spam, mensagens em massa não solicitadas ou conteúdo ofensivo</li>
                <li>Violar direitos de propriedade intelectual de terceiros</li>
                <li>Tentar burlar medidas de segurança ou acessar áreas restritas</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Usar o serviço de maneira que prejudique outros usuários ou o sistema</li>
              </ul>

              <h2>7. Propriedade Intelectual</h2>
              <p>Todo o conteúdo, recursos e funcionalidades do minhAi são de propriedade exclusiva da plataforma e estão protegidos por leis de propriedade intelectual. Você não pode copiar, modificar, distribuir ou reproduzir qualquer parte do serviço sem autorização prévia.</p>

              <h2>8. Limitação de Responsabilidade</h2>
              <p>O minhAi é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.</p>
              <p><strong>O minhAi não se responsabiliza por:</strong></p>
              <ul>
                <li>Perda de dados ou interrupções no serviço</li>
                <li>Danos diretos ou indiretos resultantes do uso da plataforma</li>
                <li>Conteúdo gerado pelo assistente de IA</li>
                <li>Ações ou omissões de plataformas terceiras</li>
              </ul>

              <h2>9. Privacidade e Proteção de Dados</h2>
              <p>Levamos sua privacidade a sério. Nosso Aviso de Privacidade detalha como coletamos, usamos e protegemos seus dados.</p>
              <ul>
                <li>Coletamos apenas dados necessários para fornecer nossos serviços</li>
                <li>Não vendemos seus dados a terceiros</li>
                <li>Utilizamos criptografia para proteger informações sensíveis</li>
                <li>Você tem direito de acessar, corrigir ou excluir seus dados</li>
                <li>Estamos em conformidade com a LGPD (Lei Geral de Proteção de Dados)</li>
                <li><strong>Para mais detalhes, consulte nosso <Link href="/aviso" className="text-blue-500 underline">Aviso de Privacidade</Link></strong></li>
              </ul>

              <h2>10. Rescisão</h2>
              <p>Podemos suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, por violação destes Termos de Uso ou por qualquer outro motivo que consideremos apropriado.</p>
              <p>Você pode cancelar sua conta a qualquer momento através das configurações da plataforma.</p>

              <h2>11. Lei Aplicável</h2>
              <p>Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.</p>
              <ul>
                <li>Qualquer disputa será resolvida nos tribunais da Comarca de São Paulo, SP</li>
                <li>Estamos em conformidade com a LGPD e outras leis brasileiras aplicáveis</li>
                <li>Em caso de conflito entre idiomas, a versão em português prevalece</li>
              </ul>

              <h2>12. Alterações nos Termos</h2>
              <p>Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Notificaremos você sobre alterações significativas através de email ou aviso na plataforma. O uso continuado do minhAi após as alterações constitui aceitação dos novos termos.</p>

              <h2>13. Contato</h2>
              <div className={`p-4 rounded-lg space-y-2 ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
              }`}>
                <p>Para dúvidas sobre estes Termos de Uso, entre em contato:</p>
                <p><strong>Email Geral:</strong> contato@bigcorps.com.br</p>
                <p><strong>Email de Privacidade:</strong> contato@bigcorps.com.br</p>
                <p className="!mt-4"><strong>Endereço:</strong></p>
                <p className="!mt-1">
                  BigCorps Tecnologia LTA<br />
                  Rua Saguairu, 925<br />
                  São Paulo - SP - 02514-000<br />
                  Brasil
                </p>
              </div>

              <hr className="my-6" />
              <div className={`text-center text-sm ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                <p><strong>Ao usar o minhAi, você confirma que leu e concorda com estes Termos de Uso.</strong></p>
                <p className="mt-2">Este documento está em conformidade com a LGPD e as políticas da Meta e do Google.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/aviso">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Ver Aviso de Privacidade
            </button>
          </Link>
          <Link href="/exclusao">
            <button className={`w-full sm:w-auto px-6 py-3 rounded-lg transition-all font-medium ${
              theme === 'dark'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
            }`}>
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir Meus Dados
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
