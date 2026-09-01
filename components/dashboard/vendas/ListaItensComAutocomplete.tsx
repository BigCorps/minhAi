// components/dashboard/vendas/ListaItensComAutocomplete.tsx
// Gerenciador de lista de itens com autocomplete

'use client';

import { Plus } from 'lucide-react';
import CampoItemComAutocomplete from './CampoItemComAutocomplete';

interface ItemNota {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  ncm?: string;
  cfop?: number;
  origem_produto?: number;
  produto_id?: string;
  ean?: string;
}

interface ListaItensComAutocompleteProps {
  companyId: string;
  itens: ItemNota[];
  onChange: (itens: ItemNota[]) => void;
  theme?: 'dark' | 'light';
  mostrarDadosFiscais?: boolean;
  modeloDocumento?: 55 | 65; // NF-e ou NFC-e
}

export default function ListaItensComAutocomplete({
  companyId,
  itens,
  onChange,
  theme = 'dark',
  mostrarDadosFiscais = false,
  modeloDocumento = 65,
}: ListaItensComAutocompleteProps) {
  const isDark = theme === 'dark';

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
  };

  // Adicionar novo item vazio
  const handleAdicionar = () => {
    const novoItem: ItemNota = {
      nome: '',
      quantidade: 1,
      valor_unitario: 0,
      unidade: 'un',
      ncm: '00000000',
      cfop: 5102,
      origem_produto: 0,
    };

    onChange([...itens, novoItem]);
  };

  // Atualizar item específico
  const handleAtualizar = (index: number, itemAtualizado: ItemNota) => {
    const novosItens = [...itens];
    novosItens[index] = itemAtualizado;
    onChange(novosItens);
  };

  // Remover item
  const handleRemover = (index: number) => {
    const novosItens = itens.filter((_, i) => i !== index);
    onChange(novosItens);
  };

  // Calcular total geral
  const totalGeral = itens.reduce((acc, item) => {
    return acc + (item.quantidade * item.valor_unitario);
  }, 0);

  // Validar se há itens sem NCM (para NF-e modelo 55)
  const itensSemNcm = modeloDocumento === 55
    ? itens.filter(i => !i.ncm || i.ncm === '00000000')
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: C.text }}>
            Itens da Nota
            <span className="text-red-500 ml-1">*</span>
          </h3>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdicionar}
          className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
          style={{
            backgroundColor: C.accent,
            color: '#ffffff',
          }}
        >
          <Plus className="w-4 h-4" />
          Adicionar Item
        </button>
      </div>

      {/* Alertas */}
      {modeloDocumento === 55 && itensSemNcm.length > 0 && (
        <div
          className="rounded-lg p-3 border"
          style={{ 
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: '#f59e0b',
            color: '#f59e0b',
          }}
        >
          <p className="text-sm font-semibold mb-1">
            ⚠️ Atenção: NCM obrigatório para NF-e
          </p>
          <p className="text-xs">
            {itensSemNcm.length} {itensSemNcm.length === 1 ? 'item está' : 'itens estão'} sem NCM válido.
            NF-e modelo 55 exige NCM em todos os produtos.
          </p>
        </div>
      )}

      {/* Lista de itens */}
      {itens.length === 0 ? (
        <div
          className="rounded-xl border-2 border-dashed p-8 text-center"
          style={{ borderColor: C.border }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: C.textMuted }}>
            Nenhum item adicionado
          </p>
          <p className="text-xs" style={{ color: C.textMuted }}>
            Clique em "Adicionar Item" para começar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item, index) => (
            <CampoItemComAutocomplete
              key={index}
              companyId={companyId}
              item={item}
              index={index}
              onUpdate={handleAtualizar}
              onRemove={handleRemover}
              theme={theme}
              mostrarDadosFiscais={mostrarDadosFiscais}
            />
          ))}
        </div>
      )}

      {/* Total geral */}
      {itens.length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: C.bgSecondary, borderColor: C.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: C.text }}>
              Valor Total da Nota
            </span>
            <span className="text-2xl font-bold" style={{ color: C.accent }}>
              R$ {totalGeral.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
