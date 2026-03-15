'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

const DARK = {
  overlay: 'rgba(0,0,0,0.7)',
  bg: '#0f172a',
  border: 'rgba(255,255,255,0.1)',
  text: '#ffffff',
  subtext: '#94a3b8',
  input: '#1e293b',
  inputBorder: 'rgba(255,255,255,0.15)',
  btnPrimary: '#2563eb',
  btnSecondary: 'rgba(255,255,255,0.05)',
  btnSecondaryBorder: 'rgba(255,255,255,0.1)',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.1)',
};

const LIGHT = {
  overlay: 'rgba(0,0,0,0.5)',
  bg: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtext: '#64748b',
  input: '#f8fafc',
  inputBorder: '#cbd5e1',
  btnPrimary: '#2563eb',
  btnSecondary: '#f1f5f9',
  btnSecondaryBorder: '#e2e8f0',
  success: '#16a34a',
  successBg: '#f0fdf4',
};

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  onClose: () => void;
  isDark?: boolean;
}

export default function PixLinkModal({ onClose, isDark = true }: Props) {
  const p = isDark ? DARK : LIGHT;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [valor, setValor] = useState('');
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany(data[0]);
    }
  }

  const baseUrl = selectedCompany
    ? `https://eai.app.br/pixbigcorps/${selectedCompany.slug}`
    : '';
  const fullUrl = valor && parseFloat(valor) > 0
    ? `${baseUrl}/${valor}`
    : baseUrl;

  function copy() {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: p.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '460px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: p.text, fontWeight: 700, fontSize: '18px', margin: 0 }}>
              Link PIX
            </h2>
            <p style={{ color: p.subtext, fontSize: '13px', margin: '4px 0 0' }}>
              Gere um link de pagamento para compartilhar
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: p.subtext,
            cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px',
          }}>×</button>
        </div>

        {/* Selecionar assistente */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: p.subtext, fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Assistente
          </label>
          <select
            value={selectedCompany?.id ?? ''}
            onChange={(e) => setSelectedCompany(companies.find(c => c.id === e.target.value) ?? null)}
            style={{
              width: '100%', padding: '10px 14px',
              background: p.input, border: `1px solid ${p.inputBorder}`,
              borderRadius: '10px', color: p.text, fontSize: '14px',
              outline: 'none', cursor: 'pointer',
            }}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Valor opcional */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: p.subtext, fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Valor (opcional)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: p.subtext, fontSize: '14px', fontWeight: 700,
            }}>R$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Deixe vazio para o cliente digitar"
              style={{
                width: '100%', padding: '10px 14px 10px 42px',
                background: p.input, border: `1px solid ${p.inputBorder}`,
                borderRadius: '10px', color: p.text, fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* URL gerada */}
        {fullUrl && (
          <div style={{
            background: isDark ? 'rgba(37,99,235,0.08)' : '#eff6ff',
            border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe'}`,
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '20px',
          }}>
            <p style={{ color: p.subtext, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Link gerado
            </p>
            <p style={{ color: isDark ? '#60a5fa' : '#2563eb', fontSize: '13px', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
              {fullUrl}
            </p>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={copy}
            disabled={!fullUrl}
            style={{
              flex: 1, padding: '12px',
              background: copied ? '#16a34a' : p.btnPrimary,
              border: 'none', borderRadius: '10px',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: fullUrl ? 'pointer' : 'not-allowed', opacity: fullUrl ? 1 : 0.5,
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ Copiado!' : 'Copiar Link'}
          </button>
          <button
            onClick={() => fullUrl && window.open(fullUrl, '_blank')}
            disabled={!fullUrl}
            style={{
              padding: '12px 16px',
              background: p.btnSecondary,
              border: `1px solid ${p.btnSecondaryBorder}`,
              borderRadius: '10px',
              color: p.text, fontWeight: 700, fontSize: '14px',
              cursor: fullUrl ? 'pointer' : 'not-allowed', opacity: fullUrl ? 1 : 0.5,
            }}
          >
            ↗
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
