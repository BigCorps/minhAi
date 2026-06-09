// app/components/landing/AssistentesSection.tsx — Server Component
import { ShoppingCart, FileText, Factory, Receipt, Settings2, CalendarClock, FileBarChart2, ShieldAlert, Package, Sparkles } from 'lucide-react';

interface AssistentesSectionProps {
  theme?: 'dark' | 'light';
}

const ASSISTENTES = [
  {
    id: 'vendas',
    Icon: ShoppingCart,
    nome: 'Assistente de Vendas',
    tagline: 'Do pedido ao pagamento',
    color: 'lime' as const,
    descricao: 'IA + carrinho em tempo real. Cliente pede por voz, o assistente monta e cobra via PIX, NFC ou TEF.',
  },
  {
    id: 'orcamentos',
    Icon: FileText,
    nome: 'Assistente de Orçamentos',
    tagline: 'Orçamento completo em segundos',
    color: 'blue' as const,
    descricao: 'Descreva o pedido e o assistente monta o orçamento com produtos, margens e desconto — gera o documento pronto.',
  },
  {
    id: 'midia',
    Icon: Sparkles,
    nome: 'Criador de Posts',
    tagline: 'Arte gerada por IA',
    color: 'amber' as const,
    descricao: 'Descreva o post por voz ou texto — a IA gera a arte com a identidade da sua marca e publica direto nas redes sociais.',
  },
  {
    id: 'agenda',
    Icon: CalendarClock,
    nome: 'Gestor de Agenda',
    tagline: 'Consultas, salões e reuniões',
    color: 'blue' as const,
    descricao: 'Gerencia agendamentos com Google Agenda e Meet. Confirma presença, envia lembretes e cria links de videochamada.',
  },
  {
    id: 'fiscal',
    Icon: Receipt,
    nome: 'Auxiliar Fiscal',
    tagline: 'Emite NFe, NFSe e NFCe por voz',
    color: 'amber' as const,
    descricao: 'Fale os dados, o auxiliar preenche NCM, CFOP e CSOSN e emite a nota direto na SEFAZ — integrado aos seus produtos.',
  },
  {
    id: 'cadastro',
    Icon: Package,
    nome: 'Auxiliar de Cadastro',
    tagline: 'Cadastre produtos facilmente',
    color: 'lime' as const,
    descricao: 'Com sugestão de imagens, categorias, campos para NF, MercadoLivre e mais.',
  },
  {
    id: 'producao',
    Icon: Factory,
    nome: 'Auxiliar de Produção',
    tagline: 'Custo e margem calculados',
    color: 'blue' as const,
    descricao: 'Informe os insumos por voz — o auxiliar calcula o custo, sugere o preço com margem e cria o produto no catálogo.',
  },
  {
    id: 'antifraude',
    Icon: ShieldAlert,
    nome: 'Investigador Antifraude',
    tagline: 'Detecta fraudes em arquivos e sites',
    color: 'lime' as const,
    descricao: 'Carregue boletos, contratos ou URLs — o investigador analisa inconsistências e emite laudo com nível de risco.',
  },
  {
    id: 'relatorios',
    Icon: FileBarChart2,
    nome: 'Auxiliar de Relatórios',
    tagline: 'Arquivos viram relatórios',
    color: 'amber' as const,
    descricao: 'Carregue planilhas ou PDFs e o auxiliar extrai, organiza e gera relatório com resumos e insights formatados.',
  },
  {
    id: 'funcoes',
    Icon: Settings2,
    nome: 'Gerenciador de Funções',
    tagline: 'Configura assistentes sem código',
    color: 'blue' as const,
    descricao: 'Guia na criação de assistentes e ativação de funções. Recomenda combinações por segmento e aplica em tempo real.',
  },
];

const colorMap = {
  lime: {
    dark:  { iconBg: 'bg-lime-500/15',  iconText: 'text-lime-400',  tag: 'bg-lime-500/10 text-lime-400 border-lime-500/20',   dot: 'bg-lime-400',  cardBg: 'bg-lime-500/5',  border: 'border-lime-500/15' },
    light: { iconBg: 'bg-lime-100',     iconText: 'text-lime-700',  tag: 'bg-lime-50 text-lime-700 border-lime-200',           dot: 'bg-lime-500',  cardBg: 'bg-lime-50/60',  border: 'border-lime-200' },
  },
  blue: {
    dark:  { iconBg: 'bg-blue-500/15',  iconText: 'text-blue-400',  tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   dot: 'bg-blue-400',  cardBg: 'bg-blue-500/5',  border: 'border-blue-500/15' },
    light: { iconBg: 'bg-blue-100',     iconText: 'text-blue-700',  tag: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500',  cardBg: 'bg-blue-50/60',  border: 'border-blue-200' },
  },
  amber: {
    dark:  { iconBg: 'bg-amber-500/15', iconText: 'text-amber-400', tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400', cardBg: 'bg-amber-500/5', border: 'border-amber-500/15' },
    light: { iconBg: 'bg-amber-100',    iconText: 'text-amber-700', tag: 'bg-amber-50 text-amber-700 border-amber-200',         dot: 'bg-amber-500', cardBg: 'bg-amber-50/60', border: 'border-amber-200' },
  },
};

export default function AssistentesSection({ theme = 'dark' }: AssistentesSectionProps) {
  const isDark = theme === 'dark';

  // Linhas do grid desktop: 3 + 4 + 3
  const linhas = [
    ASSISTENTES.slice(0, 3),
    ASSISTENTES.slice(3, 7),
    ASSISTENTES.slice(7, 10),
  ];

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-white via-blue-50/20 to-white'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[55%] h-[40%] rounded-full blur-[140px] ${isDark ? 'bg-lime-500/4' : 'bg-lime-200/15'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-6xl mx-auto
          flex flex-col items-center
          px-5 sm:px-8 lg:px-12
          pt-[68px] pb-[52px]
          [@media(max-height:700px)_and_(max-width:767px)]:pt-[64px]
          [@media(max-height:700px)_and_(max-width:767px)]:pb-[44px]
          md:pt-4 md:pb-4
          gap-2 sm:gap-3 md:gap-4
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-lime-400/70' : 'text-lime-600/70'}`}>
            Especialistas de IA
          </p>
          <h2 className={`font-bold leading-tight text-lg sm:text-2xl md:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Sua equipe digital{' '}
            <span className={isDark ? 'text-lime-400' : 'text-lime-600'}>completa</span>
          </h2>
          <p className={`text-xs sm:text-sm max-w-xl mx-auto mt-1 [@media(max-height:640px)_and_(max-width:767px)]:hidden ${isDark ? 'text-white/45' : 'text-gray-500'}`}>
            Além das mais de 100 funções, você conta com 10 especialistas de IA integrados ao seu negócio — cada um com foco em uma área específica.
          </p>
        </div>

        {/* ── MOBILE: lista compacta — todos os 10 ── */}
        <div className="flex flex-col gap-1.5 w-full sm:hidden">
          {ASSISTENTES.map(({ id, Icon, nome, tagline, color }) => {
            const c = colorMap[color][isDark ? 'dark' : 'light'];
            return (
              <div key={id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${c.border} ${c.cardBg}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                  <Icon className={`w-4 h-4 ${c.iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{nome}</h3>
                  <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{tagline}</p>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP: 3 linhas — 3 + 4 + 3 ── */}
        <div className="hidden sm:flex sm:flex-col gap-2.5 md:gap-3 w-full">
          {linhas.map((linha, li) => (
            <div key={li} className="flex justify-center gap-2.5 md:gap-3">
              {linha.map(({ id, Icon, nome, tagline, descricao, color }) => {
                const c = colorMap[color][isDark ? 'dark' : 'light'];
                return (
                  <article
                    key={id}
                    className={`
                      flex flex-col gap-2.5 p-3.5 md:p-4 rounded-2xl border
                      transition-all duration-300 hover:scale-[1.02]
                      ${c.cardBg} ${c.border}
                    `}
                    style={{ flex: 1, maxWidth: li === 1 ? '25%' : '33.333%' }}
                  >
                    {/* Ícone + nome */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                        <Icon className={`w-4 h-4 ${c.iconText}`} />
                      </div>
                      <h3 className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {nome}
                      </h3>
                    </div>

                    {/* Tagline */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border self-start ${c.tag}`}>
                      {tagline}
                    </span>

                    {/* Descrição */}
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {descricao}
                    </p>
                  </article>
                );
              })}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <p className={`text-[10px] sm:text-xs text-center [@media(max-height:640px)_and_(max-width:767px)]:hidden ${isDark ? 'text-white/20' : 'text-gray-300'}`}>
          Todos os especialistas abrem como modal dentro do assistente — sem trocar de tela →
        </p>

      </div>
    </div>
  );
}
