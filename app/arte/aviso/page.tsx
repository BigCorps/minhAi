'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
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
            Aviso de Privacidade
          </h1>
          <div className="w-10" />
        </div>

        <div className="mb-6 p-4 rounded-lg border bg-amber-50 border-amber-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 shrink-0 mt-1 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-900">
                  Deseja excluir seus dados?
                </p>
                <p className="text-sm text-amber-700">
                  Você pode solicitar a exclusão completa de todos os seus dados a qualquer momento
                </p>
              </div>
            </div>
            <Link href="/arte/exclusao">
              <button className="shrink-0 px-4 py-2 rounded-lg transition-all text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                Excluir Meus Dados
              </button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl shadow-xl p-6 md:p-8 bg-white">
          <div className="h-[70vh] overflow-y-auto pr-4">
            <div className="prose max-w-none text-gray-800">
              <p className="text-sm mb-4 text-gray-600">
                <strong>Última atualização:</strong> 19 de junho de 2026
              </p>

              <p>Este Aviso de Privacidade descreve como o <strong>ArteFinal.app</strong> (desenvolvido pela <strong>BigCorps Tecnologia LTDA</strong>) coleta, usa, armazena e protege suas informações pessoais. Levamos sua privacidade muito a sério e estamos comprometidos em proteger seus dados.</p>

              <h2>1. Informações que Coletamos</h2>
              <p>Coletamos diferentes tipos de informações para fornecer e melhorar nossos serviços:</p>
              <ul>
                <li><strong>Informações de Conta:</strong> Nome, email, senha (criptografada) e foto de perfil</li>
                <li><strong>Arquivos de Arte e Imagens:</strong> Imagens, artes e arquivos gráficos que você envia para processamento, ajuste, conversão ou montagem em folhas de impressão</li>
                <li><strong>Informações de Uso:</strong> Dados sobre como você utiliza a plataforma, incluindo páginas visitadas e ações realizadas</li>
                <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de navegador, dispositivo utilizado e sistema operacional</li>
              </ul>

              <h2>2. Como Usamos suas Informações</h2>
              <p>Utilizamos suas informações para os seguintes propósitos:</p>
              <ul>
                <li>Fornecer, operar e manter as ferramentas de processamento, ajuste e preparação de arquivos para impressão</li>
                <li>Processar e armazenar temporariamente as imagens e arquivos que você envia, exclusivamente para gerar o resultado solicitado por você (ex: duplicação de imagem, conversão de formato, montagem em folha de recorte)</li>
                <li>Gerenciar sua conta e autenticação</li>
                <li>Melhorar a qualidade e o desempenho da plataforma</li>
              </ul>

              <h2>3. Login com Google e Facebook</h2>
              <p>O ArteFinal.app oferece a opção de login utilizando sua conta Google ou Facebook. Nesse caso, coletamos apenas as informações básicas de identificação fornecidas por esses serviços:</p>
              <ul>
                <li><strong>Nome</strong></li>
                <li><strong>Endereço de email</strong></li>
                <li><strong>Foto de perfil</strong> (quando disponibilizada pelo provedor)</li>
              </ul>
              <p>Não solicitamos nem acessamos outros dados das suas contas Google ou Facebook (como arquivos do Google Drive, agenda, ou páginas do Facebook). O login social é utilizado exclusivamente para fins de autenticação e criação de conta.</p>

              <h2>4. Funcionalidades de Inteligência Artificial</h2>
              <p>Algumas funcionalidades do ArteFinal.app podem utilizar serviços de inteligência artificial de terceiros (como Groq ou OpenAI) para auxiliar na escolha de funções dentro da plataforma ou, futuramente, em recursos de melhoria de imagem. Quando isso ocorrer:</p>
              <ul>
                <li>Apenas os dados estritamente necessários para a funcionalidade solicitada são compartilhados com o provedor de IA</li>
                <li>Não utilizamos esses dados para fins de publicidade ou treinamento de modelos de terceiros sem seu conhecimento</li>
                <li>Você será informado na própria interface quando uma funcionalidade utilizar processamento por IA</li>
              </ul>

              <h2>5. Armazenamento e Retenção de Arquivos</h2>
              <p>Os arquivos de arte e imagens enviados são armazenados de forma segura e mantidos apenas pelo tempo necessário para a prestação do serviço solicitado, podendo ser removidos automaticamente após um período de inatividade ou a seu pedido.</p>

              <h2>6. Proteção de Dados</h2>
              <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:</p>
              <ul>
                <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso</li>
                <li>Armazenamento seguro de senhas usando hashing bcrypt</li>
                <li>Acesso restrito a dados pessoais apenas para pessoal autorizado</li>
              </ul>

              <h2>7. Exclusão de Dados</h2>
              <div className="p-4 rounded-lg border my-4 bg-blue-50 border-blue-200">
                <h3 className="!mt-0">Como Excluir Seus Dados</h3>
                <p>Você tem o direito de solicitar a exclusão de todos os seus dados pessoais a qualquer momento:</p>

                <h4>Opção 1: Através da Plataforma</h4>
                <ol>
                  <li>Faça login na sua conta no <strong>ArteFinal.app</strong></li>
                  <li>Acesse a <Link href="/arte/exclusao" className="underline font-semibold text-blue-600">página de Exclusão de Dados</Link></li>
                  <li>Confirme sua solicitação de exclusão permanente</li>
                </ol>

                <h4>Opção 2: Por Email</h4>
                <p>Envie um email para <strong>contato@bigcorps.com.br</strong> com o assunto "Solicitação de Exclusão de Dados - LGPD".</p>
              </div>

              <h2>8. Seus Direitos (LGPD)</h2>
              <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direitos de acesso, correção, exclusão e portabilidade de seus dados. Para exercê-los, entre em contato através do email oficial de suporte.</p>

              <h2>9. Contato e Responsabilidade Legal</h2>
              <div className="p-4 rounded-lg space-y-2 bg-gray-50">
                <p>O <strong>ArteFinal.app</strong> é um produto desenvolvido e operado por:</p>
                <p><strong>BigCorps Tecnologia LTDA</strong></p>
                <p><strong>Email de Privacidade:</strong> contato@bigcorps.com.br</p>
                <p><strong>Endereço:</strong> Rua Saguairu, 925 - São Paulo - SP - 02514-000 - Brasil</p>
              </div>

              <hr className="my-6" />
              <div className="text-center text-sm text-gray-600">
                <p><strong>Ao usar o ArteFinal.app, você confirma que leu e compreende este Aviso de Privacidade.</strong></p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/arte/exclusao">
            <button className="w-full sm:w-auto px-6 py-3 rounded-lg transition-all font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
              Excluir Meus Dados
            </button>
          </Link>
          <a href="mailto:contato@bigcorps.com.br">
            <button className="w-full sm:w-auto px-6 py-3 rounded-lg border transition-all font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
              Contato de Privacidade
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
