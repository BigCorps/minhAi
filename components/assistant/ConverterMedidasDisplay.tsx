'use client';
// components/assistant/ConverterMedidasDisplay.tsx

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Paleta ────────────────────────────────────────────────────
const DARK = {
  bg: '#0f172a', bgCard: '#1e293b', border: '#334155',
  textPrimary: '#f1f5f9', textMuted: '#94a3b8', textFaint: '#475569',
  accent: '#0694a2', accentBg: 'rgba(6,148,162,0.10)',
  input: '#1e293b', inputBorder: '#475569',
};
const LIGHT = {
  bg: '#ffffff', bgCard: '#f8fafc', border: '#e2e8f0',
  textPrimary: '#0f172a', textMuted: '#64748b', textFaint: '#94a3b8',
  accent: '#0694a2', accentBg: 'rgba(6,148,162,0.07)',
  input: '#ffffff', inputBorder: '#cbd5e1',
};

// ── Tabelas de conversão ──────────────────────────────────────
type GrupoKey = 'peso' | 'comprimento' | 'volume' | 'temperatura' | 'area';

const CONVERSOES: Record<GrupoKey, {
  label: string;
  unidades: Record<string, number | null>;
  base: string;
  labels: Record<string, string>;
}> = {
  peso: {
    label: 'Peso',
    base: 'kg',
    unidades: { kg: 1, g: 1000, mg: 1_000_000, lb: 2.20462, oz: 35.274, t: 0.001 },
    labels: { kg: 'kg', g: 'g', mg: 'mg', lb: 'lb', oz: 'oz', t: 't' },
  },
  comprimento: {
    label: 'Comprimento',
    base: 'm',
    unidades: { m: 1, km: 0.001, cm: 100, mm: 1000, mi: 0.000621371, ft: 3.28084, in: 39.3701 },
    labels: { m: 'm', km: 'km', cm: 'cm', mm: 'mm', mi: 'mi', ft: 'ft', in: 'in' },
  },
  volume: {
    label: 'Volume',
    base: 'l',
    unidades: { l: 1, ml: 1000, m3: 0.001, gal: 0.264172, fl_oz: 33.814 },
    labels: { l: 'L', ml: 'mL', m3: 'm³', gal: 'gal', fl_oz: 'fl oz' },
  },
  temperatura: {
    label: 'Temperatura',
    base: 'C',
    unidades: { C: null, F: null, K: null },
    labels: { C: '°C', F: '°F', K: 'K' },
  },
  area: {
    label: 'Área',
    base: 'm2',
    unidades: { m2: 1, km2: 0.000001, cm2: 10000, ha: 0.0001, ft2: 10.7639, ac: 0.000247105 },
    labels: { m2: 'm²', km2: 'km²', cm2: 'cm²', ha: 'ha', ft2: 'ft²', ac: 'ac' },
  },
};

function converterTemperatura(valor: number, de: string, para: string): number {
  // Converte para Celsius primeiro
  let celsius: number;
  if (de === 'C') celsius = valor;
  else if (de === 'F') celsius = (valor - 32) * 5 / 9;
  else celsius = valor - 273.15; // K

  // Converte para destino
  if (para === 'C') return celsius;
  if (para === 'F') return celsius * 9 / 5 + 32;
  return celsius + 273.15; // K
}

function converter(valor: number, de: string, para: string, grupo: GrupoKey): number {
  if (de === para) return valor;
  if (grupo === 'temperatura') return converterTemperatura(valor, de, para);

  const unidades = CONVERSOES[grupo].unidades;
  const fatorDe = unidades[de] as number;
  const fatorPara = unidades[para] as number;
  // valor → base → destino
  const emBase = valor / fatorDe;
  return emBase * fatorPara;
}

function formatarResultado(valor: number): string {
  if (isNaN(valor) || !isFinite(valor)) return '—';
  if (Math.abs(valor) >= 1e9) return valor.toExponential(4);
  // Até 6 casas sig, sem zeros desnecessários
  const str = parseFloat(valor.toPrecision(6)).toString().replace('.', ',');
  return str;
}

// ── Componente ────────────────────────────────────────────────
interface Props {
  data?: { valor?: number; de?: string; para?: string; grupo?: GrupoKey };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function ConverterMedidasDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const P = theme === 'dark' ? DARK : LIGHT;

  const [grupo, setGrupo] = useState<GrupoKey>(data?.grupo ?? 'peso');
  const grupoData = CONVERSOES[grupo];
  const unidadeKeys = Object.keys(grupoData.unidades);

  const [unidadeDe, setUnidadeDe] = useState<string>(data?.de ?? grupoData.base);
  const [unidadePara, setUnidadePara] = useState<string>(
    data?.para ?? (unidadeKeys.find(k => k !== grupoData.base) ?? unidadeKeys[1])
  );
  const [valorInput, setValorInput] = useState<string>(
    data?.valor !== undefined ? String(data.valor) : '1'
  );

  // Recalcula resultado
  const valorNum = parseFloat(valorInput.replace(',', '.'));
  const resultado = isNaN(valorNum) ? NaN : converter(valorNum, unidadeDe, unidadePara, grupo);
  const resultadoStr = isNaN(resultado) ? '—' : formatarResultado(resultado);

  // Ao trocar grupo, resetar unidades para valores padrão
  function handleGrupoChange(novoGrupo: GrupoKey) {
    setGrupo(novoGrupo);
    const g = CONVERSOES[novoGrupo];
    const keys = Object.keys(g.unidades);
    setUnidadeDe(g.base);
    setUnidadePara(keys.find(k => k !== g.base) ?? keys[1]);
  }

  function trocarUnidades() {
    setUnidadeDe(unidadePara);
    setUnidadePara(unidadeDe);
  }

  // Cleanup de áudio
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // playText no mount
  useEffect(() => {
    if (!isNaN(resultado) && playText) {
      const deLabel = grupoData.labels[unidadeDe];
      const paraLabel = grupoData.labels[unidadePara];
      playText(
        `${valorInput} ${deLabel} equivale a ${formatarResultado(resultado)} ${paraLabel}`
      ).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${P.inputBorder}`, background: P.input,
    color: P.textPrimary, fontSize: 16, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${P.inputBorder}`, background: P.input,
    color: P.textPrimary, fontSize: 14, outline: 'none',
    flex: '0 0 100px', cursor: 'pointer',
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 460, background: P.bg,
        border: `1px solid ${P.border}`, borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        overflow: 'hidden', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${P.border}`,
          background: P.accentBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📐</span>
            <span style={{ color: P.textPrimary, fontWeight: 700, fontSize: 16 }}>
              Converter Medidas
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: P.textMuted, fontSize: 20, lineHeight: 1,
              padding: '2px 6px', borderRadius: 6,
            }}
          >✕</button>
        </div>

        {/* Seletor de grupo */}
        <div style={{
          display: 'flex', gap: 6, padding: '14px 20px',
          flexWrap: 'wrap', borderBottom: `1px solid ${P.border}`,
        }}>
          {(Object.keys(CONVERSOES) as GrupoKey[]).map(g => (
            <button
              key={g}
              onClick={() => handleGrupoChange(g)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `1px solid ${grupo === g ? P.accent : P.border}`,
                background: grupo === g ? P.accentBg : 'transparent',
                color: grupo === g ? P.accent : P.textMuted,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {CONVERSOES[g].label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Linha DE */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number"
              value={valorInput}
              onChange={e => setValorInput(e.target.value)}
              style={inputStyle}
              placeholder="0"
            />
            <select
              value={unidadeDe}
              onChange={e => setUnidadeDe(e.target.value)}
              style={selectStyle}
            >
              {unidadeKeys.map(k => (
                <option key={k} value={k}>{grupoData.labels[k]}</option>
              ))}
            </select>
          </div>

          {/* Botão trocar */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={trocarUnidades}
              style={{
                background: P.accentBg, border: `1px solid ${P.accent}`,
                borderRadius: 20, padding: '6px 18px',
                color: P.accent, cursor: 'pointer', fontSize: 18,
              }}
              title="Trocar unidades"
            >
              ⇅
            </button>
          </div>

          {/* Linha PARA */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              ...inputStyle as any,
              background: P.bgCard,
              color: P.accent,
              display: 'flex', alignItems: 'center',
              letterSpacing: '-0.5px',
            }}>
              {resultadoStr}
            </div>
            <select
              value={unidadePara}
              onChange={e => setUnidadePara(e.target.value)}
              style={selectStyle}
            >
              {unidadeKeys.map(k => (
                <option key={k} value={k}>{grupoData.labels[k]}</option>
              ))}
            </select>
          </div>

          {/* Resultado legível */}
          {!isNaN(resultado) && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: P.accentBg, border: `1px solid ${P.accent}`,
              color: P.accent, fontSize: 14, fontWeight: 600, textAlign: 'center',
            }}>
              {valorInput} {grupoData.labels[unidadeDe]} ={' '}
              {resultadoStr} {grupoData.labels[unidadePara]}
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
