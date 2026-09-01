'use client';

import { Maximize2, MessageCircle, Volume2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import FuncionarIAAvatarPhoto from './FuncionarIAAvatarPhoto';
import { contrastTextColor, type FuncionarIAVisualConfig } from '@/lib/funcionaria-visual';

type Props = FuncionarIAVisualConfig & {
  companyName?: string;
  allowSpeechPreview?: boolean;
  compact?: boolean;
  showExpandButton?: boolean;
  className?: string;
};

export default function FuncionarIAVisualPreview({
  counter = 'nenhum',
  logoPlacement = 'cracha',
  companyName = 'Sua empresa',
  primaryColor,
  secondaryColor,
  shirtColor,
  shirtDetailColor,
  uniformLogoUrl,
  companyLogoUrl,
  backgroundPreset,
  backgroundUrl,
  allowSpeechPreview = true,
  compact = true,
  showExpandButton = false,
  className = '',
}: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!speaking) return;
    const timeout = window.setTimeout(() => setSpeaking(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [speaking]);

  const buttonText = contrastTextColor(primaryColor);

  return (
    <div className={`overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-sm ${className}`}>
      <FuncionarIAAvatarPhoto
        counter={counter}
        logoPlacement={logoPlacement}
        logoPlacement={logoPlacement}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        shirtColor={shirtColor}
        shirtDetailColor={shirtDetailColor}
        uniformLogoUrl={uniformLogoUrl}
        companyLogoUrl={companyLogoUrl}
        backgroundPreset={backgroundPreset}
        backgroundUrl={backgroundUrl}
        speaking={speaking}
        compact={compact}
      />
      <div className="border-t border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">FuncionarIA da {companyName}</div>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">Camisa, detalhes, crachá, fundo e cores ao vivo.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showExpandButton && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <Maximize2 className="h-4 w-4" />
                Ampliar
              </button>
            )}
            {allowSpeechPreview && (
              <button
                type="button"
                onClick={() => setSpeaking(true)}
                disabled={speaking}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-60"
                style={{ backgroundColor: primaryColor, color: buttonText }}
              >
                {speaking ? <Volume2 className="h-4 w-4 animate-pulse" /> : <MessageCircle className="h-4 w-4" />}
                {speaking ? 'Falando…' : 'Simular fala'}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-700 backdrop-blur hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Fechar
            </button>
            <div className="flex-1 p-4 sm:p-6">
              <FuncionarIAAvatarPhoto
        counter={counter}
        logoPlacement={logoPlacement}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                shirtColor={shirtColor}
                shirtDetailColor={shirtDetailColor}
                uniformLogoUrl={uniformLogoUrl}
                companyLogoUrl={companyLogoUrl}
                backgroundPreset={backgroundPreset}
                backgroundUrl={backgroundUrl}
                        speaking={speaking}
                compact={false}
                className="h-full"
              />
            </div>
            <div className="border-t border-slate-100 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-black text-slate-950">FuncionarIA da {companyName}</div>
                  <p className="mt-0.5 text-sm text-slate-500">Prévia ampliada da personagem, uniforme, crachá e cenário.</p>
                </div>
                {allowSpeechPreview && (
                  <button
                    type="button"
                    onClick={() => setSpeaking(true)}
                    disabled={speaking}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-60"
                    style={{ backgroundColor: primaryColor, color: buttonText }}
                  >
                    {speaking ? <Volume2 className="h-4 w-4 animate-pulse" /> : <MessageCircle className="h-4 w-4" />}
                    {speaking ? 'Falando…' : 'Simular fala'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
