// app/para/[slug]/page.tsx — Server Component
// Uma única rota gera TODAS as páginas de nicho automaticamente
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getNichoPageBySlug, NICHO_PAGES } from './data';

// ─── SSG: pré-gera todas as páginas em build time ────────────────────────────
export async function generateStaticParams() {
  return NICHO_PAGES.map((p) => ({ slug: p.slug }));
}

// ─── Metadata dinâmica por página ────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = getNichoPageBySlug(slug);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: { canonical: `https://www.minhai.app/para/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `https://www.minhai.app/para/${page.slug}`,
      type: 'website',
    },
  };
}

// ─── Cor por destaque (mapeamento seguro para Tailwind estático) ──────────────
const COR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-300' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/30',  badge: 'bg-green-500/20 text-green-300' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300' },
};

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function NichoPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = getNichoPageBySlug(slug);
  if (!page) notFound();

  const cor = COR_MAP[page.corDestaque] ?? COR_MAP.blue;

  // JSON-LD específico para a página de nicho
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `https://www.minhai.app/para/${page.slug}`,
        name: page.metaTitle,
        description: page.metaDescription,
        url: `https://www.minhai.app/para/${page.slug}`,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': 'https://www.minhai.app/#website' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className={`pt-24 pb-16 px-4 text-center ${cor.bg}`}>
        <div className="max-w-3xl mx-auto">
          {/* Badge de segmento */}
          <span className={`inline-block text-sm font-semibold px-4 py-1 rounded-full mb-6 ${cor.badge}`}>
            {page.emoji} {page.segmento}
          </span>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            {page.titulo}
          </h1>

          <p className="text-white/65 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            {page.subtitulo}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-[#A4C61E] text-white rounded-full font-bold text-base hover:brightness-110 hover:scale-105 transition-all shadow-lg"
            >
              {page.cta}
            </Link>
            <Link
              href="/ia/suporte"
              className={`px-8 py-4 border-2 rounded-full font-bold text-base hover:scale-105 transition-all ${cor.border} ${cor.text} hover:bg-white/5`}
            >
              Ver demonstração
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problema → Solução ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
          <h2 className="text-lg font-bold text-red-400 mb-4">😩 O problema de hoje</h2>
          <p className="text-white/70 leading-relaxed">{page.problema}</p>
        </div>
        <div className={`${cor.bg} border ${cor.border} rounded-2xl p-8`}>
          <h2 className={`text-lg font-bold mb-4 ${cor.text}`}>✅ Como o minhAi resolve</h2>
          <p className="text-white/70 leading-relaxed">{page.solucao}</p>
        </div>
      </section>

      {/* ── Funções incluídas ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          O que está incluído
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {page.funcoes.map((f) => (
            <li
              key={f}
              className={`flex items-center gap-3 p-4 rounded-xl border ${cor.bg} ${cor.border}`}
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${cor.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white/85 text-sm font-medium">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Casos de uso reais ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          Quem usa e como usa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {page.casos.map(({ titulo, descricao }) => (
            <article
              key={titulo}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <h3 className={`font-bold mb-3 ${cor.text}`}>{titulo}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{descricao}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Dúvidas frequentes</h2>
        <div className="space-y-4">
          {page.faq.map(({ q, a }) => (
            <details
              key={q}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 group cursor-pointer"
            >
              <summary className="font-semibold list-none flex justify-between items-center">
                {q}
                <svg className={`w-5 h-5 text-white/40 group-open:rotate-180 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-white/60 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Links internos para outras páginas de nicho ──────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold text-center text-white/50 mb-6">
          Veja também
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {NICHO_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
            <Link
              key={p.slug}
              href={`/para/${p.slug}`}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              {p.emoji} {p.titulo}
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────────── */}
      <section className="text-center pb-24 px-4">
        <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
        <p className="text-white/55 mb-8 max-w-xl mx-auto">
          Crie sua conta grátis e configure seu assistente em minutos. Sem cartão de crédito.
        </p>
        <Link
          href="/login"
          className="inline-block px-10 py-4 bg-[#A4C61E] text-white rounded-full font-bold text-lg hover:brightness-110 hover:scale-105 transition-all shadow-lg"
        >
          {page.cta}
        </Link>
      </section>

      {/* ── JSON-LD ──────────────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
