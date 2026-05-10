// app/components/landing/FAQSection.tsx — Server Component
// Inserir APÓS Depoimentos e ANTES de Preços (ou entre Preços e Contato)

interface FAQSectionProps {
  theme?: 'dark' | 'light';
}

const FAQS = [
  {
    pergunta: 'Preciso saber programar para usar o minhAi?',
    resposta:
      'Não. O minhAi foi feito para ser configurado por qualquer pessoa, sem nenhum código. Você acessa o dashboard, escolhe as funções que quer ativar, escreve a personalidade do assistente e publica. Todo o processo leva menos de 5 minutos.',
  },
  {
    pergunta: 'O minhAi vai substituir minha equipe?',
    resposta:
      'Não — ele potencializa. O assistente resolve o que é repetitivo (responder dúvidas, agendar, cobrar, enviar links) para que sua equipe foque no que exige atenção humana. Pense nele como um novo colaborador que nunca falta e nunca pede aumento.',
  },
  {
    pergunta: 'O minhAi funciona com WhatsApp?',
    resposta:
      'Sim. O minhAi integra com a API oficial do WhatsApp Business. Seu número continua o mesmo e o assistente passa a responder automaticamente às mensagens — com a personalidade e o conhecimento que você configurou.',
  },
  {
    pergunta: 'É seguro? Meus dados estão protegidos?',
    resposta:
      'Sim. O minhAi é 100% compatível com a LGPD. Os dados ficam em servidores seguros com criptografia de ponta a ponta, isolados por empresa. Nenhum dado do seu negócio é compartilhado com outros clientes.',
  },
  {
    pergunta: 'Quanto tempo leva para configurar?',
    resposta:
      'A maioria dos clientes configura o primeiro assistente em menos de 5 minutos. Para assistentes mais completos — com cardápio, produtos, integração com WhatsApp e PIX — e você pode sempre ajustar e implementar mais coisas quando quiser',
  },
  {
    pergunta: 'Posso testar antes de pagar?',
    resposta:
      'Sim. Você pode escolher entre a Versão Vendas que apenas cobra comissão por vendas ou começar na Versão Smart que inclui 20 créditos para testar à vontade, sem nenhum compromisso. Não é necessário cartão de crédito para começar. Você só investe quando decidir escalar.',
  },
  {
    pergunta: 'O minhAi funciona para qualquer tipo de negócio?',
    resposta:
      'Sim. Temos clientes em mais de 15 segmentos — clínicas, restaurantes, academias, advocacia, e-commerce, lojas físicas, imobiliárias, franquias e muito mais. Se o seu negócio atende clientes, o minhAi tem funções para automatizar.',
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

export default function FAQSection({ theme = 'dark' }: FAQSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`relative flex flex-col items-center justify-center h-full w-full overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-white via-gray-50 to-white'
    }`}>

      {/* Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 right-1/4 w-[35%] h-[35%] rounded-full blur-[100px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-100/40'}`} />
      </div>

      {/*
        Container principal:
        - px responsivo
        - py pequeno para respirar sem estourar
        - overflow-y-auto só no mobile (scroll interno), no desktop tudo cabe
        - max-h garante que nunca estoure a viewport (descontando ~56px do header)
      */}
      <div
        className="relative z-10 w-full max-w-3xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8
                   py-3 sm:py-4
                   overflow-y-auto sm:overflow-y-visible
                   gap-2 sm:gap-3"
        style={{ maxHeight: 'calc(100dvh - 56px)' }}
      >

        {/* Header — fonte menor em telas pequenas */}
        <div className="text-center flex-shrink-0">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5 sm:mb-2 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            Dúvidas frequentes
          </p>
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-0.5 sm:mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Respostas rápidas para{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>começar agora</span>
          </h2>
        </div>

        {/* Lista de FAQs — gap e padding reduzidos para caber tudo */}
        <div className="flex flex-col gap-1.5 sm:gap-2 w-full flex-shrink-0">
          {FAQS.map(({ pergunta, resposta }, i) => (
            <details
              key={i}
              className={`group rounded-xl border cursor-pointer transition-all duration-200 ${
                isDark
                  ? 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04] hover:border-white/12'
                  : 'bg-white border-gray-100 hover:border-blue-200 shadow-sm'
              }`}
            >
              {/* Padding do summary: menor em mobile/desktop compacto */}
              <summary className="flex items-center justify-between gap-3 list-none px-4 py-2.5 sm:py-3">
                <h3 className={`font-semibold text-xs sm:text-sm pr-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {pergunta}
                </h3>
                <svg
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-200 group-open:rotate-180 ${isDark ? 'text-white/30' : 'text-gray-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className={`px-4 pb-2.5 sm:pb-3 text-[11px] sm:text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {resposta}
              </p>
            </details>
          ))}
        </div>

        {/* CTA inline — padding reduzido */}
        <div className="text-center flex-shrink-0 pt-0.5 sm:pt-1">
          <p className={`text-xs mb-2 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
            Ainda tem dúvidas?
          </p>
          <a
            href="https://wa.me/5511926828418"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border text-xs sm:text-sm font-semibold transition-all hover:scale-105 ${
              isDark
                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar com a equipe no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
