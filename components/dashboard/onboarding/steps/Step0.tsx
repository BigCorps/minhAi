// components/dashboard/onboarding/steps/Step0.tsx
'use client';

import { Sparkles, ShoppingCart, Check, Users, Zap, Calendar, QrCode, Printer, BookOpen, Store, TrendingUp } from 'lucide-react';
import type { StepProps } from './types';

export function Step0({ state, update, onNext }: StepProps) {
  const selected = state.assistantType;

  // Vendas fora da criação por enquanto — mesma flag usada em CreditsPage.tsx,
  // PrecosSection.tsx e SaldoPage.tsx. Pra reativar, só mudar pra `true`.
  const SHOW_VENDAS_TYPE = false;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Para que você vai usar seu assistente?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
        Você pode ter vários assistentes com propósitos diferentes — um para atender clientes,
        outro para vendas, outro para uso interno. Escolha o tipo certo para começar.
      </p>

      <div className="flex flex-col gap-4 mb-7">

        {/* Card: Smart */}
        <TypeCard
          selected={selected === 'smart'}
          onSelect={() => update({ assistantType: 'smart' })}
          icon={<Sparkles size={22} />}
          title="minhAi Smart"
          badge="Completo"
          badgeColor="blue"
          description="Mais de 100 funções disponíveis: agendamentos, PIX, QR Codes, câmera, impressão, cardápio, notas e muito mais. Funciona por créditos de uso ou plano mensal."
          bullets={[
            { icon: <Users size={13} />, text: 'Ideal para atendimento, recepção e quiosques' },
            { icon: <Zap size={13} />, text: 'Funções ativas conforme sua necessidade' },
            { icon: <Calendar size={13} />, text: 'Planos mensais liberam mais funcionalidades' },
            { icon: <Sparkles size={13} />, text: 'Pode ter um assistente por finalidade' },
          ]}
          accent="blue"
        />

        {/* Card: Vendas */}
        {SHOW_VENDAS_TYPE && (
        <TypeCard
          selected={selected === 'vendas'}
          onSelect={() => update({ assistantType: 'vendas' })}
          icon={<ShoppingCart size={22} />}
          title="minhAi Vendas"
          badge="Sem mensalidade"
          badgeColor="purple"
          description="Focado 100% em vender. Sem cobrança de mensalidade ou créditos — a minhAi fica com 10% de comissão por venda confirmada, mais 1% no saque via PIX."
          bullets={[
            { icon: <Store size={13} />, text: 'Ideal para lojas, delivery e catálogos online' },
            { icon: <QrCode size={13} />, text: 'WebApp já incluso sem custo adicional' },
            { icon: <ShoppingCart size={13} />, text: 'Catálogo de produtos, carrinho e pagamento' },
            { icon: <TrendingUp size={13} />, text: 'Comissão só quando você vender' },
          ]}
          accent="purple"
          notice="As taxas de InfinitePay e Mercado Pago são cobradas diretamente por eles."
        />
        )}
      </div>

      {/* Nota */}
      <div className="flex items-start gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-xl text-sm text-green-800 dark:text-green-300 mb-7">
        <Sparkles size={15} className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
        <p>
          <strong>Lembre-se:</strong> você pode criar quantos assistentes quiser, cada um com seu próprio tipo e propósito — um Smart para recepção, um Vendas para o catálogo, outro Smart só para uso interno da equipe.
        </p>
      </div>

      <button
        onClick={onNext}
        className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition hover:opacity-90 ${
          selected === 'vendas'
            ? 'bg-gradient-to-r from-violet-600 to-purple-500'
            : 'bg-gradient-to-r from-blue-600 to-blue-500'
        }`}
      >
        Continuar com {selected === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'} →
      </button>
    </div>
  );
}

// ── TypeCard ──────────────────────────────────────────────────

type Accent = 'blue' | 'purple';

interface BulletItem { icon: React.ReactNode; text: string; }

interface TypeCardProps {
  selected:    boolean;
  onSelect:    () => void;
  icon:        React.ReactNode;
  title:       string;
  badge:       string;
  badgeColor:  string;
  description: string;
  bullets:     BulletItem[];
  accent:      Accent;
  notice?:     string;
}

const ACCENT = {
  blue: {
    border:  'border-blue-500',
    bg:      'bg-blue-50 dark:bg-blue-500/10',
    idle:    'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]',
    title:   'text-blue-600 dark:text-blue-400',
    idleTitle: 'text-gray-800 dark:text-white',
    badge:   'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300',
    check:   'bg-blue-500',
    bullet:  'text-blue-500 dark:text-blue-400',
    icon:    'text-blue-500 dark:text-blue-400',
    idleIcon: 'text-gray-400 dark:text-white/30',
  },
  purple: {
    border:  'border-purple-500',
    bg:      'bg-purple-50 dark:bg-purple-500/10',
    idle:    'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]',
    title:   'text-purple-600 dark:text-purple-400',
    idleTitle: 'text-gray-800 dark:text-white',
    badge:   'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300',
    check:   'bg-purple-500',
    bullet:  'text-purple-500 dark:text-purple-400',
    icon:    'text-purple-500 dark:text-purple-400',
    idleIcon: 'text-gray-400 dark:text-white/30',
  },
};

function TypeCard({ selected, onSelect, icon, title, badge, description, bullets, accent, notice }: TypeCardProps) {
  const c = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-5 rounded-xl border-2 transition-all w-full ${
        selected ? `${c.border} ${c.bg}` : `${c.idle} hover:border-gray-300 dark:hover:border-white/20`
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={selected ? c.icon : c.idleIcon}>{icon}</span>
          <span className={`font-bold text-base ${selected ? c.title : c.idleTitle}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${c.badge}`}>{badge}</span>
          {selected && (
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${c.check}`}>
              <Check size={11} color="white" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{description}</p>

      <ul className="flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li key={i} className={`flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-300`}>
            <span className={c.bullet}>{b.icon}</span>
            {b.text}
          </li>
        ))}
      </ul>

      {notice && (
        <p className="text-[11px] text-gray-400 dark:text-white/30 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          {notice}
        </p>
      )}
    </button>
  );
}
