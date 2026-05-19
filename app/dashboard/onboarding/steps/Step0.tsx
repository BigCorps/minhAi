// components/dashboard/onboarding/steps/Step0.tsx
// Escolha do tipo de assistente: Smart ou Vendas.
// Explica as diferenças com linguagem acessível — sem jargões técnicos.

'use client';

import { Sparkles, ShoppingCart, Check } from 'lucide-react';
import type { StepProps } from './types';

export function Step0({ state, update, onNext }: StepProps) {
  const selected = state.assistantType;

  function select(type: 'smart' | 'vendas') {
    update({ assistantType: type });
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Para que você vai usar seu assistente?
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Você pode ter vários assistentes com propósitos diferentes — um para atender clientes,
        outro para vendas, outro para uso interno. Escolha o tipo certo para começar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>

        {/* Card: Smart */}
        <TypeCard
          selected={selected === 'smart'}
          onSelect={() => select('smart')}
          icon={<Sparkles size={24} color={selected === 'smart' ? '#3b82f6' : '#94a3b8'} />}
          title="minhAi Smart"
          badge="Mais completo"
          badgeColor="#3b82f6"
          description="Mais de 100 funções disponíveis: agendamentos, PIX, QR Codes, câmera, impressão, cardápio, notas e muito mais. Funciona por créditos de uso ou plano mensal."
          bullets={[
            'Ideal para atendimento, recepção e quiosques',
            'Funções ativas conforme sua necessidade',
            'Planos mensais liberam mais funcionalidades',
            'Pode ter um assistente por finalidade',
          ]}
          accentColor="#3b82f6"
        />

        {/* Card: Vendas */}
        <TypeCard
          selected={selected === 'vendas'}
          onSelect={() => select('vendas')}
          icon={<ShoppingCart size={24} color={selected === 'vendas' ? '#8b5cf6' : '#94a3b8'} />}
          title="minhAi Vendas"
          badge="Sem mensalidade"
          badgeColor="#8b5cf6"
          description="Focado 100% em vender. Sem cobrança de mensalidade ou créditos — a minhAi fica com 10% de comissão por venda confirmada, mais 1% no saque via PIX."
          bullets={[
            'Ideal para lojas, delivery e catálogos online',
            'WebApp já incluso sem custo adicional',
            'Catálogo de produtos, carrinho e pagamento',
            'Comissão só quando você vender',
          ]}
          accentColor="#8b5cf6"
          notice="As taxas de InfinitePay e Mercado Pago são cobradas diretamente por eles."
        />

      </div>

      {/* Nota de múltiplos assistentes */}
      <div style={{
        padding: '12px 16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 10,
        fontSize: 13,
        color: '#166534',
        marginBottom: 28,
      }}>
        💡 <strong>Lembre-se:</strong> você pode criar quantos assistentes quiser, cada um com seu próprio tipo e propósito — um Smart para recepção, um Vendas para o catálogo, outro Smart só para uso interno da equipe.
      </div>

      <button
        onClick={onNext}
        style={{
          width: '100%', padding: '14px',
          background: selected === 'vendas'
            ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
            : 'linear-gradient(135deg, #2563eb, #3b82f6)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        Continuar com {selected === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'} →
      </button>
    </div>
  );
}

// ── Card de tipo ─────────────────────────────────────────────

interface TypeCardProps {
  selected:     boolean;
  onSelect:     () => void;
  icon:         React.ReactNode;
  title:        string;
  badge:        string;
  badgeColor:   string;
  description:  string;
  bullets:      string[];
  accentColor:  string;
  notice?:      string;
}

function TypeCard({
  selected, onSelect, icon, title, badge, badgeColor,
  description, bullets, accentColor, notice,
}: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: 'left',
        padding: '20px',
        borderRadius: 12,
        border: `2px solid ${selected ? accentColor : '#e2e8f0'}`,
        background: selected ? `${accentColor}08` : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: '100%',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <span style={{
            fontSize: 16, fontWeight: 700,
            color: selected ? accentColor : '#1e293b',
          }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px',
            borderRadius: 20, background: `${badgeColor}18`, color: badgeColor,
          }}>
            {badge}
          </span>
          {selected && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={13} color="white" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {/* Descrição */}
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
        {description}
      </p>

      {/* Bullets */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#334155' }}>
            <span style={{ color: accentColor, marginTop: 1, flexShrink: 0 }}>✓</span>
            {b}
          </li>
        ))}
      </ul>

      {/* Aviso (opcional) */}
      {notice && (
        <p style={{
          fontSize: 11, color: '#94a3b8',
          marginTop: 12, paddingTop: 12,
          borderTop: '1px solid #f1f5f9',
        }}>
          {notice}
        </p>
      )}
    </button>
  );
}
