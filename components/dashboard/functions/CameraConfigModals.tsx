'use client';

// ============================================================
// Config Modals das funções de câmera
// Arquivo: components/dashboard/functions/CameraConfigModals.tsx
//
// Funções simples (QR, Barcode, OCR, Tabela, Contrato) não têm
// configuração além do toggle — o modal confirma que está ativo.
// ValidarCupom tem configuração extra (tabela de cupons).
// ============================================================

import { X } from 'lucide-react';

interface SimpleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

function SimpleConfigModal({ isOpen, onClose, title, description }: SimpleConfigModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{description}</p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export function LerQRCodeConfigModal({ isOpen, onClose }) {
  return (
    <SimpleConfigModal
      isOpen={isOpen}
      onClose={onClose}
      title="Ler QR Code"
      description="Esta função não requer configuração adicional. O processamento é feito diretamente no dispositivo (sem custo de API). Ative ou desative pelo toggle acima."
    />
  );
}

export function LerCodigoBarrasConfigModal({ isOpen, onClose }) {
  return (
    <SimpleConfigModal
      isOpen={isOpen}
      onClose={onClose}
      title="Ler Código de Barras"
      description="Esta função não requer configuração adicional. Usa a BarcodeDetector API nativa quando disponível, com fallback via IA. Ative ou desative pelo toggle acima."
    />
  );
}

export function ImagemEmTextoConfigModal({ isOpen, onClose }) {
  return (
    <SimpleConfigModal
      isOpen={isOpen}
      onClose={onClose}
      title="Imagem em Texto (OCR)"
      description="Esta função usa IA (OpenAI Vision) para extrair texto de imagens. Cada uso consome 3 créditos. Ative ou desative pelo toggle acima."
    />
  );
}

export function TabelaEmTextoConfigModal({ isOpen, onClose }) {
  return (
    <SimpleConfigModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tabela em Texto"
      description="Converte tabelas fotografadas para CSV usando IA. Cada uso consome 3 créditos. Ative ou desative pelo toggle acima."
    />
  );
}

export function ContratoEmTextoConfigModal({ isOpen, onClose }) {
  return (
    <SimpleConfigModal
      isOpen={isOpen}
      onClose={onClose}
      title="Contrato em Texto"
      description="Digitaliza contratos e documentos legais com IA. Cada uso consome 5 créditos. Ative ou desative pelo toggle acima."
    />
  );
}

// ── ValidarCupom tem configuração adicional ───────────────────

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2 } from 'lucide-react';

interface Cupom {
  id?: string;
  code: string;
  discount: number;
  expires_at: string;
  is_active: boolean;
}

export function ValidarCupomConfigModal({ isOpen, onClose, companyId, onUpdate }) {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCupom, setNewCupom] = useState<Cupom>({ code: '', discount: 10, expires_at: '', is_active: true });
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    supabase
      .from('cupons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCupons(data ?? []);
        setLoading(false);
      });
  }, [isOpen, companyId]);

  const handleAddCupom = async () => {
    if (!newCupom.code.trim()) return;
    setSaving(true);
    try {
      await supabase.from('cupons').insert({
        company_id: companyId,
        code: newCupom.code.trim().toUpperCase(),
        discount: newCupom.discount,
        expires_at: newCupom.expires_at || null,
        is_active: newCupom.is_active,
      });
      setNewCupom({ code: '', discount: 10, expires_at: '', is_active: true });
      const { data } = await supabase.from('cupons').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      setCupons(data ?? []);
      onUpdate?.();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('cupons').delete().eq('id', id);
    setCupons(prev => prev.filter(c => c.id !== id));
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from('cupons').update({ is_active: !is_active }).eq('id', id);
    setCupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold dark:text-white">Gerenciar Cupons</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Adicionar novo cupom */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold dark:text-white mb-3">Novo Cupom</h4>
          <div className="flex flex-col gap-3">
            <input
              value={newCupom.code}
              onChange={e => setNewCupom(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="CÓDIGO (ex: DESCONTO10)"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Desconto (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newCupom.discount}
                  onChange={e => setNewCupom(p => ({ ...p, discount: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Expira em</label>
                <input
                  type="date"
                  value={newCupom.expires_at}
                  onChange={e => setNewCupom(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
            <button
              onClick={handleAddCupom}
              disabled={saving || !newCupom.code.trim()}
              className="flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adicionando...' : 'Adicionar Cupom'}
            </button>
          </div>
        </div>

        {/* Lista de cupons */}
        {loading ? (
          <div className="text-center py-4 text-sm text-gray-500">Carregando...</div>
        ) : cupons.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400 dark:text-slate-500">Nenhum cupom cadastrado.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {cupons.map(cupom => (
              <div key={cupom.id} className={`flex items-center justify-between p-3 rounded-xl border ${cupom.is_active ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'}`}>
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-sm dark:text-white">{cupom.code}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {cupom.discount}% off{cupom.expires_at ? ` · expira ${new Date(cupom.expires_at).toLocaleDateString('pt-BR')}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(cupom.id!, cupom.is_active)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium ${cupom.is_active ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {cupom.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => handleDelete(cupom.id!)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-6 py-2 border rounded-xl text-sm dark:border-slate-700 dark:text-slate-300">
          Fechar
        </button>
      </div>
    </div>
  );
}