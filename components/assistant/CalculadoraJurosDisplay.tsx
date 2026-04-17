'use client';
// components/assistant/CalculadoraJurosDisplay.tsx

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// ── Paleta ────────────────────────────────────────────────────
const DARK = {
  bg: '#0f172a', bgCard: '#1e293b', border: '#334155',
  textPrimary: '#f1f5f9', textMuted: '#94a3b8', textFaint: '#475569',
  accent: '#057a55', accentBg: 'rgba(5,122,85,0.10)',
  input: '#1e293b', inputBorder: '#475569',
  positive: '#10b981', negative: '#f87171',
};
const LIGHT = {
  bg: '#ffffff', bgCard: '#f8fafc', border: '#e2e8f0',
  textPrimary: '#0f172a', textMuted: '#64748b', textFaint: '#94a3b8',
  accent: '#057a55', accentBg: 'rgba(5,122,85,0.07)',
  input: '#ffffff', inputBorder: '#cbd5e1',
  positive: '#059669', negative: '#ef4444',
};

type Modo = 'simples' | 'compostos' | 'parcelas';
type PeriodoTipo = 'mes' | 'ano';

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(str: string): number {
  const limpo = str.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

interface Resultado {
  juros: number;
  montante: number;
  tabela: { periodo: number; saldo: number; juros: number }[];
  pmt?: number; // parcela (modo Price)
}

function calcularSimples(capital: number, taxaMes: number, meses: number): Resultado {
  const j = capital * taxaMes * meses;
  const tabela = Array.from({ length: Math.min(meses, 360) }, (_, i) => ({
    periodo: i + 1,
    saldo: capital + capital * taxaMes * (i + 1),
    juros: capital * taxaMes,
  }));
  return { juros: j, montante: capital + j, tabela };
}

function calcularCompostos(capital: number, taxaMes: number, meses: number): Resultado {
  const fator = Math.pow(1 + taxaMes, meses);
  const montante = capital * fator;
  const tabela = Array.from({ length: Math.min(meses, 360) }, (_, i) => {
    const saldoAnterior = capital * Math.pow(1 + taxaMes, i);
    const saldo = capital * Math.pow(1 + taxaMes, i + 1);
    return { periodo: i + 1, saldo, juros: saldo - saldoAnterior };
  });
  return { juros: montante - capital, montante, tabela };
}

function calcularParcelas(capital: number, taxaMes: number, meses: number): Resultado {
  if (taxaMes === 0) {
    const pmt = capital / meses;
    const tabela = Array.from({ length: Math.min(meses, 360) }, (_, i) => ({
      periodo: i + 1,
      saldo: capital - pmt * (i + 1),
      juros: 0,
    }));
    return { juros: 0, montante: capital, pmt, tabela };
  }
  const fator = Math.pow(1 + taxaMes, meses);
  const pmt = capital * (taxaMes * fator) / (fator - 1);
  let saldo = capital;
  const tabela = Array.from({ length: Math.min(meses, 360) }, (_, i) => {
    const juros = saldo * taxaMes;
    const amortizacao = pmt - juros;
    saldo -= amortizacao;
    return { periodo: i + 1, saldo: Math.max(0, saldo), juros };
  });
  const totalPago = pmt * meses;
  return { juros: totalPago - capital, montante: totalPago, pmt, tabela };
}

// ── Componente ────────────────────────────────────────────────
interface Props {
  data?: { capital?: number; taxa?: number; periodo?: number; modo?: Modo };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

export default function CalculadoraJurosDisplay({ data, onClose, theme = 'dark', playText }: Props) {
  const P = theme === 'dark' ? DARK : LIGHT;

  const [modo, setModo] = useState<Modo>(data?.modo ?? 'compostos');
  const [capitalStr, setCapitalStr] = useState(data?.capital ? formatBRL(data.capital) : 'R$ 10.000,00');
  const [taxaStr, setTaxaStr] = useState(data?.taxa ? String(data.taxa) : '2,5');
  const [periodoStr, setPeriodoStr] = useState(data?.periodo ? String(data.periodo) : '12');
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes');

  // Cleanup de áudio
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // Cálculos derivados
  const resultado = useMemo<Resultado | null>(() => {
    const capital = parseBRL(capitalStr);
    const taxaRaw = parseFloat(taxaStr.replace(',', '.'));
    const periodoRaw = parseInt(periodoStr);

    if (!capital || !taxaRaw || !periodoRaw || capital <= 0 || taxaRaw <= 0 || periodoRaw <= 0) return null;

    // Normaliza para taxa mensal
    const taxaMes = periodoTipo === 'ano'
      ? Math.pow(1 + taxaRaw / 100, 1 / 12) - 1
      : taxaRaw / 100;

    // Normaliza período para meses
    const meses = periodoTipo === 'ano' ? periodoRaw * 12 : periodoRaw;

    if (modo === 'simples') return calcularSimples(capital, taxaMes, meses);
    if (modo === 'compostos') return calcularCompostos(capital, taxaMes, meses);
    return calcularParcelas(capital, taxaMes, meses);
  }, [capitalStr, taxaStr, periodoStr, periodoTipo, modo]);

  // playText no mount
  useEffect(() => {
    if (resultado && playText) {
      const msg = resultado.pmt
        ? `Parcela de ${formatBRL(resultado.pmt)} por ${periodoStr} ${periodoTipo === 'mes' ? 'meses' : 'anos'}, totalizando ${formatBRL(resultado.montante)}.`
        : `Juros de ${formatBRL(resultado.juros)}, montante final de ${formatBRL(resultado.montante)}.`;
      playText(msg).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${P.inputBorder}`, background: P.input,
    color: P.textPrimary, fontSize: 15, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: P.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 4,
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: P.bg,
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
            <span style={{ fontSize: 22 }}>💰</span>
            <span style={{ color: P.textPrimary, fontWeight: 700, fontSize: 16 }}>
              Calculadora de Juros
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

        {/* Toggle de modo */}
        <div style={{
          display: 'flex', gap: 6, padding: '14px 20px',
          borderBottom: `1px solid ${P.border}`,
        }}>
          {(['simples', 'compostos', 'parcelas'] as Modo[]).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: `1px solid ${modo === m ? P.accent : P.border}`,
                background: modo === m ? P.accentBg : 'transparent',
                color: modo === m ? P.accent : P.textMuted,
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {m === 'simples' ? 'Simples' : m === 'compostos' ? 'Compostos' : 'Parcelas'}
            </button>
          ))}
        </div>

        {/* Campos */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Capital */}
          <div>
            <div style={labelStyle}>Capital inicial</div>
            <input
              style={inputStyle}
              value={capitalStr}
              onChange={e => setCapitalStr(e.target.value)}
              onFocus={e => {
                const num = parseBRL(e.target.value);
                if (num) setCapitalStr(String(num));
              }}
              onBlur={e => {
                const num = parseBRL(e.target.value);
                if (num) setCapitalStr(formatBRL(num));
              }}
              placeholder="R$ 10.000,00"
            />
          </div>

          {/* Taxa + período */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <div style={labelStyle}>Taxa (%)</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={taxaStr}
                  onChange={e => setTaxaStr(e.target.value)}
                  placeholder="2,5"
                />
                <select
                  value={periodoTipo}
                  onChange={e => setPeriodoTipo(e.target.value as PeriodoTipo)}
                  style={{
                    padding: '10px 8px', borderRadius: 10, fontSize: 13,
                    border: `1px solid ${P.inputBorder}`, background: P.input,
                    color: P.textPrimary, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="mes">ao mês</option>
                  <option value="ano">ao ano</option>
                </select>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Período</div>
              <input
                style={inputStyle}
                value={periodoStr}
                onChange={e => setPeriodoStr(e.target.value)}
                placeholder="12"
                type="number"
                min="1"
              />
            </div>
          </div>

          {/* Resultados */}
          {resultado && (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 10, marginTop: 4,
              }}>
                {resultado.pmt && (
                  <div style={{
                    gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 12,
                    background: P.accentBg, border: `1px solid ${P.accent}`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, color: P.textMuted, fontWeight: 600 }}>PARCELA MENSAL</div>
                    <div style={{ fontSize: 22, color: P.accent, fontWeight: 800, marginTop: 2 }}>
                      {formatBRL(resultado.pmt)}
                    </div>
                  </div>
                )}
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: P.bgCard, border: `1px solid ${P.border}`,
                }}>
                  <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 600 }}>
                    {resultado.pmt ? 'TOTAL JUROS' : 'JUROS'}
                  </div>
                  <div style={{ fontSize: 16, color: P.positive, fontWeight: 700, marginTop: 2 }}>
                    {formatBRL(resultado.juros)}
                  </div>
                </div>
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: P.bgCard, border: `1px solid ${P.border}`,
                }}>
                  <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 600 }}>
                    {resultado.pmt ? 'TOTAL PAGO' : 'MONTANTE'}
                  </div>
                  <div style={{ fontSize: 16, color: P.textPrimary, fontWeight: 700, marginTop: 2 }}>
                    {formatBRL(resultado.montante)}
                  </div>
                </div>
              </div>

              {/* Tabela de evolução (até 12 períodos) */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  Evolução por período (primeiros {Math.min(resultado.tabela.length, 12)})
                </div>
                <div style={{
                  maxHeight: 200, overflowY: 'auto',
                  border: `1px solid ${P.border}`, borderRadius: 10,
                  background: P.bgCard,
                }}>
                  {resultado.tabela.slice(0, 12).map(row => (
                    <div
                      key={row.periodo}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 14px', fontSize: 13,
                        borderBottom: `1px solid ${P.border}`,
                        color: P.textPrimary,
                      }}
                    >
                      <span style={{ color: P.textMuted }}>
                        {periodoTipo === 'ano' ? `Mês ${row.periodo}` : `Mês ${row.periodo}`}
                      </span>
                      <span style={{ color: P.positive }}>
                        +{formatBRL(row.juros)}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        {formatBRL(row.saldo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
