'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { X, UtensilsCrossed, ExternalLink } from 'lucide-react';

interface CardapioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onUpdate: () => void;
}

export function CardapioConfigModal({
  isOpen,
  onClose,
  companyId,
  onUpdate,
}: CardapioConfigModalProps) {
  const [menuUrl, setMenuUrl] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    supabase
      .from('companies')
      .select('cardapio_url, cardapio_description')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) {
          setMenuUrl(data.cardapio_url ?? '');
          setMenuDescription(data.cardapio_description ?? '');
        }
        setLoading(false);
      });
  }, [isOpen, companyId]);

  function validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function handleUrlChange(value: string) {
    setMenuUrl(value);
    if (value && !validateUrl(value)) {
      setUrlError('URL inválida. Inclua https:// no início.');
    } else {
      setUrlError('');
    }
  }

  async function handleSave() {
    if (!menuUrl.trim() || urlError) return;
    setSaving(true);
    try {
      await supabase
        .from('companies')
        .update({
          cardapio_url: menuUrl.trim(),
          cardapio_description: menuDescription.trim() || null,
        })
        .eq('id', companyId);
      onUpdate();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isPdf = menuUrl.toLowerCase().includes('.pdf');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <UtensilsCrossed className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Configurar Cardápio
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cole o link do seu cardápio digital ou PDF. O assistente vai gerar um QR Code, mostrar um preview e permitir abrir com um clique ou por voz.
            </p>

            {/* URL do Cardápio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Link do Cardápio <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={menuUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://meusite.com/cardapio ou link do PDF"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  urlError
                    ? 'border-red-400'
                    : 'border-gray-300 dark:border-slate-600'
                }`}
              />
              {urlError && (
                <p className="text-xs text-red-500 mt-1">{urlError}</p>
              )}
              {menuUrl && !urlError && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPdf ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {isPdf ? '📄 PDF' : '🌐 Site'}
                  </span>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 hover:underline"
                  >
                    Testar link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Descrição (opcional)
              </label>
              <textarea
                value={menuDescription}
                onChange={(e) => setMenuDescription(e.target.value)}
                placeholder="Ex: Cardápio completo com pratos, bebidas e sobremesas"
                rows={2}
                maxLength={120}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">
                {menuDescription.length}/120
              </p>
            </div>

            {/* Dica */}
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 p-3">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                💡 <strong>Dica:</strong> Funciona com Google Drive (PDF público), iFood, Linktree, site próprio e qualquer link público.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !menuUrl.trim() || !!urlError}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
