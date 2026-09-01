// components/dashboard/vendas/PreviewNotaFiscal.tsx
// Preview em tempo real dos dados da NF-e coletados pelo assistente

'use client';

import { useMemo } from 'react';
import { 
  User, 
  Package, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  Hash,
} from 'lucide-react';

interface ItemNota {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  produto_id?: string;
  ncm_sugerido?: boolean;
}

interface DadosNota {
  destinatario: {
    nome: string;
    cpf_cnpj?: string;
    endereco?: string;
  };
  itens: ItemNota[];
}

interface PreviewNotaFiscalProps {
  dados: DadosNota | null;
  theme?: 'dark' | 'light';
  onEditarItem?: (index: number) => void;
  onRemoverItem?: (index: number) => void;
}

export default function PreviewNotaFiscal({
  dados,
  theme = 'dark',
  onEditarItem,
  onRemoverItem,
}: PreviewNotaFiscalProps) {
  const isDark = theme === 'dark';

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  // Calcular totais
  const totais = useMemo(() => {
    if (!dados?.itens || dados.itens.length === 0) {
      return { subtotal: 0, total: 0 };
    }

    const subtotal = dados.itens.reduce((acc, item) => {
      return acc + (item.quantidade * item.valor_unitario);
    }, 0);

    return { subtotal, total: subtotal };
  }, [dados]);

  // Validação de completude
  const validacao = useMemo(() => {
    if (!dados) {
      return { completo: false, problemas: ['Nenhum dado coletado ainda'] };
    }

    const problemas: string[] = [];

    if (!dados.destinatario?.nome) {
      problemas.push('Nome do destinatário faltando');
    }

    if (!dados.itens || dados.itens.length === 0) {
      problemas.push('Nenhum item adicionado');
    } else {
      dados.itens.forEach((item, idx) => {
        if (!item.ncm || item.ncm === '00000000') {
          problemas.push(`Item "${item.nome}": NCM inválido`);
        }
        if (!item.cfop) {
          problemas.push(`Item "${item.nome}": CFOP faltando`);
        }
      });
    }

    return { completo: problemas.length === 0, problemas };
  }, [dados]);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarCPFCNPJ = (doc?: string) => {
    if (!doc) return '';
    const numbers = doc.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  // Se não tem dados ainda
  if (!dados) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-center"
        style={{ backgroundColor: C.bgSecondary }}
      >
        <FileText className="w-16 h-16 mb-4 opacity-20" style={{ color: C.textMuted }} />
        <p className="text-sm font-medium mb-1" style={{ color: C.textMuted }}>
          Preview da Nota Fiscal
        </p>
        <p className="text-xs" style={{ color: C.textMuted, opacity: 0.7 }}>
          Os dados aparecerão aqui conforme você conversar com o assistente
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: C.bg }}
    >
      {/* Header com validação */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: C.border }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: C.text }}>
            Preview NF-e
          </h3>
          {validacao.completo ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.success }}>
              <CheckCircle2 className="w-4 h-4" />
              Pronto
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.warning }}>
              <AlertTriangle className="w-4 h-4" />
              Incompleto
            </div>
          )}
        </div>

        {/* Alertas de validação */}
        {!validacao.completo && validacao.problemas.length > 0 && (
          <div
            className="rounded-lg p-2 text-xs space-y-1"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: C.warning }}
          >
            {validacao.problemas.map((problema, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{problema}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Corpo - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Destinatário */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4" style={{ color: C.accent }} />
            <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>
              Destinatário
            </h4>
          </div>
          <div
            className="rounded-xl p-3 border space-y-2"
            style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
          >
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: C.textMuted }}>
                Nome
              </p>
              <p className="text-sm font-semibold" style={{ color: C.text }}>
                {dados.destinatario.nome || '—'}
              </p>
            </div>
            {dados.destinatario.cpf_cnpj && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: C.textMuted }}>
                  CPF/CNPJ
                </p>
                <p className="text-sm font-mono" style={{ color: C.text }}>
                  {formatarCPFCNPJ(dados.destinatario.cpf_cnpj)}
                </p>
              </div>
            )}
            {dados.destinatario.endereco && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: C.textMuted }}>
                  Endereço
                </p>
                <p className="text-sm" style={{ color: C.text }}>
                  {dados.destinatario.endereco}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: C.accent }} />
              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>
                Itens ({dados.itens?.length || 0})
              </h4>
            </div>
          </div>

          {dados.itens && dados.itens.length > 0 ? (
            <div className="space-y-2">
              {dados.itens.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-3 border"
                  style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
                >
                  {/* Nome e quantidade */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-0.5" style={{ color: C.text }}>
                        {item.nome}
                      </p>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        {item.quantidade} {item.unidade} × {formatarValor(item.valor_unitario)}
                      </p>
                    </div>
                    <p className="text-sm font-bold flex-shrink-0 ml-3" style={{ color: C.accent }}>
                      {formatarValor(item.quantidade * item.valor_unitario)}
                    </p>
                  </div>

                  {/* Dados fiscais */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: C.border }}>
                    <div>
                      <p className="text-[10px] font-medium mb-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
                        <Hash className="w-3 h-3" />
                        NCM
                      </p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-mono font-semibold" style={{ color: item.ncm && item.ncm !== '00000000' ? C.text : C.error }}>
                          {item.ncm || 'N/A'}
                        </p>
                        {item.ncm_sugerido && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: C.warning }}
                          >
                            IA
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: C.textMuted }}>
                        CFOP
                      </p>
                      <p className="text-xs font-mono font-semibold" style={{ color: item.cfop ? C.text : C.error }}>
                        {item.cfop || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: C.textMuted }}>
                        Origem
                      </p>
                      <p className="text-xs font-mono" style={{ color: C.text }}>
                        {item.origem_produto ?? 0}
                      </p>
                    </div>
                    {item.produto_id && (
                      <div>
                        <p className="text-[10px] font-medium mb-0.5" style={{ color: C.textMuted }}>
                          Status
                        </p>
                        <p className="text-[9px] font-semibold" style={{ color: C.success }}>
                          ✓ Cadastrado
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-6 border text-center"
              style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
            >
              <Package className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: C.textMuted }} />
              <p className="text-xs" style={{ color: C.textMuted }}>
                Nenhum item adicionado ainda
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer com totais */}
      {dados.itens && dados.itens.length > 0 && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: C.border, backgroundColor: C.bgSecondary }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: C.textMuted }}>
              Subtotal
            </span>
            <span className="text-sm font-semibold" style={{ color: C.text }}>
              {formatarValor(totais.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" style={{ color: C.accent }} />
              <span className="text-sm font-bold" style={{ color: C.text }}>
                Valor Total
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: C.accent }}>
              {formatarValor(totais.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
