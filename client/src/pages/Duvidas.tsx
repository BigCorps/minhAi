import { useState } from 'react';
import { ChevronDown, QrCode, BarChart3, Mail } from 'lucide-react';

/**
 * Dúvidas Page - BigCorps
 * Design: Modernismo Corporativo
 * - FAQ com accordion
 * - Informações técnicas sobre integração
 * - Seções de Pix, Relatórios e Email
 */

export default function Duvidas() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const faqs = [
    {
      icon: QrCode,
      title: 'Integração de Pagamento',
      description: 'Como funciona a integração com QR Code e Pix?',
      content: 'Seu cliente já o QRcode e o pix copia e cola, e você recebe a confirmação na hora. Também integrado com Boleto com Pix e/ou pagamento no cartão de Crédito.',
    },
    {
      icon: BarChart3,
      title: 'Relatórios de Vendas',
      description: 'Tenha um relatório completo com as vendas detalhadas',
      content: 'Tenha um relatório completo com as vendas detalhadas, com hora e informações necessárias para concluir sua venda.',
    },
    {
      icon: Mail,
      title: 'Email de Confirmação',
      description: 'Receba notificações automáticas de vendas',
      content: 'Receba um email toda vez que uma venda for confirmada, já com os dados do cliente, valores, confirmação de pagamento e comprovante.',
    },
  ];

  const technicalDetails = [
    {
      title: 'Pix',
      items: [
        'Integração com Pix Copia e Cola',
        'Confirmação em tempo real',
        'Suporte a QR Code dinâmico',
        'Webhook para notificações',
      ],
    },
    {
      title: 'Relatórios',
      items: [
        'Exportação em CSV/PDF',
        'Filtros por data e período',
        'Análise de vendas por produto',
        'Gráficos de desempenho',
      ],
    },
    {
      title: 'Email',
      items: [
        'Notificações automáticas',
        'Comprovante de pagamento',
        'Dados do cliente inclusos',
        'Customização de template',
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-white to-gray-50">
        <div className="container">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6">
              Dúvidas Frequentes
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Encontre respostas sobre nossas soluções de pagamento, relatórios e integração
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container max-w-4xl">
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const Icon = faq.icon;
              const isOpen = openAccordion === idx;

              return (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#FF6B35] transition-colors"
                >
                  <button
                    onClick={() => setOpenAccordion(isOpen ? null : idx)}
                    className="w-full p-6 flex items-start gap-4 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center flex-shrink-0 mt-1">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#2C3E50]">
                        {faq.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {faq.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-6 h-6 text-[#FF6B35] flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-700 leading-relaxed">
                        {faq.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Details Section */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-6">
              Detalhes Técnicos
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Conheça as especificações e recursos de cada solução
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {technicalDetails.map((detail, idx) => (
              <div
                key={idx}
                className="card-modern"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                }}
              >
                <h3 className="text-2xl font-bold text-[#2C3E50] mb-6">
                  {detail.title}
                </h3>
                <ul className="space-y-3">
                  {detail.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#00CC44] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Examples Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-8">
                Exemplos de Integração
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Nossas soluções se integram facilmente com os principais sistemas de pagamento e ferramentas de gestão.
              </p>

              <div className="space-y-4">
                {[
                  'PDVs e Terminais de Pagamento',
                  'Cardápios Digitais',
                  'Aplicativos Mobile',
                  'Plataformas de E-commerce',
                  'Sistemas de Gestão',
                  'Chatbots com IA',
                ].map((integration, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <span className="text-gray-700 font-medium">{integration}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#2C3E50] to-[#34495E] rounded-3xl p-8 md:p-12 text-white">
              <h3 className="text-2xl font-bold mb-6">Fluxo de Integração</h3>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Configuração', desc: 'Configure suas credenciais' },
                  { step: '2', title: 'Integração', desc: 'Conecte com suas APIs' },
                  { step: '3', title: 'Testes', desc: 'Teste em ambiente sandbox' },
                  { step: '4', title: 'Deploy', desc: 'Ative em produção' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0 font-bold">
                      {item.step}
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-white text-opacity-80">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ainda tem dúvidas?
          </h2>
          <p className="text-lg text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Nossa equipe está pronta para ajudar você com qualquer pergunta sobre nossas soluções
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://wa.me/5511987311425"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-white text-[#FF6B35] hover:bg-gray-100 transition-colors"
            >
              Fale Conosco no WhatsApp
            </a>
            <a
              href="/contato"
              className="px-6 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-[#FF6B35] transition-colors"
            >
              Enviar Mensagem
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
