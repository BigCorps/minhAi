'use client';
// components/assistant/CalculadoraIMCDisplay.tsx

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// ── Paleta ────────────────────────────────────────────────────
const DARK = {
  bg: '#0f172a', bgCard: '#1e293b', border: '#334155',
  textPrimary: '#f1f5f9', textMuted: '#94a3b8', textFaint: '#475569',
  accent: '#7c3aed', accentBg: 'rgba(124,58,237,0.10)',
  input: '#1e293b', inputBorder: '#475569',
};
const LIGHT = {
  bg: '#ffffff', bgCard: '#f8fafc', border: '#e2e8f0',
  textPrimary: '#0f172a', textMuted: '#64748b', textFaint: '#94a3b8',
  accent: '#7c3aed', accentBg: 'rgba(124,58,237,0.07)',
  input: '#ffffff', inputBorder: '#cbd5e1',
};

// ── Classificações da OMS ─────────────────────────────────────
const CLASSIFICACOES = [
  { min: 0,    max: 16,   label: 'Magreza grave',     cor: '#ef4444', emoji: '⚠️' },
  { min: 16,   max: 17,   label: 'Magreza moderada',  cor: '#f97316', emoji: '⚠️' },
  { min: 17,   max: 18.5, label: 'Magreza leve',      cor: '#fbbf24', emoji: '⚠️' },
  { min: 18.5, max: 25,   label: 'Peso normal',        cor: '#10b981', emoji: '✅' },
  { min: 25,   max: 30,   label: 'Sobrepeso',          cor: '#fbbf24', emoji: '⚠️' },
  { min: 30,   max: 35,   label: 'Obesidade grau I',   cor: '#f97316', emoji: '⚠️' },
  { min: 35,   max: 40,   label: 'Obesidade grau II',  cor: '#ef4444', emoji: '⚠️' },
  { min: 40,   max: Infinity, label: 'Obesidade grau III', cor: '#dc2626', emoji: '🚨' },
];

function classificarIMC(imc: number) {
  return CLASSIFICACOES.find(c => imc >= c.min && imc < c.max) ?? CLASSIFICACOES[CLASSIFICACOES.length - 1];
}

// ── Componente ────────────────────────────────────────────────
interface Props {
  data?: { peso?: number; altura?: number };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function CalculadoraIMCDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const P = theme === 'dark' ? DARK : LIGHT;

  const [pesoStr, setPesoStr] = useState(data?.peso ? String(data.peso) : '');
  const [alturaStr, setAlturaStr] = useState(data?.altura ? String(data.altura) : '');
  const [unidadeAltura, setUnidadeAltura] = useState<'m' | 'cm'>('kg' === 'kg' ? 'cm' : 'm'); // default cm

  // Cleanup de áudio
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // Cálculo derivado
  const resultado = useMemo(() => {
    const peso = parseFloat(pesoStr.replace(',', '.'));
    let alturaM = parseFloat(alturaStr.replace(',', '.'));
    if (isNaN(peso) || isNaN(alturaM) || peso <= 0 || alturaM <= 0) return null;

    if (unidadeAltura === 'cm') alturaM = alturaM / 100;
    if (alturaM < 0.5 || alturaM > 3) return null; // sanidade

    const imc = peso / (alturaM * alturaM);
    const classe = classificarIMC(imc);
    return { imc, classe };
  }, [pesoStr, alturaStr, unidadeAltura]);

  // playText no mount se vier dados pré-preenchidos
  useEffect(() => {
    if (resultado && playText) {
      playText(
        `Seu IMC é ${resultado.imc.toFixed(1)}, classificado como ${resultado.classe.label}.`
      ).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `1px solid ${P.inputBorder}`, background: P.input,
    color: P.textPrimary, fontSize: 18, fontWeight: 700,
    outline: 'none', boxSizing: 'border-box', textAlign: 'center',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 6, display: 'block',
  };

  // Porcentagem do IMC na barra (0-50 → 0-100%)
  const imcPct = resultado ? Math.min(resultado.imc / 50 * 100, 100) : 0;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: P.bg,
        border: `1px solid ${P.border}`, borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        overflow: 'hidden', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${P.border}`,
          background: P.accentBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            
            <span style={{ color: P.textPrimary, fontWeight: 700, fontSize: 16 }}>
              Calculadora de IMC
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: P.textMuted, fontSize: 20, lineHeight: 1, padding: '2px 6px',
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

          {/* Campos de entrada */}
          <div style={{ display: 'flex', gap: 14 }}>
            {/* Peso */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Peso</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={inputStyle}
                  type="number"
                  value={pesoStr}
                  onChange={e => setPesoStr(e.target.value)}
                  placeholder="70"
                  min="1"
                  max="500"
                />
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: P.textMuted, fontSize: 13, fontWeight: 600, pointerEvents: 'none',
                }}>kg</span>
              </div>
            </div>

            {/* Altura */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Altura</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={inputStyle}
                  type="number"
                  value={alturaStr}
                  onChange={e => setAlturaStr(e.target.value)}
                  placeholder={unidadeAltura === 'cm' ? '170' : '1,70'}
                  min="1"
                />
                <button
                  onClick={() => setUnidadeAltura(u => u === 'cm' ? 'm' : 'cm')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: P.accentBg, border: `1px solid ${P.accent}`,
                    borderRadius: 6, padding: '2px 6px',
                    color: P.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {unidadeAltura}
                </button>
              </div>
            </div>
          </div>

          {/* Resultado */}
          {resultado ? (
            <>
              {/* IMC em destaque */}
              <div style={{
                textAlign: 'center', padding: '20px',
                background: P.bgCard, borderRadius: 16,
                border: `2px solid ${resultado.classe.cor}`,
              }}>
                <div style={{ fontSize: 13, color: P.textMuted, fontWeight: 600, marginBottom: 4 }}>
                  SEU IMC
                </div>
                <div style={{ fontSize: 52, fontWeight: 800, color: resultado.classe.cor, lineHeight: 1 }}>
                  {resultado.imc.toFixed(1)}
                </div>
                <div style={{
                  marginTop: 8, fontSize: 15, fontWeight: 700,
                  color: resultado.classe.cor,
                }}>
                  {resultado.classe.emoji} {resultado.classe.label}
                </div>
              </div>

              {/* Barra visual */}
              <div>
                <div style={{
                  height: 10, borderRadius: 10,
                  background: 'linear-gradient(to right, #ef4444, #fbbf24, #10b981, #fbbf24, #f97316, #ef4444, #dc2626)',
                  position: 'relative', overflow: 'visible',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: `${imcPct}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 18, height: 18,
                    borderRadius: '50%',
                    background: P.bg,
                    border: `3px solid ${resultado.classe.cor}`,
                    boxShadow: `0 0 0 3px ${resultado.classe.cor}40`,
                    zIndex: 2,
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: P.textMuted, marginTop: 4,
                }}>
                  <span>0</span>
                  <span>18.5</span>
                  <span>25</span>
                  <span>30</span>
                  <span>40+</span>
                </div>
              </div>

              {/* Tabela de classificações */}
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${P.border}`,
              }}>
                {CLASSIFICACOES.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 14px', fontSize: 13,
                      background: resultado?.classe.label === c.label ? `${c.cor}18` : 'transparent',
                      borderBottom: i < CLASSIFICACOES.length - 1 ? `1px solid ${P.border}` : 'none',
                      fontWeight: resultado?.classe.label === c.label ? 700 : 400,
                    }}
                  >
                    <span style={{ color: c.cor }}>● {c.label}</span>
                    <span style={{ color: P.textMuted, fontSize: 12 }}>
                      {c.max === Infinity ? `≥ ${c.min}` : `${c.min} – ${c.max}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Aviso */}
              <p style={{ fontSize: 11, color: P.textFaint, textAlign: 'center', margin: 0 }}>
                O IMC é uma referência geral e não substitui avaliação médica.
              </p>
            </>
          ) : (
            <div style={{
              textAlign: 'center', padding: '30px 0',
              color: P.textMuted, fontSize: 14,
            }}>
              Preencha o peso e a altura para calcular
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${P.border}`,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 24px', borderRadius: 10, fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
              background: P.accentBg, border: `1px solid ${P.accent}`,
              color: P.accent,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
