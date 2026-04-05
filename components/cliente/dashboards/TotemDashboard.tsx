'use client';

// ============================================================
// components/cliente/dashboards/TotemDashboard.tsx
// profile.tipo === 'totem'
//
// Funções:
//   - Modo Venda          (redireciona para /vendas/[slug])
//   - Validar Cupom       (ValidarCupomDisplay)
//   - Minha Conta + Logout
// ============================================================

import { useRouter } from 'next/navigation';
import { SlugProfile } from '@/hooks/useProfile';
import CardMinhaConta from './shared/CardMinhaConta';
import BotaoLogout from './shared/BotaoLogout';
import CardAcao from './shared/CardAcao';
import { ShoppingCart, Tag } from 'lucide-react';

interface Props {
  profile: SlugProfile;
  company: { id: string; slug: string; name: string; logo_url?: string | null };
  theme: 'dark' | 'light';
}

export default function TotemDashboard({ profile, company, theme }: Props) {
  const isDark     = theme === 'dark';
  const router     = useRouter();
  const titleColor = isDark ? 'rgb(241,245,249)' : 'rgb(15,23,42)';
  const muteColor  = isDark ? 'rgb(100,116,139)'  : 'rgb(148,163,184)';

  const cardBg     = isDark ? 'rgba(30,41,59,0.8)'    : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.5)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Saudação + Logout */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>
            Olá, {profile.nome.split(' ')[0]}!
          </h1>
          <p className="text-base" style={{ color: muteColor }}>
            Painel do totem · {company.name}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <BotaoLogout slug={company.slug} theme={theme} profile={profile} compact />
        </div>
      </div>

      {/* Minha Conta full-width */}
      <div className="mb-6">
        <CardMinhaConta profile={profile} theme={theme} horizontal />
      </div>

      {/* Grid de ações — 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Modo Venda — card customizado com redirect */}
        <div className="rounded-2xl p-6 shadow-lg border flex flex-col"
          style={{ background: cardBg, borderColor: cardBorder }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.1)', color: isDark ? 'rgb(110,231,183)' : 'rgb(5,150,105)' }}>
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: titleColor }}>Modo Venda</h2>
          </div>
          <p className="text-sm mb-6 flex-1" style={{ color: muteColor }}>
            Acesse o catálogo completo e realize pedidos com pagamento integrado.
          </p>
          <button
            onClick={() => router.push(`/vendas/${company.slug}`)}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            Abrir Catálogo
          </button>
        </div>

        <CardAcao
          title="Validar Cupom"
          description="Escaneie ou digite o código para validar um cupom do cliente."
          functionKey="validar_cupom"
          companyId={company.id}
          iconBg="rgba(16,185,129,0.1)"
          icon={<Tag className="w-6 h-6" />}
          iconColor="rgb(110,231,183)"
          iconColorLight="rgb(5,150,105)"
          buttonLabel="Validar Cupom"
          buttonGradient="linear-gradient(135deg, #10b981, #059669)"
          buttonShadow="0 4px 14px rgba(16,185,129,0.35)"
          theme={theme}
        />

      </div>

    </div>
  );
}
