// components/dashboard/vendas/SecaoFiscalProduto.tsx
// Seção colapsável de dados fiscais para o ProdutoModal

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, AlertCircle, Info } from 'lucide-react';

interface DadosFiscais {
  ncm: string;
  cfop: number;
  cest?: string;
  origem_produto: number;
}

interface SecaoFiscalProdutoProps {
  dados: DadosFiscais;
  onChange: (dados: DadosFiscais) => void;
  theme?: 'dark' | 'light';
  required?: boolean;
  showHelp?: boolean;
}

const ORIGENS_MERCADORIA = [
  { value: 0, label: '0 - Nacional' },
  { value: 1, label: '1 - Estrangeira (importação direta)' },
  { value: 2, label: '2 - Estrangeira (adquirida no mercado interno)' },
  { value: 3, label: '3 - Nacional com conteúdo de importação > 40%' },
  { value: 4, label: '4 - Nacional (produção em conformidade)' },
  { value: 5, label: '5 - Nacional com conteúdo de importação <= 40%' },
  { value: 6, label: '6 - Estrangeira (importação direta sem similar nacional)' },
  { value: 7, label: '7 - Estrangeira (adquirida no mercado interno sem similar)' },
  { value: 8, label: '8 - Nacional (conteúdo de importação > 70%)' },
];

export default function SecaoFiscalProduto({
  dados,
  onChange,
  theme = 'dark',
  required = false,
  showHelp = true,
}: SecaoFiscalProdutoProps) {
  const [expandido, setExpandido] = useState(false);
  const isDark = theme === 'dark';

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    warning: '#f59e0b',
  };

  const handleChange = (field: keyof DadosFiscais, value: any) => {
    onChange({ ...dados, [field]: value });
  };

  const validarNCM = (ncm: string): string | null => {
    const numbers = ncm.replace(/\D/g, '');
    if (numbers.length !== 8) {
      return 'NCM deve ter exatamente 8 dígitos';
    }
    if (numbers === '00000000') {
      return 'NCM inválido para NF-e';
    }
    return null;
  };

  const ncmError = dados.ncm ? validarNCM(dados.ncm) : null;
  const ncmValido = dados.ncm && !ncmError;

  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: C.border }}
    >
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:opacity-80"
        style={{ backgroundColor: C.bgSecondary }}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" style={{ color: C.accent }} />
          <div className="text-left">
            <h4 className="text-sm font-bold" style={{ color: C.text }}>
              Dados Fiscais
              {required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <p className="text-xs" style={{ color: C.textMuted }}>
              {expandido ? 'Clique para recolher' : 'Clique para expandir'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador de preenchimento */}
          {!expandido && (
            <>
              {ncmValido && dados.cfop ? (
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
                >
                  ✓ Preenchido
                </span>
              ) : (
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: C.warning }}
                >
                  Incompleto
                </span>
              )}
            </>
          )}

          {expandido ? (
            <ChevronUp className="w-5 h-5" style={{ color: C.textMuted }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: C.textMuted }} />
          )}
        </div>
      </button>

      {/* Conteúdo colapsável */}
      {expandido && (
        <div className="px-4 py-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          {/* Aviso informativo */}
          {showHelp && (
            <div
              className="rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            >
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.accent }} />
              <div className="text-xs" style={{ color: C.text }}>
                <p className="font-semibold mb-1">Sobre dados fiscais</p>
                <p style={{ color: C.textMuted }}>
                  Estes dados são usados apenas na emissão de notas fiscais (NF-e).
                  Não afetam buscas ou embeddings de IA.
                </p>
              </div>
            </div>
          )}

          {/* NCM */}
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                NCM (Nomenclatura Comum do Mercosul)
                <span className="text-red-500 ml-1">*</span>
              </span>
              <span className="text-xs block mt-0.5" style={{ color: C.textMuted }}>
                8 dígitos obrigatórios para NF-e
              </span>
            </label>
            <input
              type="text"
              value={dados.ncm}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                handleChange('ncm', value);
              }}
              placeholder="00000000"
              maxLength={8}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: C.bg,
                borderColor: ncmError ? '#ef4444' : C.border,
                color: C.text,
              }}
            />
            {ncmError && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-red-500">{ncmError}</span>
              </div>
            )}
            {ncmValido && (
              <p className="text-xs mt-1.5" style={{ color: '#22c55e' }}>
                ✓ NCM válido
              </p>
            )}
          </div>

          {/* CFOP */}
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                CFOP (Código Fiscal de Operações)
                <span className="text-red-500 ml-1">*</span>
              </span>
              <span className="text-xs block mt-0.5" style={{ color: C.textMuted }}>
                Padrão: 5102 (venda dentro do estado)
              </span>
            </label>
            <select
              value={dados.cfop || ''}
              onChange={(e) => handleChange('cfop', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: C.bg,
                borderColor: C.border,
                color: C.text,
              }}
            >
              <option value="">Selecione o CFOP</option>
              <option value="5102">5102 - Venda dentro do estado</option>
              <option value="6102">6102 - Venda fora do estado</option>
              <option value="5405">5405 - Venda de produção própria</option>
              <option value="6404">6404 - Venda de produção fora do estado</option>
            </select>
          </div>

          {/* CEST (opcional) */}
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                CEST (opcional)
              </span>
              <span className="text-xs block mt-0.5" style={{ color: C.textMuted }}>
                Apenas para produtos sujeitos à substituição tributária
              </span>
            </label>
            <input
              type="text"
              value={dados.cest || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                handleChange('cest', value || undefined);
              }}
              placeholder="0000000"
              maxLength={7}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: C.bg,
                borderColor: C.border,
                color: C.text,
              }}
            />
          </div>

          {/* Origem da Mercadoria */}
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                Origem da Mercadoria
                <span className="text-red-500 ml-1">*</span>
              </span>
              <span className="text-xs block mt-0.5" style={{ color: C.textMuted }}>
                Conforme tabela SEFAZ
              </span>
            </label>
            <select
              value={dados.origem_produto}
              onChange={(e) => handleChange('origem_produto', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: C.bg,
                borderColor: C.border,
                color: C.text,
              }}
            >
              {ORIGENS_MERCADORIA.map((origem) => (
                <option key={origem.value} value={origem.value}>
                  {origem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nota sobre assistente */}
          <div
            className="rounded-lg p-3 border"
            style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
          >
            <p className="text-xs" style={{ color: C.textMuted }}>
              💡 <strong>Dica:</strong> Se não souber o NCM, deixe em branco.
              O assistente fiscal pode sugerir automaticamente durante a emissão da nota.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
