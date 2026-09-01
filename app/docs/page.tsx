// app/docs/page.tsx — Server Component
import type { Metadata } from 'next';
import Link from 'next/link';
import { DOCS_SECTIONS } from './data';

export const metadata: Metadata = {
  title: 'Documentação — Como usar o minhAi | minhAi',
  description: 'Guias, tutoriais e referências para configurar e usar o minhAi. Do primeiro login à configuração avançada de funções, integrações e pagamentos.',
  alternates: { canonical: 'https://www.minhai.app/docs' },
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* Hero */}
      <section className="pt-24 pb-12 px-4 text-center max-w-3xl mx-auto">
        <span className="inline-block text-xs font-semibold px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 mb-4 uppercase tracking-widest">
          Documentação
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Como usar o minhAi
        </h1>
        <p className="text-white/55 text-lg mb-8">
          Guias práticos do primeiro login até integrações avançadas.
          Sem jargão técnico — direto ao ponto.
        </p>

        {/* Busca rápida — decorativa, pode evoluir para funcional */}
        <div className="max-w-lg mx-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-white/25 text-sm">Buscar na documentação...</span>
        </div>
      </section>

      {/* Seções */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DOCS_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 flex flex-col"
            >
              {/* Ícone + título da seção */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${section.iconBg}`}>
                  <span className="text-lg">{section.emoji}</span>
                </div>
                <h2 className={`text-sm font-bold ${section.textColor}`}>{section.titulo}</h2>
              </div>

              {/* Lista de artigos */}
              <ul className="flex flex-col gap-1.5 flex-1">
                {section.artigos.map((artigo) => (
                  <li key={artigo.slug}>
                    <Link
                      href={`/docs/${artigo.slug}`}
                      className="flex items-start gap-2 text-xs text-white/55 hover:text-white/90 transition-colors group"
                    >
                      <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-white/20 group-hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {artigo.titulo}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Link ver tudo */}
              <Link
                href={`/docs/${section.artigos[0].slug}`}
                className={`mt-4 text-xs font-semibold ${section.textColor} opacity-70 hover:opacity-100 transition-opacity`}
              >
                Ver guias →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA suporte */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <p className="text-white/35 text-sm mb-4">Não encontrou o que precisava?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://wa.me/5511926828418"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/10 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Suporte via WhatsApp
          </a>
          <Link
            href="/ia/suporte"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-blue-400/30 text-blue-400 text-sm font-semibold hover:bg-blue-400/10 transition-all"
          >
            Falar com o assistente
          </Link>
        </div>
      </section>
    </main>
  );
}
