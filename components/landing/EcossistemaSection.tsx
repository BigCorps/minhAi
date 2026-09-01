// components/landing/EcossistemaSection.tsx — Server Component puro (sem 'use client')
//
// Prova de plataforma: os produtos que já rodam sobre a minhAi.
// Fica entre o Início e "Escale sem contratar" — o herói afirma que é uma
// tecnologia, esta seção mostra os produtos, e a seguinte volta ao benefício.
//
// Os logos vêm de /public/brands/, o MESMO diretório que serve as marcas em
// produção. Nada é carregado de domínio externo: se um produto trocar de logo,
// o card acompanha sozinho.
//
// Sobre o número de produtos: nenhum texto aqui cita quantidade. É de propósito
// — a lista cresce a cada produto novo, e título com número vira dívida de
// manutenção. Para adicionar um app, basta uma entrada em APPS.

interface EcossistemaSectionProps {
  theme?: 'dark' | 'light';
}

type App = {
  id: string;
  nome: string;
  dominio: string;
  href: string;
  logo: string;
  tagline: string;
  descricao: string;
};

const APPS: App[] = [
  {
    id: 'funcionaria',
    nome: 'FuncionarIA',
    dominio: 'funcionaria.net',
    href: 'https://funcionaria.net',
    logo: '/brands/funcionaria/logo.png',
    tagline: 'Funcionária digital',
    descricao:
      'Atende no balcão e no online, com subdomínio e identidade próprios. A empresa contrata só as habilidades que precisa.',
  },
  {
    id: 'minia',
    nome: 'min.IA',
    dominio: 'min.ia.br',
    href: 'https://min.ia.br',
    logo: '/brands/minia/logo.png',
    tagline: 'A minhAi pessoal',
    descricao:
      'Mais de 100 funções de IA direto no chat, para uso pessoal. Mesma conta e mesmos créditos da minhAi.',
  },
  {
    id: 'conviteia',
    nome: 'Convite IA',
    dominio: 'conviteia.com',
    href: 'https://conviteia.com',
    logo: '/brands/convite/icone-512.png',
    tagline: 'Convite com IA',
    descricao:
      'Convite digital com endereço próprio, confirmação de presença, mural de recados e lista de presentes que recebe Pix.',
  },
  {
    id: 'melhoria',
    nome: 'MelhorIA',
    dominio: 'melhoria.org',
    href: 'https://melhoria.org',
    logo: '/brands/melhoria/logo.png',
    tagline: 'A IA da Melhor Idade',
    descricao:
      'Lembrete de remédio e verificação antifraude de boleto e link, com letra grande e uma ação por tela.',
  },
  {
    id: 'pix',
    nome: 'Pix Wiki',
    dominio: 'pix.wiki',
    href: 'https://pix.wiki',
    logo: '/brands/pix/pixwiki.png',
    tagline: 'Cobrança confirmada',
    descricao:
      'Link de cobrança com o nome do negócio e baixa vinda do banco, não do comprovante que o cliente manda.',
  },
  {
    id: 'consultatec',
    nome: 'ConsultaTec',
    dominio: 'consulta.tec.br',
    href: 'https://consulta.tec.br',
    logo: '/brands/consultatec/logo.png',
    tagline: 'CPF e CNPJ',
    descricao:
      'Consulta avulsa paga por Pix na hora, sem assinatura e sem cadastro obrigatório.',
  },
  {
    id: 'artefinal',
    nome: 'ArteFinal',
    dominio: 'artefinal.app',
    href: 'https://artefinal.app',
    // O logo do ArteFinal não está em /brands/artefinal/ (o brand.ts aponta
    // para um logo.png que não existe ali). O arquivo correto é este, que já
    // está no public deste mesmo build — servido local, sem sair para
    // ia.artefinal.app.
    logo: '/arte/arte.png',
    tagline: 'Arte-final com IA',
    descricao:
      'Sangria, faca de recorte e PDF/X-1a em CMYK fechados no navegador, prontos para a gráfica.',
  },
];

export default function EcossistemaSection({ theme = 'dark' }: EcossistemaSectionProps) {
  const isDark = theme === 'dark';

  // Desktop: 4 + 3. Mesmo arranjo em linhas que a AssistentesSection usa,
  // com a linha de 4 primeiro para os produtos de maior destaque.
  const linhas = [APPS.slice(0, 4), APPS.slice(4)];

  const cardBase = isDark
    ? 'bg-white/[0.03] border-white/10 hover:border-blue-400/30'
    : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm';

  const pill = isDark
    ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-full overflow-hidden bg-transparent
        transition-colors duration-500
      `}
    >
      {/* Fundo decorativo — mesmo padrão das outras seções */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[55%] h-[40%] rounded-full blur-[140px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-6xl mx-auto
          flex flex-col items-center
          px-5 sm:px-8 lg:px-12
          pt-24 pb-16 sm:pt-28 sm:pb-20 md:py-16
          gap-4 md:gap-6
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            A mesma tecnologia
          </p>
          <h2 className={`font-bold leading-tight text-2xl sm:text-3xl md:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Aplicativos feitos{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>com a minhAi</span>
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto mt-2 ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Cada um destes produtos tem público, marca e domínio próprios. Todos rodam sobre o sistema da minhAi. Entre em contato para ter seu app também com nossa tecnlogia.
          </p>
        </div>

        {/* ── MOBILE: lista compacta ─────────────────────────── */}
        <div className="flex flex-col gap-2 w-full sm:hidden">
          {APPS.map(({ id, nome, dominio, href, logo, tagline }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener"
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${cardBase}`}
            >
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                loading="lazy"
                className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {nome}
                </h3>
                <p className={`text-[10px] leading-tight ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                  {dominio}
                </p>
              </div>
              <span className={`text-[10px] font-medium ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
                {tagline}
              </span>
            </a>
          ))}
        </div>

        {/* ── DESKTOP: 2 linhas — 4 + 3 ──────────────────────── */}
        <div className="hidden sm:flex sm:flex-col gap-3 md:gap-4 w-full">
          {linhas.map((linha, li) => (
            <div key={li} className="flex justify-center gap-3 md:gap-4">
              {linha.map(({ id, nome, dominio, href, logo, tagline, descricao }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  className={`
                    flex flex-col gap-2.5 p-4 md:p-5 rounded-2xl border
                    transition-all duration-300 hover:scale-[1.02]
                    ${cardBase}
                  `}
                  style={{ flex: 1, maxWidth: li === 0 ? '25%' : '33.333%' }}
                >
                  {/* Logo + nome + domínio */}
                  <div className="flex items-center gap-2.5">
                    <img
                      src={logo}
                      alt=""
                      aria-hidden="true"
                      width={36}
                      height={36}
                      loading="lazy"
                      className="w-9 h-9 rounded-xl object-contain flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {nome}
                      </h3>
                      <p className={`text-[10px] leading-tight truncate ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                        {dominio}
                      </p>
                    </div>
                  </div>

                  {/* Tagline */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border self-start leading-none ${pill}`}>
                    {tagline}
                  </span>

                  {/* Descrição */}
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {descricao}
                  </p>
                </a>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
