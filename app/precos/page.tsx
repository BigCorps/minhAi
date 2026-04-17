// app/precos/page.tsx — Server Component, sem 'use client'
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Planos e Preços',
  description:
    'Conheça os planos do minhAi. Comece gratuitamente e pague apenas por interação. Sem mensalidade obrigatória. Planos para autônomos, pequenas e grandes empresas.',
  alternates: {
    canonical: 'https://www.minhai.app/precos',
  },
  openGraph: {
    title: 'Planos e Preços — minhAi',
    description:
      'Comece de graça e escale conforme o uso. Veja todos os planos e funcionalidades do minhAi.',
    url: 'https://www.minhai.app/precos',
  },
};

// ─── Dados dos planos (estáticos — renderizados no servidor) ─────────────────
const PLANOS = [
  {
    id: 'gratis',
    nome: 'Gratuito',
    preco: 'R$ 0',
    periodicidade: 'para sempre',
    descricao: 'Ideal para testar o minhAi e criar seu primeiro assistente.',
    destaque: false,
    cta: 'Começar Grátis',
    ctaHref: '/login',
    recursos: [
      '1 assistente de IA',
      'Até 20 interações',
      'Funções básicas de atendimento',
      'Acesso ao dashboard',
      'Suporte via chat',
    ],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 'R$ 0,05',
    periodicidade: 'por interação',
    descricao: 'Para negócios que querem automatizar o atendimento de verdade.',
    destaque: true,
    cta: 'Assinar Agora',
    ctaHref: '/login',
    recursos: [
      'Assistentes ilimitados',
      'Interações ilimitadas (pay-per-use)',
      '+100 funções disponíveis',
      'WebApp personalizado com domínio próprio',
      'Integração WhatsApp e Instagram',
      'Cobranças e PIX automáticos',
      'Fila de atendimento inteligente',
      'Agendamento de consultas',
      'Totem e modo quiosque',
      'Suporte prioritário',
    ],
  },
  {
    id: 'consulting',
    nome: 'Consulting',
    preco: 'Sob consulta',
    periodicidade: '',
    descricao: 'Para empresas com alto volume e necessidades específicas.',
    destaque: false,
    cta: 'Falar com a Equipe',
    ctaHref: 'https://wa.me/5511987311425',
    recursos: [
      'Tudo do plano Profissional',
      'Onboarding dedicado',
      'Integrações personalizadas',
      'SLA garantido',
      'Gerente de conta exclusivo',
      'Treinamento da equipe',
    ],
  },
];

const FAQ_PRECOS = [
  {
    q: 'O que é uma "interação"?',
    a: 'Uma interação é cada vez que seu cliente envia uma mensagem ou realiza uma ação no assistente — como fazer uma pergunta, agendar um horário ou gerar uma cobrança. Você só paga quando há uso real.',
  },
  {
    q: 'Posso mudar de plano a qualquer momento?',
    a: 'Sim. Você pode fazer upgrade ou downgrade do seu plano diretamente pelo dashboard, sem burocracia e sem fidelidade mínima.',
  },
  {
    q: 'Há algum custo de configuração?',
    a: 'Não. A criação do assistente e a configuração das funções são gratuitas. Você só é cobrado quando seus clientes interagem com o assistente.',
  },
  {
    q: 'O plano gratuito expira?',
    a: 'Não. O plano gratuito é para sempre, você recarrega quando quiser. Ideal para testar e validar seu caso de uso antes de escalar.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────────────
export default function PrecosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Simples, transparente e{' '}
          <span className="text-blue-400">sem surpresas</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Comece gratuitamente. Pague apenas quando seus clientes interagirem.
          Sem mensalidade obrigatória, sem contrato de fidelidade.
        </p>
      </section>

      {/* ── Cards de planos ───────────────────────────────────────────────── */}
      <section
        className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6"
        aria-label="Planos disponíveis"
      >
        {PLANOS.map((plano) => (
          <article
            key={plano.id}
            className={`relative rounded-2xl p-8 flex flex-col border transition-all ${
              plano.destaque
                ? 'bg-blue-600/20 border-blue-500/60 shadow-xl shadow-blue-500/10 scale-105'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {plano.destaque && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                Mais Popular
              </span>
            )}

            <h2 className="text-xl font-bold mb-1">{plano.nome}</h2>
            <p className="text-white/50 text-sm mb-4">{plano.descricao}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold">{plano.preco}</span>
              {plano.periodicidade && (
                <span className="text-white/50 text-sm ml-2">{plano.periodicidade}</span>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1" aria-label={`Recursos do plano ${plano.nome}`}>
              {plano.recursos.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-white/80">
                  <svg className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {r}
                </li>
              ))}
            </ul>

            <Link
              href={plano.ctaHref}
              className={`block text-center py-3 rounded-full font-bold transition-all hover:scale-105 ${
                plano.destaque
                  ? 'bg-[#A4C61E] text-white hover:brightness-110'
                  : 'border border-white/20 text-white hover:bg-white/10'
              }`}
            >
              {plano.cta}
            </Link>
          </article>
        ))}
      </section>

      {/* ── Comparativo rápido (ajuda crawlers a entender o produto) ─────── */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">
          Por que escolher o minhAi?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icone: '⚡', titulo: 'Rápido de configurar', texto: 'Seu assistente funcionando em menos de 5 minutos, sem precisar de programação.' },
            { icone: '💸', titulo: 'Pague só pelo uso', texto: 'Sem mensalidade fixa. Você paga a partir de R$ 0,05 por interação real com seu cliente.' },
            { icone: '🎨', titulo: '100% customizável', texto: 'Adapte o assistente ao seu negócio: nome, personalidade, funções e visual próprio.' },
          ].map(({ icone, titulo, texto }) => (
            <div key={titulo} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-3xl mb-3" aria-hidden="true">{icone}</div>
              <h3 className="font-bold mb-2">{titulo}</h3>
              <p className="text-white/55 text-sm">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pb-24" aria-label="Perguntas frequentes sobre preços">
        <h2 className="text-2xl font-bold text-center mb-8">Dúvidas frequentes</h2>
        <div className="space-y-4">
          {FAQ_PRECOS.map(({ q, a }) => (
            <details
              key={q}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 group cursor-pointer"
            >
              <summary className="font-semibold text-white list-none flex justify-between items-center">
                {q}
                <svg className="w-5 h-5 text-white/40 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────── */}
      <section className="text-center pb-24 px-4">
        <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
        <p className="text-white/55 mb-8 max-w-xl mx-auto">
          Crie sua conta grátis agora e configure seu primeiro assistente em minutos.
          Sem cartão de crédito necessário.
        </p>
        <Link
          href="/login"
          className="inline-block px-10 py-4 bg-[#A4C61E] text-white rounded-full font-bold text-lg hover:brightness-110 hover:scale-105 transition-all shadow-lg"
        >
          Começar Gratuitamente
        </Link>
      </section>

      {/* ── JSON-LD específico desta página ───────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'PriceSpecification',
            name: 'Planos minhAi',
            description: 'Planos de assinatura para o assistente de IA minhAi',
            url: 'https://www.minhai.app/precos',
            offers: PLANOS.map((p) => ({
              '@type': 'Offer',
              name: p.nome,
              description: p.descricao,
              price: p.id === 'gratis' ? '0' : p.id === 'profissional' ? '0.05' : undefined,
              priceCurrency: 'BRL',
              availability: 'https://schema.org/InStock',
            })),
          }),
        }}
      />
    </main>
  );
}
