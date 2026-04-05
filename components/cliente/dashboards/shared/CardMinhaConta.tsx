'use client';

// components/cliente/dashboards/shared/CardMinhaConta.tsx

import { User } from 'lucide-react';
import { SlugProfile } from '@/hooks/useProfile';

const TIPO_LABEL: Record<string, string> = {
  cliente: 'Cliente', colaborador: 'Colaborador', frentista: 'Frentista',
  atendente: 'Atendente', caixa: 'Caixa', gerente: 'Gerente',
  administrador: 'Administrador', totem: 'Totem',
};

const TIPO_COLOR: Record<string, { bg: string; text: string }> = {
  cliente:       { bg: 'rgba(236,72,153,0.12)',  text: '#ec4899' },
  colaborador:   { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  frentista:     { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
  atendente:     { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  caixa:         { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  gerente:       { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
  administrador: { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
  totem:         { bg: 'rgba(6,182,212,0.12)',   text: '#06b6d4' },
};

interface CardMinhaContaProps {
  profile: SlugProfile;
  theme: 'dark' | 'light';
}

export default function CardMinhaConta({ profile, theme }: CardMinhaContaProps) {
  const isDark     = theme === 'dark';
  const tipoColor  = TIPO_COLOR[profile.tipo] ?? TIPO_COLOR.colaborador;
  const tipoLabel  = TIPO_LABEL[profile.tipo]  ?? profile.tipo;
  const telefone   = profile.metadata?.telefone ?? null;

  const cardBg     = isDark ? 'rgba(30,41,59,0.8)'    : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.3)';
  const labelColor = isDark ? 'rgb(100,116,139)'       : 'rgb(148,163,184)';
  const valueColor = isDark ? 'rgb(226,232,240)'       : 'rgb(15,23,42)';
  const titleColor = isDark ? 'rgb(241,245,249)'       : 'rgb(15,23,42)';

  return (
    <div className="rounded-2xl p-6 shadow-lg border"
      style={{ background: cardBg, borderColor: cardBorder }}>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(168,85,247,0.1)' }}>
          <User className="w-6 h-6" style={{ color: isDark ? 'rgb(216,180,254)' : 'rgb(107,33,168)' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: titleColor }}>Minha Conta</h2>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: tipoColor.bg, color: tipoColor.text }}>
            {tipoLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Row label="Nome"         value={profile.nome}          labelColor={labelColor} valueColor={valueColor} />
        {profile.email && (
          <Row label="E-mail"     value={profile.email}         labelColor={labelColor} valueColor={valueColor} small />
        )}
        {profile.identificador && profile.identificador !== profile.email && (
          <Row label="Identificador" value={profile.identificador} labelColor={labelColor} valueColor={valueColor} />
        )}
        {telefone && (
          <Row label="Telefone"   value={telefone}              labelColor={labelColor} valueColor={valueColor} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, labelColor, valueColor, small }: {
  label: string; value: string;
  labelColor: string; valueColor: string;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: labelColor }}>
        {label}
      </p>
      <p className={`font-semibold break-all ${small ? 'text-sm' : ''}`} style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}
