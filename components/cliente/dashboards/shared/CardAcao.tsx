
'use client';

// ============================================================
// components/cliente/dashboards/shared/CardAcao.tsx
//
// Card de ação genérico — botão que abre um modal do ActionModals
// via evento voiceAssistantFunctionClick (mesmo mecanismo do
// VoiceAssistant e do carrossel).
//
// Uso:
//   <CardAcao
//     title="Registrar Venda"
//     description="Registre uma venda rápida..."
//     functionKey="registrar_venda"
//     companyId={company.id}
//     iconBg="rgba(59,130,246,0.1)"
//     icon={<Zap className="w-6 h-6" />}
//     iconColor="rgb(147,197,253)"
//     buttonLabel="Abrir"
//     buttonGradient="linear-gradient(135deg, #3b82f6, #6366f1)"
//     theme={theme}
//   />
// ============================================================

import React from 'react';

interface CardAcaoProps {
  title: string;
  description: string;
  /** function_key do ActionModals / VoiceAssistant */
  functionKey: string;
  companyId: string;
  /** Cor de fundo do ícone */
  iconBg: string;
  /** Elemento ícone Lucide */
  icon: React.ReactNode;
  /** Cor do ícone (dark) */
  iconColor: string;
  /** Cor do ícone (light) */
  iconColorLight?: string;
  /** Texto do botão */
  buttonLabel: string;
  /** Gradient CSS do botão */
  buttonGradient?: string;
  /** Cor sólida do botão (alternativa ao gradient) */
  buttonColor?: string;
  /** Box shadow do botão */
  buttonShadow?: string;
  /** Dados extras passados para o modal */
  extraData?: Record<string, any>;
  theme: 'dark' | 'light';
  /** Layout: flex (padrão) ou fill (ocupa altura total do pai) */
  fill?: boolean;
}

export default function CardAcao({
  title,
  description,
  functionKey,
  companyId,
  iconBg,
  icon,
  iconColor,
  iconColorLight,
  buttonLabel,
  buttonGradient,
  buttonColor,
  buttonShadow,
  extraData,
  theme,
  fill = false,
}: CardAcaoProps) {
  const isDark = theme === 'dark';

  const cardBg     = isDark ? 'rgba(30,41,59,0.8)'    : 'rgba(255,255,255,0.9)';
  const cardBorder = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(203,213,225,0.5)';
  const titleColor = isDark ? 'rgb(241,245,249)'       : 'rgb(15,23,42)';
  const muteColor  = isDark ? 'rgb(100,116,139)'       : 'rgb(148,163,184)';
  const resolvedIconColor = isDark ? iconColor : (iconColorLight ?? iconColor);

  function handleClick() {
    window.dispatchEvent(new CustomEvent('voiceAssistantFunctionClick', {
      detail: { functionKey, companyId, ...extraData },
    }));
  }

  const btnStyle: React.CSSProperties = {
    background: buttonGradient ?? buttonColor ?? '#3b82f6',
    color: '#ffffff',
    boxShadow: buttonShadow ?? (buttonGradient ? `0 4px 14px rgba(59,130,246,0.35)` : undefined),
  };

  return (
    <div
      className={`rounded-2xl p-6 shadow-lg border flex flex-col ${fill ? 'h-full' : ''}`}
      style={{ background: cardBg, borderColor: cardBorder }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: resolvedIconColor }}
        >
          {icon}
        </div>
        <h2 className="text-xl font-bold" style={{ color: titleColor }}>
          {title}
        </h2>
      </div>

      <p className="text-sm mb-6 flex-1" style={{ color: muteColor }}>
        {description}
      </p>

      <button
        onClick={handleClick}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        style={btnStyle}
      >
        {icon && React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        {buttonLabel}
      </button>
    </div>
  );
}
