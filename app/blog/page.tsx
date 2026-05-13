// app/blog/page.tsx — listagem de artigos
import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from './data';

export const metadata: Metadata = {
  title: 'Blog — Automação de atendimento e IA para empresas | minhAi',
  description: 'Artigos sobre automação de atendimento, IA para WhatsApp, PIX automático, totem de autoatendimento e como usar o minhAi para vender e atender mais.',
  alternates: { canonical: 'https://www.minhai.app/blog' },
};

export default function BlogPage() {
  const destaque = BLOG_POSTS[0];
  const demais   = BLOG_POSTS.slice(1);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* Hero */}
      <section className="pt-24 pb-12 px-4 text-center max-w-3xl mx-auto">
        <span className="inline-block text-xs font-semibold px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 mb-4 uppercase tracking-widest">
          Blog minhAi
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          IA para empresas brasileiras
        </h1>
        <p className="text-white/55 text-lg">
          Guias práticos sobre automação de atendimento, PIX automático, WhatsApp com IA e como vender mais sem contratar mais.
        </p>
      </section>

      {/* Artigo destaque */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <Link href={`/blog/${destaque.slug}`} className="group block bg-blue-500/5 border border-blue-500/15 rounded-2xl p-8 hover:bg-blue-500/8 transition-all">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block ${destaque.tagColor}`}>
            {destaque.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 group-hover:text-blue-400 transition-colors">
            {destaque.titulo}
          </h2>
          <p className="text-white/55 text-base mb-4 max-w-2xl">{destaque.resumo}</p>
          <span className="text-blue-400 text-sm font-semibold">Ler artigo →</span>
        </Link>
      </section>

      {/* Grade de artigos */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {demais.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/15 transition-all"
            >
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full mb-3 self-start ${post.tagColor}`}>
                {post.tag}
              </span>
              <h2 className="text-base font-bold mb-2 group-hover:text-blue-400 transition-colors leading-snug">
                {post.titulo}
              </h2>
              <p className="text-white/45 text-xs leading-relaxed flex-1">{post.resumo}</p>
              <span className="text-blue-400/70 text-xs font-semibold mt-4">Ler artigo →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}