'use client';

// components/landing/DepoimentosFaqSection.tsx
// Mescla o que antes eram duas páginas (Depoimentos e FAQ) em uma só —
// última página do grupo "Informações". Lado a lado no desktop,
// empilhado (um acima do outro) no mobile.

interface DepoimentosFaqSectionProps {
  theme?: 'dark' | 'light';
  /** Mostra apenas os títulos das perguntas, sem abrir/fechar nem texto
   * de resposta. Padrão: true — vale pra landing ao vivo e pro PDF. */
  faqTitlesOnly?: boolean;
}

const DEPOIMENTOS = [
  {
    nome: 'Dra. Ana Oliveira',
    cargo: 'Clínica VidaSaúde',
    resultado: '70% menos tempo em atendimento repetitivo',
    foto: '/perfil1.jpg',
    textoCurto: 'Antes, minha recepcionista passava metade do dia confirmando consultas. Hoje a minhAi faz tudo automaticamente — agenda, confirma, manda lembrete e cobra via PIX.',
    color: 'blue' as const,
  },
  {
    nome: 'Carlos Mendes',
    cargo: 'Hamburgueria do Carlos',
    resultado: 'Atende 3x mais pedidos no horário de pico',
    foto: '/perfil2.jpg',
    textoCurto: 'Colocamos a minhAi no totem e no WhatsApp do delivery. O assistente recebe o pedido, manda para a cozinha e já cobra o PIX. Zero caos nas sextas à noite.',
    color: 'green' as const,
  },
  {
    nome: 'Dr. Roberto Faria',
    cargo: 'Faria & Associados',
    resultado: 'Atendimento profissional sem contratar ninguém',
    foto: '/perfil3.jpg',
    textoCurto: 'Sou advogado autônomo e não tinha como contratar recepcionista. A minhAi agenda reuniões, responde dúvidas e digitaliza contratos com a câmera.',
    color: 'blue' as const,
  },
];

const STARS = Array.from({ length: 5 });

const depoColorMap = {
  blue: {
    dark:  { border: 'border-blue-500/15',  cardBg: 'bg-blue-500/5' },
    light: { border: 'border-blue-200',     cardBg: 'bg-blue-50/60' },
  },
  green: {
    dark:  { border: 'border-green-500/15', cardBg: 'bg-green-500/5' },
    light: { border: 'border-green-200',    cardBg: 'bg-green-50/60' },
  },
};

const FAQS = [
  {
    pergunta: 'Preciso saber programar para usar a minhAi?',
    resposta:
      'Não. A minhAi foi feito para ser configurado por qualquer pessoa, sem nenhum código. Você acessa o dashboard, escolhe as funções que quer ativar, escreve a personalidade do assistente e publica. Todo o processo leva menos de 5 minutos.',
  },
  {
    pergunta: 'A minhAi vai substituir minha equipe?',
    resposta:
      'Não — ele potencializa. O assistente resolve o que é repetitivo (responder dúvidas, agendar, cobrar, enviar links) para que sua equipe foque no que exige atenção humana. Pense nele como um novo colaborador que nunca falta e nunca pede aumento.',
  },
  {
    pergunta: 'A minhAi funciona com WhatsApp?',
    resposta:
      'Sim. A minhAi integra com a API oficial do WhatsApp Business. Seu número continua o mesmo e o assistente passa a responder automaticamente às mensagens — com a personalidade e o conhecimento que você configurou.',
  },
  {
    pergunta: 'É seguro? Meus dados estão protegidos?',
    resposta:
      'Sim. A minhAi é 100% compatível com a LGPD. Os dados ficam em servidores seguros com criptografia de ponta a ponta, isolados por empresa. Nenhum dado do seu negócio é compartilhado com outros clientes.',
  },
  {
    pergunta: 'Quanto tempo leva para configurar?',
    resposta:
      'A maioria dos clientes configura o primeiro assistente em menos de 5 minutos. Para assistentes mais completos — com cardápio, produtos, integração com WhatsApp e PIX — você pode sempre ajustar e implementar mais coisas quando quiser.',
  },
  {
    pergunta: 'Posso testar antes de pagar?',
    resposta:
      'Sim. Você pode escolher entre a Versão Vendas, que apenas cobra comissão por vendas confirmadas, ou começar na Versão Smart, que inclui 20 créditos para testar à vontade, sem nenhum compromisso. Não é necessário cartão de crédito para começar.',
  },
  {
    pergunta: 'Como a minhAi nasceu?',
    resposta:
      'Ithiel Almeida tem uma empresa de design e serviços gráficos há mais de 20 anos e precisava de uma IA para ajudar no atendimento do balcão e no WhatsApp. Não encontrou nada no mercado que chegasse perto do que precisava — então decidiu desenvolver a própria solução, há cerca de 2 anos. A minhAi nasceu dessa necessidade real, com a crença de que a mesma tecnologia pode ajudar outros empresários autônomos, MEIs e pequenas e médias empresas a atender melhor, vender mais e entrar no mundo da Inteligência Artificial sem precisar de conhecimento técnico ou saber programar.',
  },
  {
    pergunta: 'a minhAi funciona para qualquer tipo de negócio?',
    resposta:
      'Sim. Temos clientes em mais de 15 segmentos — clínicas, restaurantes, academias, advocacia, e-commerce, lojas físicas, imobiliárias, franquias e muito mais. Se o seu negócio atende clientes, a minhAi tem funções para automatizar.',
  },
];

// JSON-LD Schema FAQPage para SEO e GEO (citação por IAs)
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': 'https://www.minhai.app/#faq-landing',
  mainEntity: FAQS.map(({ pergunta, resposta }) => ({
    '@type': 'Question',
    name: pergunta,
    acceptedAnswer: {
      '@type': 'Answer',
      text: resposta,
    },
  })),
};

export default function DepoimentosFaqSection({ theme = 'dark', faqTitlesOnly = true }: DepoimentosFaqSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[100dvh] overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30'
        }
      `}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[50%] h-[50%] rounded-full blur-[130px] ${isDark ? 'bg-blue-500/4' : 'bg-blue-100/50'}`} />
      </div>

      {/* Mobile: coluna (empilhado) — Desktop: linha (lado a lado) */}
      <div
        className={`
          relative z-10 w-full max-w-6xl mx-auto
          flex flex-col md:flex-row
          px-4 sm:px-6 lg:px-8
          pt-24 pb-16 sm:pt-28 sm:pb-20 md:py-16
          gap-6 md:gap-8
        `}
      >

        {/* ── Depoimentos ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-center mb-2 md:mb-3">
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
              O que dizem os clientes
            </p>
            <h2 className={`font-bold leading-tight text-lg sm:text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Negócios reais,{' '}
              <span className={isDark ? 'text-green-400' : 'text-green-600'}>resultados reais</span>
            </h2>
          </div>

          <div className="flex flex-col gap-2 md:gap-3">
            {DEPOIMENTOS.map((d) => {
              const c = depoColorMap[d.color][isDark ? 'dark' : 'light'];
              return (
                <div
                  key={d.nome}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${c.border} ${c.cardBg}`}
                >
                  <div
                    role="img"
                    aria-label={d.nome}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundImage: `url(${d.foto})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{d.nome}</span>
                        <span className={`block sm:inline text-[10px] sm:ml-1.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{d.cargo}</span>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                        {STARS.map((_, si) => (
                          <svg key={si} className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className={`text-[11px] sm:text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      "{d.textoCurto}"
                    </p>
                    <p className={`text-[10px] mt-1 font-medium ${isDark ? 'text-green-400/80' : 'text-green-600'}`}>
                      ↑ {d.resultado}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divisor — horizontal no mobile (empilhado), vertical no desktop (lado a lado) */}
        <div className={`w-full h-px md:w-px md:h-auto md:self-stretch flex-shrink-0 ${isDark ? 'bg-white/8' : 'bg-gray-200'}`} />

        {/* ── FAQ ───────────────────────────────────────────────
            details com o mesmo atributo `name` — o navegador garante
            nativamente que só um fica aberto por vez, sem precisar de
            estado em React. Usado só quando faqTitlesOnly=false. */}
        <div
          className="flex-1 min-w-0 flex flex-col"
          itemScope
          itemType="https://schema.org/FAQPage"
        >
          <div className="text-center mb-2 md:mb-3">
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
              Dúvidas frequentes
            </p>
            <h2 className={`font-bold leading-tight text-lg sm:text-xl md:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Respostas rápidas para{' '}
              <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>começar agora</span>
            </h2>
          </div>

          <div className="flex flex-col gap-2 md:gap-3">
            {faqTitlesOnly ? (
              FAQS.map(({ pergunta }, i) => (
                <div
                  key={i}
                  itemScope
                  itemType="https://schema.org/Question"
                  className={`rounded-xl border px-3 py-2.5 ${
                    isDark
                      ? 'bg-white/[0.02] border-white/8'
                      : 'bg-white border-gray-100 shadow-sm'
                  }`}
                >
                  <h3
                    itemProp="name"
                    className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {pergunta}
                  </h3>
                </div>
              ))
            ) : (
              FAQS.map(({ pergunta, resposta }, i) => (
                <details
                  key={i}
                  name="depoimentos-faq-accordion"
                  itemScope
                  itemType="https://schema.org/Question"
                  className={`
                    group rounded-xl border cursor-pointer transition-all duration-200
                    ${isDark
                      ? 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04]'
                      : 'bg-white border-gray-100 hover:border-blue-200 shadow-sm'
                    }
                  `}
                >
                  <summary className="flex items-center justify-between gap-2 list-none px-3 py-2 sm:py-2.5">
                    <h3
                      itemProp="name"
                      className={`font-semibold text-xs sm:text-sm pr-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {pergunta}
                    </h3>
                    <svg
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-open:rotate-180 ${isDark ? 'text-white/30' : 'text-gray-400'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                    <p
                      itemProp="text"
                      className={`px-3 pb-2 sm:pb-2.5 text-[11px] sm:text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}
                    >
                      {resposta}
                    </p>
                  </div>
                </details>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}