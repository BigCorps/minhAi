// app/precos/page.tsx — Server Component, sem 'use client'
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  Zap,
  Users,
  Globe,
  Headphones,
  ShieldCheck,
  Store,
  CreditCard,
  Smartphone,
  Building2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Planos e Preços',
  description:
    'Conheça os planos do minhAi Smart e minhAi Vendas. Planos mensais, pacotes de créditos e modelo por comissão para autônomos, pequenas e grandes empresas.',
  alternates: {
    canonical: 'https://www.minhai.app/precos',
  },
  openGraph: {
    title: 'Planos e Preços — minhAi',
    description:
      'minhAi Smart: planos mensais ou pacotes de créditos avulsos. minhAi Vendas: gratuito, pague apenas 10% por venda confirmada.',
    url: 'https://www.minhai.app/precos',
  },
};

// ─── minhAi Smart — Planos mensais ──────────────────────────────────────────
const PLANOS_SMART = [
  {
    id: 'top',
    nome: 'Top',
    preco: 'R$ 49,90',
    periodicidade: '/mês',
    creditos: '50 créditos/mês',
    descricao: 'Para negócios que estão começando a automatizar o atendimento.',
    destaque: false,
    recursos: [
      'Acesso ao painel de controle',
      'Integrações Google e Meta',
      'Módulo de Produção',
      '50 créditos mensais inclusos',
      'Suporte via chat',
    ],
  },
  {
    id: 'consulting',
    nome: 'Consulting',
    preco: 'R$ 299,90',
    periodicidade: '/mês',
    creditos: '300 créditos/mês',
    descricao: 'Para negócios que querem automatizar o atendimento de verdade.',
    destaque: true,
    recursos: [
      'Tudo do plano Top',
      'Integrações Google, Meta e Produção',
      'WebApp com domínio próprio',
      'Consultoria incluída',
      '300 créditos mensais inclusos',
      'Suporte prioritário',
    ],
  },
  {
    id: 'full',
    nome: 'Full',
    preco: 'Sob consulta',
    periodicidade: '',
    creditos: 'Créditos ilimitados',
    descricao: 'Solução completa personalizada para empresas com alto volume.',
    destaque: false,
    recursos: [
      'Créditos ilimitados',
      'Landing Page personalizada',
      'Implementação incluída',
      'White Label',
      'Domínio e subdomínios próprios',
      'Configuração completa',
      'Suporte 24 horas',
    ],
  },
];

// ─── minhAi Smart — Pacotes de créditos avulsos ──────────────────────────────
const PACOTES_CREDITOS = [
  {
    id: 'starter',
    nome: 'Starter',
    preco: 'R$ 29,90',
    interacoes: '200 interações',
    custoPor: 'R$ 0,15 cada',
    destaque: false,
  },
  {
    id: 'professional',
    nome: 'Professional',
    preco: 'R$ 99,90',
    interacoes: '1.000 interações',
    custoPor: 'R$ 0,10 cada',
    destaque: true,
  },
  {
    id: 'business',
    nome: 'Business',
    preco: 'R$ 249,90',
    interacoes: '3.600 interações',
    custoPor: 'R$ 0,07 cada',
    destaque: false,
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 'R$ 499,90',
    interacoes: '10.000 interações',
    custoPor: 'R$ 0,05 cada',
    destaque: false,
  },
];

// ─── minhAi Vendas — Formas de recebimento ───────────────────────────────────
const FORMAS_RECEBIMENTO = [
  {
    id: 'pix',
    nome: 'PIX',
    operadora: 'Banco Inter',
    taxa: '10% no saque',
    icone: Zap,
  },
  {
    id: 'nfc',
    nome: 'NFC + Link',
    operadora: 'InfinitePay',
    taxa: 'Taxa da operadora',
    icone: CreditCard,
  },
  {
    id: 'tef',
    nome: 'TEF',
    operadora: 'Mercado Pago',
    taxa: 'Taxa da operadora',
    icone: Smartphone,
  },
];

// ─── minhAi Vendas — Funções incluídas ───────────────────────────────────────
const FUNCOES_VENDAS = [
  'Modo Venda', 'Ver Produtos', 'Fazer Pedido', 'Registrar Venda',
  'Cardápio', 'PIX', 'NFC Débito', 'NFC Crédito',
  'Link de Pagamento', 'TEF Débito', 'TEF Crédito', 'Agendar',
  'Ver Agenda', 'Perguntas Gerais', 'Nossa Marca', 'Minha Conta',
  'Cadastrar Produto', 'Sobre o Sistema',
];

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_PRECOS = [
  {
    q: 'O que é uma interação ou crédito?',
    a: 'Uma interação é cada vez que seu cliente envia uma mensagem ou realiza uma ação no assistente — como fazer uma pergunta, agendar um horário ou gerar uma cobrança. No minhAi Smart, cada interação consome um crédito.',
  },
  {
    q: 'Qual a diferença entre plano mensal e pacote de créditos?',
    a: 'O plano mensal (Top ou Consulting) libera funcionalidades avançadas e já inclui créditos mensais. Os pacotes de créditos avulsos são para quem não precisa das funcionalidades extras e quer apenas pagar pelo uso.',
  },
  {
    q: 'Os créditos do plano mensal acumulam?',
    a: 'Os créditos inclusos no plano mensal são renovados a cada ciclo. Pacotes avulsos adquiridos separadamente não expiram.',
  },
  {
    q: 'Como funciona o minhAi Vendas?',
    a: 'O minhAi Vendas é gratuito para o lojista. Não há mensalidade nem créditos — você paga apenas 10% sobre cada venda confirmada, descontado automaticamente no saque via Banco Inter. Taxas de InfinitePay e Mercado Pago são cobradas diretamente por cada operadora.',
  },
  {
    q: 'Posso usar o minhAi Smart e o minhAi Vendas juntos?',
    a: 'São duas versões diferentes do minhAi, cada uma com foco distinto. O Smart é voltado para atendimento, automação e informações. O Vendas é focado em vender, cobrar e registrar pedidos.',
  },
];

// ─── Componente ──────────────────────────────────────────────────────────────
export default function PrecosPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-4 text-center">
        <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
          Planos e Preços
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Escolha o modelo certo{' '}
          <span className="text-blue-400">para o seu negócio</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          O minhAi tem duas versões: <strong className="text-white">minhAi Smart</strong> para atendimento e automação,
          e <strong className="text-white">minhAi Vendas</strong> para vender, cobrar e registrar pedidos — sem mensalidade.
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          minhAi Smart
      ════════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 pb-6" aria-labelledby="smart-heading">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-blue-400" aria-hidden="true" />
          <h2 id="smart-heading" className="text-2xl font-bold">minhAi Smart</h2>
        </div>
        <p className="text-white/55 text-sm mb-2">
          Assistente de IA para atendimento, automação e informações. Escolha entre um plano mensal (com funcionalidades
          avançadas + créditos inclusos) ou compre pacotes de créditos avulsos sem mensalidade.
        </p>
        <div className="inline-block bg-blue-500/15 border border-blue-500/30 rounded-full px-4 py-1 text-xs text-blue-300 mb-8">
          20 créditos grátis para testar à vontade
        </div>

        {/* Planos mensais */}
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          Planos Mensais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANOS_SMART.map((plano) => (
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
                  Recomendado
                </span>
              )}

              <h4 className="text-xl font-bold mb-1">{plano.nome}</h4>
              <p className="text-white/50 text-sm mb-4">{plano.descricao}</p>

              <div className="mb-1">
                <span className="text-4xl font-bold">{plano.preco}</span>
                {plano.periodicidade && (
                  <span className="text-white/50 text-sm ml-1">{plano.periodicidade}</span>
                )}
              </div>
              <p className="text-blue-300 text-xs font-semibold mb-6 flex items-center gap-1">
                <Zap className="w-3 h-3" aria-hidden="true" />
                {plano.creditos}
              </p>

              <ul className="space-y-3 flex-1" aria-label={`Recursos do plano ${plano.nome}`}>
                {plano.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Pacotes de créditos avulsos */}
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
          Pacotes de Créditos
        </h3>
        <p className="text-white/50 text-sm mb-4">
          Sem mensalidade. Compre créditos avulsos e use nas funções básicas do minhAi Smart.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
          {PACOTES_CREDITOS.map((pacote) => (
            <article
              key={pacote.id}
              className={`relative rounded-2xl p-6 flex flex-col border transition-all ${
                pacote.destaque
                  ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {pacote.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#A4C61E] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Mais Popular
                </span>
              )}
              <h4 className="font-bold mb-3">{pacote.nome}</h4>
              <span className="text-3xl font-bold mb-1">{pacote.preco}</span>
              <p className="text-white/70 text-sm font-semibold">{pacote.interacoes}</p>
              <p className="text-white/40 text-xs">{pacote.custoPor}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          minhAi Vendas
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="max-w-6xl mx-auto px-4 pb-24"
        aria-labelledby="vendas-heading"
      >
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-6 h-6 text-[#A4C61E]" aria-hidden="true" />
          <h2 id="vendas-heading" className="text-2xl font-bold">minhAi Vendas</h2>
        </div>
        <p className="text-white/55 text-sm mb-8">
          Versão focada em vender, cobrar e registrar pedidos. Gratuito para o lojista —
          sem mensalidade, sem créditos, sem surpresa. Você só paga quando vender.
        </p>

        {/* Card principal */}
        <div className="rounded-2xl border border-[#A4C61E]/40 bg-[#A4C61E]/10 p-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h3 className="text-3xl font-bold text-[#A4C61E] mb-1">Gratuito</h3>
              <p className="text-white/60 text-sm max-w-md">
                Sem mensalidade, sem créditos, sem surpresa. Você só paga quando vender.
                Tenha uma IA focada em atender, vender e cobrar 24 horas!
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 text-center min-w-[160px]">
              <p className="text-4xl font-bold text-[#A4C61E]">10%</p>
              <p className="text-white/60 text-sm mt-1">por venda confirmada</p>
              <p className="text-white/35 text-xs">descontado no saque</p>
            </div>
          </div>
        </div>

        {/* Formas de recebimento */}
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          Formas de Recebimento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {FORMAS_RECEBIMENTO.map(({ id, nome, operadora, taxa, icone: Icone }) => (
            <div
              key={id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 text-center"
            >
              <Icone className="w-6 h-6 mx-auto mb-2 text-[#A4C61E]" aria-hidden="true" />
              <p className="font-bold">{nome}</p>
              <p className="text-[#A4C61E] text-sm">{operadora}</p>
              <p className="text-white/40 text-xs mt-1">{taxa}</p>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs mb-10">
          * Taxas de InfinitePay e Mercado Pago são cobradas diretamente por cada operadora, separadas da comissão do minhAi.
        </p>

        {/* Funções incluídas */}
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          18 Funções Incluídas — Ative ou Desative no Painel
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FUNCOES_VENDAS.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-white/70">
              <Check className="w-4 h-4 text-[#A4C61E] flex-shrink-0" aria-hidden="true" />
              {f}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
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

      {/* ── JSON-LD ───────────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Planos e Preços — minhAi',
            url: 'https://www.minhai.app/precos',
            description: 'Planos do minhAi Smart e minhAi Vendas',
            offers: [
              ...PLANOS_SMART.map((p) => ({
                '@type': 'Offer',
                name: `minhAi Smart — ${p.nome}`,
                description: p.descricao,
                price: p.id === 'top' ? '49.90' : p.id === 'consulting' ? '299.90' : undefined,
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
              })),
              ...PACOTES_CREDITOS.map((p) => ({
                '@type': 'Offer',
                name: `minhAi Smart Créditos — ${p.nome}`,
                description: `${p.interacoes} (${p.custoPor})`,
                price: p.preco.replace('R$ ', '').replace(',', '.'),
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
              })),
              {
                '@type': 'Offer',
                name: 'minhAi Vendas',
                description: 'Gratuito para o lojista. 10% por venda confirmada, descontado no saque.',
                price: '0',
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
              },
            ],
          }),
        }}
      />
    </main>
  );
}