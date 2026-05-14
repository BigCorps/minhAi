// app/blog/[slug]/page.tsx — Server Component
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBlogPostBySlug, BLOG_POSTS } from '../data';

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: { canonical: `https://www.minhai.app/blog/${post.slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: `https://www.minhai.app/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const outros = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titulo,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'BigCorps',
      url: 'https://bigcorps.com.br',
    },
    publisher: {
      '@type': 'Organization',
      name: 'minhAi',
      url: 'https://www.minhai.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.minhai.app/icons/icon-192x192.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.minhai.app/blog/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
    inLanguage: 'pt-BR',
    isPartOf: { '@id': 'https://www.minhai.app/#website' },
  };

  // Converte markdown simples para HTML
  const html = post.conteudo
    .split('\n')
    .map((line) => {
      if (line.startsWith('## '))  return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('**') && line.endsWith('**')) return `<strong>${line.slice(2, -2)}</strong>`;
      if (line.startsWith('- '))  return `<li>${line.slice(2)}</li>`;
      if (line.startsWith('| '))  return `<tr>${line.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
      if (line.trim() === '')     return '<br/>';
      return `<p>${line}</p>`;
    })
    .join('\n')
    // Agrupa <li> em <ul>
    .replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    // Agrupa <tr> em <table>
    .replace(/(<tr>.*?<\/tr>\n?)+/gs, (m) => {
      const rows = m.split('</tr>').filter(Boolean);
      if (rows.length < 2) return m + '</tr>';
      const [head, ...body] = rows;
      const headHtml = head.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr>';
      const bodyHtml = body.map((r) => r + '</tr>').join('');
      return `<table><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table>`;
    });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-4">
        <nav className="flex items-center gap-2 text-xs text-white/35">
          <Link href="/" className="hover:text-white/60 transition-colors">Início</Link>
          <span>›</span>
          <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
          <span>›</span>
          <span className="text-white/55">{post.titulo}</span>
        </nav>
      </div>

      {/* Header do artigo */}
      <header className="max-w-3xl mx-auto px-4 pb-10">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block ${post.tagColor}`}>
          {post.tag}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">{post.titulo}</h1>
        <p className="text-white/55 text-lg mb-6">{post.resumo}</p>
        <div className="flex items-center gap-4 text-xs text-white/30">
          <span>
            Publicado em{' '}
            {new Date(post.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <span>·</span>
          <span>{post.readingTime} min de leitura</span>
          <span>·</span>
          <span>BigCorps / minhAi</span>
        </div>
      </header>

      {/* Conteúdo */}
      <article
        className={`
          max-w-3xl mx-auto px-4 pb-16
          prose prose-invert prose-lg
          prose-headings:text-white prose-headings:font-bold
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-white/65 prose-p:leading-relaxed prose-p:my-3
          prose-li:text-white/65 prose-li:my-1
          prose-strong:text-white
          prose-table:text-sm prose-table:border-collapse
          prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2 prose-td:text-white/65
          prose-th:border prose-th:border-white/15 prose-th:px-3 prose-th:py-2 prose-th:text-white/80 prose-th:font-semibold
          prose-ul:my-4 prose-ul:pl-6
          max-w-none
        `}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-3">Pronto para começar?</h2>
          <p className="text-white/55 mb-6 text-sm max-w-lg mx-auto">
            Crie sua conta grátis e configure seu assistente de IA em minutos. Sem cartão de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-[#A4C61E] text-white rounded-full font-bold text-sm hover:brightness-110 hover:scale-105 transition-all shadow-lg"
            >
              Criar Minha IA Grátis
            </Link>
            <Link
              href="/ia/suporte"
              className="px-6 py-3 border-2 border-blue-400/50 text-blue-400 rounded-full font-bold text-sm hover:bg-blue-400/10 hover:scale-105 transition-all"
            >
              Ver demonstração ao vivo
            </Link>
          </div>
        </div>
      </section>

      {/* Artigos relacionados */}
      {outros.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-24">
          <h2 className="text-xl font-semibold mb-6 text-white/70">Leia também</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {outros.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] transition-all"
              >
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mb-3 inline-block ${p.tagColor}`}>
                  {p.tag}
                </span>
                <h3 className="text-sm font-bold leading-snug group-hover:text-blue-400 transition-colors">
                  {p.titulo}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
