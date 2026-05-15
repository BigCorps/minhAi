// app/components/landing/AssistentesSection.tsx — Server Component
import { ShoppingCart, FileText, Factory, Receipt } from 'lucide-react';

interface AssistentesSectionProps {
  theme?: 'dark' | 'light';
}

const ASSISTENTES = [
  {
    id: 'vendas',
    Icon: ShoppingCart,
    nome: 'Assistente de Vendas',
    tagline: 'Guia o cliente do pedido ao pagamento',
    color: 'lime' as const,
    descricao:
      'Chat com IA + carrinho em tempo real. O cliente diz o que quer comprar por voz ou texto — o assistente monta o pedido, sugere produtos do catálogo e conduz até o pagamento (PIX, NFC ou TEF) sem sair da conversa.',
    recursos: [
      'Chat IA integrado ao catálogo',
      'Carrinho visual em tempo real',
      'Busca de produto por voz',
      'Finalização com PIX, NFC ou TEF',
      'Delivery, retirada ou mesa',
    ],
  },
  {
    id: 'orcamentos',
    Icon: FileText,
    nome: 'Assistente de Orçamentos',
    tagline: 'Orçamento completo em segundos',
    color: 'blue' as const,
    descricao:
      'Descreva o que o cliente precisa e o assistente monta o orçamento com produtos, quantidades, preços e margem — puxando direto do seu catálogo. Gera o documento formatado para enviar ao cliente.',
    recursos: [
      'Preenche itens por voz',
      'Calcula totais automaticamente',
      'Aplica desconto e margem',
      'Gera documento de orçamento',
      'Integrado ao catálogo de produtos',
    ],
  },
  {
    id: 'producao',
    Icon: Factory,
    nome: 'Auxiliar de Produção',
    tagline: 'Cria produtos com custo e margem calculados',
    color: 'blue' as const,
    descricao:
      'Informe os ingredientes ou insumos por voz e o auxiliar calcula automaticamente o custo de produção, sugere preço de venda com a margem desejada e cria o item no catálogo — pronto para vender.',
    recursos: [
      'Cadastro de produto por voz',
      'Cálculo de custo de insumos',
      'Sugestão de preço com margem',
      'Criação automática no catálogo',
      'Controle de estoque integrado',
    ],
  },
  {
    id: 'fiscal',
    Icon: Receipt,
    nome: 'Auxiliar Fiscal',
    tagline: 'Emite NFe, NFSe e NFCe por voz',
    color: 'amber' as const,
    descricao:
      'Informe os dados por voz — destinatário, produtos e valores — e o auxiliar preenche os campos fiscais (NCM, CFOP, CSOSN), valida os dados e emite a nota diretamente pela SEFAZ. Integrado com seus produtos e vendas.',
    recursos: [
      'Emissão de NFe, NFSe e NFCe',
      'Preenchimento por voz',
      'Sugestão automática de NCM',
      'Integrado com produtos e vendas',
      'Emissão direta na SEFAZ',
    ],
  },
];

const colorMap = {
  lime: {
    dark:  { iconBg: 'bg-lime-500/15',  iconText: 'text-lime-400',  tag: 'bg-lime-500/10 text-lime-400 border-lime-500/20',  dot: 'bg-lime-400',  cardBg: 'bg-lime-500/5',  border: 'border-lime-500/15' },
    light: { iconBg: 'bg-lime-100',     iconText: 'text-lime-700',  tag: 'bg-lime-50 text-lime-700 border-lime-200',          dot: 'bg-lime-500',  cardBg: 'bg-lime-50/60',  border: 'border-lime-200' },
  },
  blue: {
    dark:  { iconBg: 'bg-blue-500/15',  iconText: 'text-blue-400',  tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20',  dot: 'bg-blue-400',  cardBg: 'bg-blue-500/5',  border: 'border-blue-500/15' },
    light: { iconBg: 'bg-blue-100',     iconText: 'text-blue-700',  tag: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',  cardBg: 'bg-blue-50/60',  border: 'border-blue-200' },
  },
  amber: {
    dark:  { iconBg: 'bg-amber-500/15', iconText: 'text-amber-400', tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400', cardBg: 'bg-amber-500/5', border: 'border-amber-500/15' },
    light: { iconBg: 'bg-amber-100',    iconText: 'text-amber-700', tag: 'bg-amber-50 text-amber-700 border-amber-200',         dot: 'bg-amber-500', cardBg: 'bg-amber-50/60', border: 'border-amber-200' },
  },
};

export default function AssistentesSection({ theme = 'dark' }: AssistentesSectionProps) {
  const isDark = theme === 'dark';

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
      {/* Decorativo */}
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
          gap-3 sm:gap-5 md:gap-6
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-lime-400/70' : 'text-lime-600/70'}`}>
            Especialistas de IA
          </p>
          <h2
            className={`
              font-bold leading-tight
              text-lg sm:text-2xl md:text-3xl
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}
          >
            Sua equipe digital{' '}
            <span className={isDark ? 'text-lime-400' : 'text-lime-600'}>completa</span>
          </h2>
          <p
            className={`
              text-xs sm:text-sm max-w-xl mx-auto mt-1
              [@media(max-height:640px)_and_(max-width:767px)]:hidden
              ${isDark ? 'text-white/45' : 'text-gray-500'}
            `}
          >
            Além do assistente principal, o minhAi inclui especialistas de IA para cada área do seu negócio — integrados com produtos, estoque e cobranças.
          </p>
        </div>

        {/* ── MOBILE: lista compacta ──────────────────────────── */}
        <div className="flex flex-col gap-2 w-full sm:hidden">
          {ASSISTENTES.map(({ id, Icon, nome, tagline, color }) => {
            const c = colorMap[color][isDark ? 'dark' : 'light'];
            return (
              <div
                key={id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border ${c.border} ${c.cardBg}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                  <Icon className={`w-4 h-4 ${c.iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {nome}
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {tagline}
                  </p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP: grid 4 colunas ─────────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
          {ASSISTENTES.map(({ id, Icon, nome, tagline, descricao, recursos, color }) => {
            const c = colorMap[color][isDark ? 'dark' : 'light'];
            return (
              <article
                key={id}
                className={`
                  flex flex-col gap-3 p-4 md:p-5 rounded-2xl border
                  transition-all duration-300 hover:scale-[1.02]
                  ${c.cardBg} ${c.border}
                `}
              >
                {/* Header do card */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
                    <Icon className={`w-5 h-5 ${c.iconText}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {nome}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${c.tag}`}>
                      {tagline}
                    </span>
                  </div>
                </div>

                {/* Descrição */}
                <p className={`text-xs leading-relaxed flex-1 ${isDark ? 'text-white/55' : 'text-gray-500'}`}>
                  {descricao}
                </p>

                {/* Recursos */}
                <ul className={`flex flex-col gap-1 [@media(max-height:750px)_and_(min-width:640px)_and_(max-width:1023px)]:hidden`}>
                  {recursos.map((r) => (
                    <li key={r} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{r}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Rodapé */}
        <p
          className={`
            text-[10px] sm:text-xs text-center
            [@media(max-height:640px)_and_(max-width:767px)]:hidden
            ${isDark ? 'text-white/20' : 'text-gray-300'}
          `}
        >
          Todos os especialistas abrem como modal dentro do assistente — sem trocar de tela ou sistema →
        </p>

      </div>
    </div>
  );
}
