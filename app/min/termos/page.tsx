'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MinTermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="container mx-auto py-6 md:py-12 w-full max-w-4xl px-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-all hover:bg-black/5 text-black"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Termos de Uso
          </h1>
          <div className="w-10" />
        </div>

        <div className="mb-6 p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 shrink-0 mt-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900">
                  Sua privacidade é importante
                </p>
                <p className="text-sm text-blue-700">
                  Leia nossa política de privacidade para entender como protegemos seus dados
                </p>
              </div>
            </div>
            <Link href="/min/aviso">
              <button className="shrink-0 px-4 py-2 rounded-lg border transition-all text-sm font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                Ver Aviso de Privacidade
              </button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl shadow-xl p-6 md:p-8 bg-white">
          <div className="h-[70vh] overflow-y-auto pr-4">
            <div className="prose max-w-none text-gray-800">
              <p className="text-sm mb-4 text-gray-600">
                <strong>Última atualização:</strong> 29 de junho de 2026
              </p>

              <p>Bem-vindo ao Min.IA. Ao utilizar nossos serviços, você concorda com estes Termos de Uso. Leia-os atentamente.</p>

              <h2>1. Aceitação dos Termos</h2>
              <p>Ao acessar e usar o Min.IA, você aceita e concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este serviço.</p>

              <h2>2. Descrição do Serviço</h2>
              <p>O Min.IA é uma versão compacta e pessoal do assistente de inteligência artificial da minhAi, desenvolvido pela BigCorps Tecnologia LTDA. O Min.IA dá acesso direto, por chat, a mais de 100 funções de IA já configuradas na sua conta minhAi.</p>
              <p>Nossos serviços incluem, entre outros:</p>
              <ul>
                <li>Conversa por texto com um assistente de IA conectado ao seu negócio</li>
                <li>Execução de funções como pagamentos via PIX, consultas (CEP, CNPJ, CPF, placas), agendamentos no Google Calendar, geração de QR Code e código de barras</li>
                <li>Ferramentas de imagem e documento, como edição, remoção de fundo, conversão de arquivos e leitura por câmera (QR Code, código de barras, OCR), quando você concede a permissão do navegador</li>
                <li>Funcionalidades auxiliadas por inteligência artificial de terceiros para interpretar pedidos e gerar respostas</li>
              </ul>

              <h2>3. Conta de Usuário e Vínculo com a minhAi</h2>
              <p>O Min.IA utiliza a mesma conta, autenticação e saldo de créditos da plataforma minhAi. Para usar o Min.IA você deve criar ou já possuir uma conta minhAi, diretamente ou através de login com Google ou Facebook. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram em sua conta.</p>

              <h2>4. Login com Google e Facebook</h2>
              <p>Ao optar por fazer login com sua conta Google ou Facebook, você nos autoriza a acessar apenas as informações básicas de identificação (nome, email e foto de perfil) necessárias para criar e autenticar sua conta. Não acessamos outros dados dessas contas, salvo quando você conecta explicitamente integrações específicas (como Google Calendar) dentro do seu painel da minhAi.</p>

              <h2>5. Créditos e Cobrança</h2>
              <p>O Min.IA é cobrado pelo mesmo modelo de créditos da minhAi Smart: cada execução de função consome a quantidade de créditos indicada para aquela função, debitada do saldo compartilhado entre Min.IA e minhAi. Novos cadastros podem receber créditos gratuitos para teste, conforme indicado na própria interface.</p>

              <h2>6. Permissões de Câmera, Microfone e Localização</h2>
              <p>Algumas funções do Min.IA (leitura de QR Code, extração de texto de imagem, clima e tempo, traçar rota, entre outras) podem solicitar acesso à câmera, microfone ou localização do seu dispositivo. Essas permissões são sempre solicitadas pelo próprio navegador, função por função, e você pode negá-las ou revogá-las a qualquer momento nas configurações do seu dispositivo ou navegador.</p>

              <h2>7. Funcionalidades de Inteligência Artificial</h2>
              <p>O Min.IA utiliza modelos de inteligência artificial de terceiros (como OpenAI e Groq) para interpretar seus pedidos e gerar respostas. Ao utilizar essas funcionalidades, você reconhece que:</p>
              <ul>
                <li>As respostas geradas por IA podem conter imprecisões</li>
                <li>É sua responsabilidade revisar informações sensíveis (valores, dados de terceiros, conteúdo fiscal) antes de utilizá-las</li>
                <li>O Min.IA não se responsabiliza por decisões tomadas exclusivamente com base em respostas geradas automaticamente</li>
              </ul>

              <h2>8. Conduta do Usuário</h2>
              <p>Ao usar o Min.IA, você concorda em NÃO:</p>
              <ul>
                <li>Usar o serviço para atividades ilegais ou não autorizadas</li>
                <li>Tentar burlar medidas de segurança, limites de crédito ou acessar dados de outras empresas/contas</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Usar o serviço de maneira que prejudique outros usuários, parceiros de pagamento ou o sistema</li>
              </ul>

              <h2>9. Propriedade Intelectual</h2>
              <p>Todo o conteúdo, recursos e funcionalidades do Min.IA são de propriedade exclusiva da plataforma e estão protegidos por leis de propriedade intelectual. Você não pode copiar, modificar, distribuir ou reproduzir qualquer parte do serviço sem autorização prévia. Esta cláusula não se aplica a arquivos, textos ou imagens que você mesmo enviar para processamento, cuja titularidade permanece sua.</p>

              <h2>10. Limitação de Responsabilidade</h2>
              <p>O Min.IA é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.</p>
              <p><strong>O Min.IA não se responsabiliza por:</strong></p>
              <ul>
                <li>Perda de dados ou interrupções no serviço</li>
                <li>Danos diretos ou indiretos resultantes do uso da plataforma</li>
                <li>Erros em pagamentos, consultas ou agendamentos decorrentes de informações incorretas fornecidas pelo usuário</li>
                <li>Conteúdo gerado por funcionalidades de inteligência artificial</li>
              </ul>

              <h2>11. Privacidade e Proteção de Dados</h2>
              <p>Levamos sua privacidade a sério. Nosso Aviso de Privacidade detalha como coletamos, usamos e protegemos seus dados.</p>
              <ul>
                <li>Coletamos apenas dados necessários para fornecer nossos serviços</li>
                <li>Não vendemos seus dados a terceiros</li>
                <li>Utilizamos criptografia para proteger informações sensíveis</li>
                <li>Você tem direito de acessar, corrigir ou excluir seus dados</li>
                <li>Estamos em conformidade com a LGPD (Lei Geral de Proteção de Dados)</li>
                <li><strong>Para mais detalhes, consulte nosso <Link href="/min/aviso" className="text-blue-500 underline">Aviso de Privacidade</Link></strong></li>
              </ul>

              <h2>12. Rescisão</h2>
              <p>Podemos suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, por violação destes Termos de Uso ou por qualquer outro motivo que consideremos apropriado.</p>
              <p>Você pode cancelar sua conta a qualquer momento através das configurações da plataforma.</p>

              <h2>13. Lei Aplicável</h2>
              <p>Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.</p>
              <ul>
                <li>Qualquer disputa será resolvida nos tribunais da Comarca de São Paulo, SP</li>
                <li>Estamos em conformidade com a LGPD e outras leis brasileiras aplicáveis</li>
                <li>Em caso de conflito entre idiomas, a versão em português prevalece</li>
              </ul>

              <h2>14. Alterações nos Termos</h2>
              <p>Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Notificaremos você sobre alterações significativas através de email ou aviso na plataforma. O uso continuado do Min.IA após as alterações constitui aceitação dos novos termos.</p>

              <h2>15. Contato</h2>
              <div className="p-4 rounded-lg space-y-2 bg-gray-50">
                <p>Para dúvidas sobre estes Termos de Uso, entre em contato:</p>
                <p><strong>Email Geral:</strong> contato@bigcorps.com.br</p>
                <p><strong>Email de Privacidade:</strong> contato@bigcorps.com.br</p>
                <p className="!mt-4"><strong>Endereço:</strong></p>
                <p className="!mt-1">
                  BigCorps Tecnologia LTDA<br />
                  Rua Saguairu, 925<br />
                  São Paulo - SP - 02514-000<br />
                  Brasil
                </p>
              </div>

              <hr className="my-6" />
              <div className="text-center text-sm text-gray-600">
                <p><strong>Ao usar o Min.IA, você confirma que leu e concorda com estes Termos de Uso.</strong></p>
                <p className="mt-2">Este documento está em conformidade com a LGPD.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/min/aviso">
            <button className="w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
              Ver Aviso de Privacidade
            </button>
          </Link>
          <Link href="/min/exclusao">
            <button className="w-full sm:w-auto px-6 py-3 rounded-lg transition-all font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
              Excluir Meus Dados
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
