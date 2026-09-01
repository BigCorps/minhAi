// app/docs/[slug]/page.tsx — Server Component
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDocsArtigoBySlug, getDocsSectionByArtigoSlug, DOCS_SECTIONS } from '../data';

export async function generateStaticParams() {
  return DOCS_SECTIONS.flatMap((s) => s.artigos.map((a) => ({ slug: a.slug })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const artigo = getDocsArtigoBySlug(slug);
  if (!artigo) return {};
  return {
    title: `${artigo.titulo} | Docs minhAi`,
    description: artigo.resumo,
    alternates: { canonical: `https://www.minhai.app/docs/${artigo.slug}` },
  };
}

export default async function DocsArtigoPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const artigo  = getDocsArtigoBySlug(slug);
  const section = getDocsSectionByArtigoSlug(slug);
  if (!artigo || !section) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: artigo.titulo,
    description: artigo.resumo,
    datePublished: artigo.publishedAt,
    dateModified: artigo.updatedAt,
    author: { '@type': 'Organization', name: 'BigCorps', url: 'https://bigcorps.com.br' },
    publisher: {
      '@type': 'Organization',
      name: 'minhAi',
      url: 'https://www.minhai.app',
      logo: { '@type': 'ImageObject', url: 'https://www.minhai.app/icons/icon-192x192.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.minhai.app/docs/${artigo.slug}`,
    },
    inLanguage: 'pt-BR',
    isPartOf: { '@id': 'https://www.minhai.app/#website' },
  };

  // Markdown simples → HTML
  const html = artigo.conteudo
    .split('\n')
    .map((line) => {
      if (line.startsWith('## '))  return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('**') && line.endsWith('**')) return `<strong>${line.slice(2, -2)}</strong>`;
      if (line.startsWith('- '))  return `<li>${line.slice(2)}</li>`;
      if (line.startsWith('| '))  return `<tr>${line.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
      if (line.startsWith('`') && line.endsWith('`')) return `<code>${line.slice(1, -1)}</code>`;
      if (line.trim() === '')     return '<br/>';
      return `<p>${line}</p>`;
    })
    .join('\n')
    .replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/(<tr>.*?<\/tr>\n?)+/gs, (m) => {
      const rows = m.split('</tr>').filter(Boolean);
      if (rows.length < 2) return m + '</tr>';
      const [head, ...body] = rows;
      const headHtml = head.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr>';
      return `<table><thead>${headHtml}</thead><tbody>${body.map(r => r + '</tr>').join('')}</tbody></table>`;
    });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-24 flex gap-8">

        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-24 self-start gap-6">
          {DOCS_SECTIONS.map((sec) => (
            <div key={sec.id}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${sec.textColor}`}>
                {sec.emoji} {sec.titulo}
              </p>
              <ul className="flex flex-col gap-1">
                {sec.artigos.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/docs/${a.slug}`}
                      className={`text-xs block py-1 transition-colors ${
                        a.slug === slug
                          ? 'text-white font-semibold'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {a.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/35 mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">Início</Link>
            <span>›</span>
            <Link href="/docs" className="hover:text-white/60 transition-colors">Docs</Link>
            <span>›</span>
            <span className={section.textColor}>{section.titulo}</span>
            <span>›</span>
            <span className="text-white/55">{artigo.titulo}</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full mb-3 inline-block ${section.iconBg} ${section.textColor}`}>
              {section.emoji} {section.titulo}
            </span>
            <h1 className="text-3xl font-bold mb-3">{artigo.titulo}</h1>
            <p className="text-white/55">{artigo.resumo}</p>
            <p className="text-white/25 text-xs mt-3">
              Atualizado em{' '}
              {new Date(artigo.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </header>

          {/* Artigo */}
          <article
            className={`
              prose prose-invert prose-base
              prose-headings:text-white prose-headings:font-bold
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-white/65 prose-p:leading-relaxed prose-p:my-2
              prose-li:text-white/65 prose-li:my-1
              prose-strong:text-white
              prose-code:text-lime-400 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-table:text-sm
              prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2 prose-td:text-white/65
              prose-th:border prose-th:border-white/15 prose-th:px-3 prose-th:py-2 prose-th:font-semibold
              prose-ul:my-3 prose-ul:pl-5
              max-w-none
            `}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Navegação entre artigos */}
          <div className="mt-12 pt-8 border-t border-white/8 flex items-center justify-between gap-4">
            <div>
              {(() => {
                const allArticles = DOCS_SECTIONS.flatMap((s) => s.artigos);
                const idx = allArticles.findIndex((a) => a.slug === slug);
                const prev = allArticles[idx - 1];
                if (!prev) return null;
                return (
                  <Link href={`/docs/${prev.slug}`} className="flex flex-col gap-1 text-white/40 hover:text-white/70 transition-colors">
                    <span className="text-[10px] uppercase tracking-widest">← Anterior</span>
                    <span className="text-sm font-medium">{prev.titulo}</span>
                  </Link>
                );
              })()}
            </div>
            <div className="text-right">
              {(() => {
                const allArticles = DOCS_SECTIONS.flatMap((s) => s.artigos);
                const idx = allArticles.findIndex((a) => a.slug === slug);
                const next = allArticles[idx + 1];
                if (!next) return null;
                return (
                  <Link href={`/docs/${next.slug}`} className="flex flex-col gap-1 text-white/40 hover:text-white/70 transition-colors items-end">
                    <span className="text-[10px] uppercase tracking-widest">Próximo →</span>
                    <span className="text-sm font-medium">{next.titulo}</span>
                  </Link>
                );
              })()}
            </div>
          </div>

          {/* Suporte */}
          <div className="mt-8 bg-white/[0.03] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold mb-1">Esta documentação foi útil?</p>
              <p className="text-white/40 text-xs">Se precisar de ajuda adicional, fale com nossa equipe.</p>
            </div>
            <a
              href="https://wa.me/5511926828418"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/10 transition-all whitespace-nowrap flex-shrink-0"
            >
              Falar com suporte
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}
