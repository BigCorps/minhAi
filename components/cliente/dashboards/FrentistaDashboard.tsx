'use client';

// ============================================================
// components/cliente/dashboards/FrentistaDashboard.tsx
// profile.tipo === 'frentista'
//
// Funções:
//   - Registrar Venda     (RegistrarVendaDisplay)
//   - Chamar Gerente      (ChamarGerenteDisplay)
//   - Minha Conta + Logout
// ============================================================

import { SlugProfile } from '@/hooks/useProfile';
import CardMinhaConta from './shared/CardMinhaConta';
import BotaoLogout from './shared/BotaoLogout';
import CardAcao from './shared/CardAcao';
import { Zap, PhoneCall } from 'lucide-react';

interface Props {
  profile: SlugProfile;
  company: { id: string; slug: string; name: string; logo_url?: string | null };
  theme: 'dark' | 'light';
}

export default function FrentistaDashboard({ profile, company, theme }: Props) {
  const isDark     = theme === 'dark';
  const titleColor = isDark ? 'rgb(241,245,249)' : 'rgb(15,23,42)';
  const muteColor  = isDark ? 'rgb(100,116,139)'  : 'rgb(148,163,184)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Saudação + Logout */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>
            Olá, {profile.nome.split(' ')[0]}!
          </h1>
          <p className="text-base" style={{ color: muteColor }}>
            Painel do frentista · {company.name}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <BotaoLogout slug={company.slug} theme={theme} compact />
        </div>
      </div>

      {/* Minha Conta full-width */}
      <div className="mb-6">
        <CardMinhaConta profile={profile} theme={theme} horizontal />
      </div>

      {/* Grid de ações — 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <CardAcao
          title="Registrar Venda"
          description="Registre uma venda rápida de combustível ou conveniência."
          functionKey="registrar_venda"
          companyId={company.id}
          iconBg="rgba(59,130,246,0.1)"
          icon={<Zap className="w-6 h-6" />}
          iconColor="rgb(147,197,253)"
          iconColorLight="rgb(29,78,216)"
          buttonLabel="Registrar Venda"
          buttonGradient="linear-gradient(135deg, #3b82f6, #6366f1)"
          buttonShadow="0 4px 14px rgba(59,130,246,0.35)"
          theme={theme}
        />

        <CardAcao
          title="Chamar Gerente"
          description="Solicite a presença do gerente para autorizações ou ocorrências."
          functionKey="chamar_gerente"
          companyId={company.id}
          iconBg="rgba(249,115,22,0.1)"
          icon={<PhoneCall className="w-6 h-6" />}
          iconColor="rgb(253,186,116)"
          iconColorLight="rgb(194,65,12)"
          buttonLabel="Chamar Gerente"
          buttonGradient="linear-gradient(135deg, #f97316, #ea580c)"
          buttonShadow="0 4px 14px rgba(249,115,22,0.35)"
          theme={theme}
        />

      </div>

    </div>
  );
}
