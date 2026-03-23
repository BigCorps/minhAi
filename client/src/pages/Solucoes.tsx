import { CheckCircle, Smartphone, CreditCard, BarChart3, Zap } from 'lucide-react';

/**
 * Soluções Page - BigCorps
 * Design: Modernismo Corporativo
 * - Apresentação de soluções principais
 * - Vantagens para empresa e clientes
 * - Integração de pagamento
 */

export default function Solucoes() {
  const empresaVantagens = [
    'Receba a cada transação',
    'Melhore a experiência de compra',
    'Venda mais',
    'Aprimore o fluxo de caixa',
    'Integre facilmente',
    'Ofereça segurança reforçada',
    'Integre a outras APIs',
    'Receba na hora via Pix',
    'Disponível para Vendas no cartão e Boleto',
  ];

  const clienteVantagens = [
    'Agilidade na experiência',
    'Aumento da taxa de fidelização de clientes',
    'Atendimento sem filas',
    'Reconhecimento de Áudio',
    'Menos Burocracia',
    'Personalização de cores e logotipos',
    'Menos taxas e com menos custos',
    'Tanto para compras presenciais ou virtuais',
    'Pagamento por aproximação via NFC',
  ];

  const integradores = [
    { name: 'ifood', logo: '🍔' },
    { name: 'isaac', logo: '📱' },
    { name: 'toro', logo: '⚙️' },
    { name: 'engie', logo: '⚡' },
    { name: 'neilpatel', logo: '📊' },
    { name: 'feedz', logo: '🎯' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-white to-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6">
              Soluções Inovadoras
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mais de 3000 empresas já automatizaram seus processos. Conheça nossas soluções de pagamento e integração.
            </p>
          </div>

          {/* Clientes */}
          <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-100">
            <p className="text-center text-gray-600 mb-8">Empresas que confiam em nós:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
              {integradores.map((empresa, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{empresa.logo}</div>
                    <div className="text-sm font-semibold text-gray-700">{empresa.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Solution Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-block mb-6 px-4 py-2 rounded-full bg-[#FF6B35] bg-opacity-10 border border-[#FF6B35] border-opacity-20">
                <span className="text-[#FF6B35] font-semibold text-sm">💳 Pagamento NFC</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-8">
                Pagamento via NFC Integrado
              </h2>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Nossa solução pode ser integrada em soluções com NFC como PDVs, Totens, Tablets, Celulares, Cardápios Digitais e até QRcodes. Já recebendo pagamento via Pix e Cartões de Débito e Crédito.
              </p>

              <div className="space-y-4 mb-12">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00CC44] flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#2C3E50] mb-1">Integração Fácil</h4>
                    <p className="text-gray-600">Conecte em minutos com suas ferramentas existentes</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00CC44] flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#2C3E50] mb-1">Segurança Reforçada</h4>
                    <p className="text-gray-600">Padrões de segurança internacionais</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00CC44] flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#2C3E50] mb-1">Receba Instantaneamente</h4>
                    <p className="text-gray-600">Pagamentos confirmados em tempo real via Pix</p>
                  </div>
                </div>
              </div>

              <a
                href="https://wa.me/5511987311425"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Solicitar Acesso
              </a>
            </div>

            {/* Right Visual */}
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] rounded-3xl p-8 md:p-12 text-white">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Múltiplos Dispositivos</div>
                    <div className="text-sm text-white text-opacity-80">PDVs, Tablets, Celulares</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Múltiplos Métodos</div>
                    <div className="text-sm text-white text-opacity-80">Pix, Cartão, Boleto</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Relatórios Completos</div>
                    <div className="text-sm text-white text-opacity-80">Análise detalhada de vendas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens Section */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Para Empresa */}
            <div>
              <h3 className="text-3xl font-bold text-[#2C3E50] mb-8 flex items-center gap-3">
                <Zap className="w-8 h-8 text-[#FF6B35]" />
                Vantagens para sua Empresa
              </h3>
              <div className="space-y-4">
                {empresaVantagens.map((vantagem, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700">{vantagem}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Para Clientes */}
            <div>
              <h3 className="text-3xl font-bold text-[#2C3E50] mb-8 flex items-center gap-3">
                <Zap className="w-8 h-8 text-[#00CC44]" />
                Vantagens para seus Clientes
              </h3>
              <div className="space-y-4">
                {clienteVantagens.map((vantagem, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#00CC44] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700">{vantagem}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco e descubra como nossas soluções podem aumentar suas vendas e melhorar a experiência dos clientes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://wa.me/5511987311425"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              Fale Conosco no WhatsApp
            </a>
            <a
              href="/contato"
              className="px-6 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-[#2C3E50] transition-all duration-300"
            >
              Enviar Mensagem
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
