'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { X, QrCode } from 'lucide-react';

interface NossoQRCodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onUpdate: () => void;
}

export function NossoQRCodeConfigModal({
  isOpen,
  onClose,
  companyId,
  onUpdate,
}: NossoQRCodeConfigModalProps) {
  const [qrContent, setQrContent] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    supabase
      .from('companies')
      .select('qrcode_content, qrcode_label')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) {
          setQrContent(data.qrcode_content ?? '');
          setQrLabel(data.qrcode_label ?? '');
        }
        setLoading(false);
      });
  }, [isOpen, companyId]);

  // Atualizar preview do QR ao digitar conteúdo
  useEffect(() => {
    if (qrContent.trim()) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrContent)}&margin=5`;
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  }, [qrContent]);

  async function handleSave() {
    if (!qrContent.trim() || !qrLabel.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from('companies')
        .update({
          qrcode_content: qrContent.trim(),
          qrcode_label: qrLabel.trim(),
        })
        .eq('id', companyId);
      onUpdate();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <QrCode className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Configurar Nosso QR Code
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
              Configure qualquer conteúdo para gerar um QR Code personalizado — Pix, link, texto, Instagram, etc. O assistente vai falar o texto que você escrever ao exibir o código.
            </p>

            {/* Conteúdo do QR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Conteúdo do QR Code <span className="text-red-500">*</span>
              </label>
              <textarea
                value={qrContent}
                onChange={(e) => setQrContent(e.target.value)}
                placeholder={'Ex: https://instagram.com/suaempresa\nou chave Pix: email@empresa.com\nou qualquer texto'}
                rows={3}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono"
              />
            </div>

            {/* Texto para o assistente falar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                O que o assistente vai falar <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={qrLabel}
                onChange={(e) => setQrLabel(e.target.value)}
                placeholder="Ex: Escaneie para nos seguir no Instagram"
                maxLength={100}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">
                {qrLabel.length}/100
              </p>
            </div>

            {/* Preview do QR */}
            {previewUrl && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                <div className="p-2 rounded-lg bg-white shadow">
                  <img src={previewUrl} alt="Preview QR" className="w-16 h-16" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prévia</p>
                  {qrLabel && (
                    <p className="text-sm font-medium text-gray-800 dark:text-white leading-snug">
                      "{qrLabel}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Exemplos de uso */}
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 p-3">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1.5">Exemplos de uso:</p>
              <ul className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                <li>Chave Pix para gorjeta ou venda</li>
                <li>Link de avaliação Google Maps</li>
                <li>Formulário, cardápio, promoção</li>
              </ul>
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
                disabled={saving || !qrContent.trim() || !qrLabel.trim()}
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
