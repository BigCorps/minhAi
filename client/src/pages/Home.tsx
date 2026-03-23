import { ArrowRight, Zap, Users, Smartphone, Briefcase } from 'lucide-react';
import { Link } from 'wouter';

/**
 * Home Page - BigCorps
 * Design: Modernismo Corporativo com Gradientes Dinâmicos
 * - Hero section com tipografia escalada
 * - Seções com layout assimétrico
 * - Animações suaves ao scroll
 */

export default function Home() {
  const features = [
    {
      icon: Zap,
      title: 'Automação com IA',
      description: 'Agentes de IA que automatizam seus processos de negócio',
    },
    {
      icon: Users,
      title: 'Atendimento Humanizado',
      description: 'Conversas personalizadas que convertem mais leads qualificados',
    },
    {
      icon: Smartphone,
      title: 'Integração Fácil',
      description: 'Conecte com suas ferramentas favoritas em minutos',
    },
    {
      icon: Briefcase,
      title: 'Soluções Empresariais',
      description: 'Escalável para empresas de qualquer tamanho',
    },
  ];

  const stats = [
    { number: '3000+', label: 'Empresas Automatizadas' },
    { number: '24/7', label: 'Disponibilidade' },
    { number: '99.9%', label: 'Uptime' },
    { number: '50%', label: 'Redução de Custos' },
  ];

  const ctas = [
    { label: 'eAi App', href: '#' },
    { label: 'Aprimus', href: '#' },
    { label: 'Pagamentos', href: '#' },
    { label: 'Aplicativos', href: '#' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 md:pt-32 pb-20 md:pb-40 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#2C3E50] opacity-5 rounded-full blur-3xl -z-10" />

        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="animate-slideInLeft">
              <div className="inline-block mb-6 px-4 py-2 rounded-full bg-[#FF6B35] bg-opacity-10 border border-[#FF6B35] border-opacity-20">
                <span className="text-[#FF6B35] font-semibold text-sm">✨ Inovação em IA</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#2C3E50] mb-6 leading-tight">
                Automações com <span className="gradient-text">Agentes de IA</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                Descubra todos os recursos que você e sua empresa ganham com a inovação em IA. Transforme seus processos e aumente sua produtividade.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/solucoes">
                  <a className="btn-primary inline-flex items-center justify-center gap-2 text-center">
                    Conheça Nossas Soluções
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Link>
                <a
                  href="https://wa.me/5511987311425"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-center"
                >
                  Fale Conosco
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, idx) => (
                  <div key={idx} className="border-l-2 border-[#FF6B35] pl-4">
                    <div className="text-2xl md:text-3xl font-bold text-[#2C3E50]">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Visual */}
            <div className="animate-slideInRight hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] rounded-3xl opacity-10 blur-2xl" />
                <div className="relative bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] rounded-3xl p-8 md:p-12 text-white">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold">Múltiplos Agentes</div>
                        <div className="text-sm text-white text-opacity-80">Trabalhe com vários agentes simultaneamente</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold">Automação Inteligente</div>
                        <div className="text-sm text-white text-opacity-80">Processos que aprendem e melhoram</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold">Integração Total</div>
                        <div className="text-sm text-white text-opacity-80">Conecte com suas ferramentas favoritas</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-6">
              Por que escolher BigCorps?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Soluções completas para transformar seu negócio com tecnologia de IA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="card-modern group"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#2C3E50] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35] opacity-10 rounded-full blur-3xl -z-10" />

        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Explore Nossas Soluções
          </h2>
          <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
            Conheça todas as ferramentas e aplicativos que desenvolvemos para sua empresa
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ctas.map((cta, idx) => (
              <a
                key={idx}
                href={cta.href}
                className="p-4 rounded-lg bg-white bg-opacity-10 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300 font-semibold"
              >
                {cta.label}
              </a>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/solucoes">
              <a className="btn-primary inline-flex items-center justify-center gap-2">
                Ver Todas as Soluções
                <ArrowRight className="w-5 h-5" />
              </a>
            </Link>
            <a
              href="https://wa.me/5511987311425"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-[#2C3E50] transition-all duration-300"
            >
              Solicitar Acesso
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
