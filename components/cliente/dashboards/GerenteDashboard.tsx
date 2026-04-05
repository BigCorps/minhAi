'use client';

// ============================================================
// components/cliente/dashboards/GerenteDashboard.tsx
// profile.tipo === 'gerente' | 'administrador'
//
// Funções:
//   - Relatório de Vendas  (RelatorioVendasDisplay)
//   - Ver Clientes         (VerClientesDisplay)
//   - Registrar Venda      (RegistrarVendaDisplay)
//   - Fechar Caixa         (FecharCaixaDisplay)
//   - Trocar Turno         (TrocarTurnoDisplay)
//   - Validar Cupom        (ValidarCupomDisplay)
//   - Minha Conta + Logout
// ============================================================

import { SlugProfile } from '@/hooks/useProfile';
import CardMinhaConta from './shared/CardMinhaConta';
import BotaoLogout from './shared/BotaoLogout';
import CardAcao from './shared/CardAcao';
import { BarChart2, Users, Zap, Lock, RefreshCw, Tag } from 'lucide-react';

interface Props {
  profile: SlugProfile;
  company: { id: string; slug: string; name: string; logo_url?: string | null };
  theme: 'dark' | 'light';
}

export default function GerenteDashboard({ profile, company, theme }: Props) {
  const isDark     = theme === 'dark';
  const titleColor = isDark ? 'rgb(241,245,249)' : 'rgb(15,23,42)';
  const muteColor  = isDark ? 'rgb(100,116,139)'  : 'rgb(148,163,184)';
  const isAdmin    = profile.tipo === 'administrador';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Saudação + Logout */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>
            Olá, {profile.nome.split(' ')[0]}!
          </h1>
          <p className="text-base" style={{ color: muteColor }}>
            {isAdmin ? 'Painel do administrador' : 'Painel do gerente'} · {company.name}
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
          title="Relatório de Vendas"
          description="Visualize o relatório completo de vendas com totais por período e método."
          functionKey="relatorio_vendas"
          companyId={company.id}
          iconBg="rgba(99,102,241,0.1)"
          icon={<BarChart2 className="w-6 h-6" />}
          iconColor="rgb(165,180,252)"
          iconColorLight="rgb(67,56,202)"
          buttonLabel="Ver Relatório"
          buttonGradient="linear-gradient(135deg, #6366f1, #4f46e5)"
          buttonShadow="0 4px 14px rgba(99,102,241,0.35)"
          theme={theme}
        />

        <CardAcao
          title="Ver Clientes"
          description="Consulte o cadastro completo de clientes e histórico de compras."
          functionKey="ver_clientes"
          companyId={company.id}
          iconBg="rgba(168,85,247,0.1)"
          icon={<Users className="w-6 h-6" />}
          iconColor="rgb(216,180,254)"
          iconColorLight="rgb(107,33,168)"
          buttonLabel="Ver Clientes"
          buttonGradient="linear-gradient(135deg, #a855f7, #7c3aed)"
          buttonShadow="0 4px 14px rgba(168,85,247,0.35)"
          theme={theme}
        />

        <CardAcao
          title="Registrar Venda"
          description="Registre manualmente uma venda em dinheiro, PIX ou cartão."
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

      </div>

    </div>
  );
}
