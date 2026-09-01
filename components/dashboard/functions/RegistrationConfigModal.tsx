'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { X, GripVertical } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  onUpdate?: () => void;
}

const ALL_FIELDS = [
  { key: 'nome',        label: 'Nome completo',  required: true },
  { key: 'telefone',    label: 'Telefone',        required: false },
  { key: 'email',       label: 'E-mail',          required: false },
  { key: 'cpf',         label: 'CPF',             required: false },
  { key: 'endereco',    label: 'Endereço',        required: false },
  { key: 'empresa',     label: 'Empresa',         required: false },
  { key: 'cargo',       label: 'Cargo',           required: false },
  { key: 'observacoes', label: 'Observações',     required: false },
];

export function RegistrationConfigModal({ isOpen, onClose, companyId, onUpdate }: ConfigModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['nome']);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    supabase
      .from('registration_configs')
      .select('fields')
      .eq('company_id', companyId)
      .single()
      .then(({ data }) => {
        if (data?.fields) setSelectedFields(data.fields);
      });
  }, [isOpen, companyId]);

  const toggleField = (key: string) => {
    if (key === 'nome') return; // nome é obrigatório
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  // Manter ordem de ALL_FIELDS
  const orderedSelected = ALL_FIELDS
    .filter(f => selectedFields.includes(f.key))
    .map(f => f.key);

  async function handleSave() {
    if (!companyId) return;
    setSaving(true);
    try {
      await supabase
        .from('registration_configs')
        .upsert(
          { company_id: companyId, fields: orderedSelected, updated_at: new Date().toISOString() },
          { onConflict: 'company_id' }
        );
      onUpdate?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">

        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h3 className="text-lg font-bold dark:text-white">Configurar: Cadastro</h3>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Selecione quais campos o assistente irá perguntar durante o cadastro.
          <strong className="text-gray-700 dark:text-slate-300"> Nome</strong> é obrigatório.
        </p>

        <div className="space-y-2 mb-6">
          {ALL_FIELDS.map((field) => {
            const isSelected = selectedFields.includes(field.key);
            return (
              <button
                key={field.key}
                onClick={() => toggleField(field.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                } ${field.required ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
              >
                <span className="font-medium">{field.label}</span>
                <div className="flex items-center gap-2">
                  {field.required && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-500">obrigatório</span>
                  )}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-yellow-500 bg-yellow-500'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview da ordem */}
        <div className="mb-5 p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Ordem das perguntas:</p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {orderedSelected.map((k, i) => (
              <span key={k}>
                {i + 1}. {ALL_FIELDS.find(f => f.key === k)?.label}
                {i < orderedSelected.length - 1 ? ' → ' : ''}
              </span>
            ))}
          </p>
        </div>

        {/* Seção Em Breve */}
        <div className="mb-5 p-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 opacity-60">
          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">🔒 Em breve</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
              <span>🫆</span> Cadastro com biometria
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
              <span>📸</span> Identificação facial
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-300">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-sm font-bold"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

      </div>
    </div>
  );
}
