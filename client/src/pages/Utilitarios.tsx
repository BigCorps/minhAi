import { Brain, Database, FileText, BarChart3, Image, Trash2, Camera, Copy, Zap } from 'lucide-react';

/**
 * Utilitários Page - BigCorps
 * Design: Modernismo Corporativo
 * - Ferramentas gratuitas
 * - APIs parceiras
 * - Solução de ChatBot com IA
 */

export default function Utilitarios() {
  const ferramentas = [
    {
      icon: Brain,
      title: 'NOSSA IA',
      description: 'Agentes de IA avançados para automação',
      color: 'from-[#FF6B35] to-[#FF8C5A]',
    },
    {
      icon: Database,
      title: 'CENTRAL DE CONSULTAS',
      description: 'Acesso a dados e informações em tempo real',
      color: 'from-[#2C3E50] to-[#34495E]',
    },
    {
      icon: FileText,
      title: 'CONVERSOR DE ARQUIVOS',
      description: 'Converta entre múltiplos formatos de arquivo',
      color: 'from-[#00CC44] to-[#33DD66]',
    },
    {
      icon: BarChart3,
      title: 'GERADOR DE ORÇAMENTOS',
      description: 'Crie orçamentos profissionais automaticamente',
      color: 'from-[#FF6B35] to-[#FF8C5A]',
    },
    {
      icon: Image,
      title: 'EDITOR DE IMAGENS',
      description: 'Edite e customize suas imagens online',
      color: 'from-[#2C3E50] to-[#34495E]',
    },
    {
      icon: Trash2,
      title: 'REMOVEDOR DE FUNDO',
      description: 'Remova fundos de imagens com IA',
      color: 'from-[#00CC44] to-[#33DD66]',
    },
    {
      icon: Camera,
      title: 'FOTOS PARA DOCUMENTOS',
      description: 'Prepare fotos para documentos oficiais',
      color: 'from-[#FF6B35] to-[#FF8C5A]',
    },
    {
      icon: Copy,
      title: 'DUPLICADOR DE IMAGENS',
      description: 'Crie variações de suas imagens',
      color: 'from-[#2C3E50] to-[#34495E]',
    },
  ];

  const apis = [
    { name: 'OpenAI', icon: '🤖', description: 'Modelos de IA avançados' },
    { name: 'Inter', icon: '🏦', description: 'Integração bancária' },
    { name: 'Infinitepay', icon: '💳', description: 'Processamento de pagamentos' },
    { name: 'Serasa Experian', icon: '📊', description: 'Análise de crédito' },
    { name: 'Google', icon: '🔍', description: 'Serviços Google' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-white to-gray-50">
        <div className="container">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-[#2C3E50] mb-6">
              Ferramentas e Soluções
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Criamos ferramentas de fácil utilização e soluções práticas para você e sua empresa poder gerar mais resultados
            </p>
          </div>
        </div>
      </section>

      {/* Ferramentas Gratuitas Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-6">
              Ferramentas Gratuitas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Conheça algumas soluções gratuitas que desenvolvemos para facilitar seu dia a dia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ferramentas.map((ferramenta, idx) => {
              const Icon = ferramenta.icon;
              return (
                <div
                  key={idx}
                  className="group cursor-pointer"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${idx * 0.08}s both`,
                  }}
                >
                  <div className={`bg-gradient-to-br ${ferramenta.color} rounded-2xl p-8 text-white h-full transition-all duration-300 hover:shadow-xl hover:scale-105`}>
                    <Icon className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-bold mb-2">
                      {ferramenta.title}
                    </h3>
                    <p className="text-sm text-white text-opacity-90">
                      {ferramenta.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* APIs Section */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-6">
              Integrações com APIs Premium
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Temos soluções com as melhores APIs de Bancos e Sistemas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {apis.map((api, idx) => (
              <div
                key={idx}
                className="card-modern text-center"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                }}
              >
                <div className="text-5xl mb-4">{api.icon}</div>
                <h3 className="text-xl font-bold text-[#2C3E50] mb-2">
                  {api.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {api.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision Making Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-8">
                Decisões Inteligentes com Dados
              </h2>

              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Já pensou que toda a decisão que você toma hoje, pode impactar seu futuro?
              </p>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                É por isso que aliando uma gama de multiprodutos, combinamos dados + tecnologia para você tomar decisões como devem ser: analisando o passado e presente, mas antevendo o futuro.
              </p>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Com um portfólio de soluções de inteligência analítica, conectamos pessoas e empresas, antecipamos o futuro e transformamos a incerteza do risco em oportunidades para todos.
              </p>

              <a
                href="https://wa.me/5511987311425"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Conheça Mais
              </a>
            </div>

            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-24 h-24 text-[#FF6B35] mx-auto mb-4 opacity-50" />
                <p className="text-gray-600 font-semibold">Análise de Dados em Tempo Real</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ChatBot IA Solution Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block mb-6 px-4 py-2 rounded-full bg-[#FF6B35] bg-opacity-20 border border-[#FF6B35] border-opacity-40">
                <span className="text-[#FF6B35] font-semibold text-sm">🤖 Solução Integrada</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                ChatBot IA com Pagamentos Integrados
              </h2>
              <p className="text-lg text-gray-300 mb-12">
                A única solução do mercado que integra ChatBot IA com pagamentos de forma completa e inteligente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {[
                {
                  title: 'Gere Pagamentos Automatizados',
                  description: 'Crie fluxos de pagamento automáticos através do chatbot',
                },
                {
                  title: 'Atendimento Eficiente e Personalizado',
                  description: 'Respostas inteligentes adaptadas ao perfil do cliente',
                },
                {
                  title: 'Disponibilidade 24/7',
                  description: 'Seu chatbot funciona sem parar, todos os dias',
                },
                {
                  title: 'Otimização de Custos',
                  description: 'Reduza custos com atendimento automatizado',
                },
                {
                  title: 'Interações Baseadas em Dados',
                  description: 'Decisões inteligentes baseadas em histórico',
                },
                {
                  title: 'Geração de Informações Valiosas',
                  description: 'Extraia insights de cada interação',
                },
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-gray-300 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a
                href="https://wa.me/5511987311425"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Solicitar Demonstração
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Transforme seu Negócio com Tecnologia
          </h2>
          <p className="text-lg text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Descubra como nossas ferramentas e soluções podem revolucionar a forma como você trabalha
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://wa.me/5511987311425"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold bg-white text-[#FF6B35] hover:bg-gray-100 transition-colors"
            >
              Fale Conosco
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
