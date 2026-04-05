'use client';

// ============================================================
// components/cliente/dashboards/CaixaDashboard.tsx
// profile.tipo === 'caixa'
//
// Funções:
//   - Registrar Venda     (RegistrarVendaDisplay)
//   - Fechar Caixa        (FecharCaixaDisplay)
//   - Trocar Turno        (TrocarTurnoDisplay)
//   - Validar Cupom       (ValidarCupomDisplay)
//   - Chamar Gerente      (ChamarGerenteDisplay)
//   - Minha Conta + Logout
// ============================================================

import { SlugProfile } from '@/hooks/useProfile';
import CardMinhaConta from './shared/CardMinhaConta';
import BotaoLogout from './shared/BotaoLogout';
import CardAcao from './shared/CardAcao';
import { Zap, Lock, RefreshCw, Tag, PhoneCall } from 'lucide-react';

interface Props {
  profile: SlugProfile;
  company: { id: string; slug: string; name: string; logo_url?: string | null };
  theme: 'dark' | 'light';
}

export default function CaixaDashboard({ profile, company, theme }: Props) {
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
            Painel do caixa · {company.name}
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

      {/* Grid de ações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <CardAcao
          title="Registrar Venda"
          description="Registre uma venda rápida em dinheiro, PIX ou cartão."
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
          title="Fechar Caixa"
          description="Realize o fechamento do caixa com totais e conferência de valores."
          functionKey="fechar_caixa"
          companyId={company.id}
          iconBg="rgba(239,68,68,0.1)"
          icon={<Lock className="w-6 h-6" />}
          iconColor="rgb(252,165,165)"
          iconColorLight="rgb(185,28,28)"
          buttonLabel="Fechar Caixa"
          buttonGradient="linear-gradient(135deg, #ef4444, #dc2626)"
          buttonShadow="0 4px 14px rgba(239,68,68,0.35)"
          theme={theme}
        />

        <CardAcao
          title="Trocar Turno"
          description="Registre a troca de turno entre operadores de caixa."
          functionKey="trocar_turno"
          companyId={company.id}
          iconBg="rgba(245,158,11,0.1)"
          icon={<RefreshCw className="w-6 h-6" />}
          iconColor="rgb(252,211,77)"
          iconColorLight="rgb(180,83,9)"
          buttonLabel="Trocar Turno"
          buttonGradient="linear-gradient(135deg, #f59e0b, #d97706)"
          buttonShadow="0 4px 14px rgba(245,158,11,0.35)"
          theme={theme}
        />

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

        <CardAcao
          title="Chamar Gerente"
          description="Solicite a presença do gerente para autorizações ou situações especiais."
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
