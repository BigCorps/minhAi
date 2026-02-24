// components/dashboard/functions/InfinitePayConfigModal.tsx
//
// Formulário que aparece no FunctionConfigModal quando a function_key é
// 'link_pagamento', 'nfc_debito' ou 'nfc_credito'.
//
// Adicione as 3 entradas no FORM_COMPONENTS do FunctionConfigModal.tsx:
//   'link_pagamento': InfinitePayConfigForm,
//   'nfc_debito':     InfinitePayConfigForm,
//   'nfc_credito':    InfinitePayConfigForm,
//
// ─── IMPORTANTE ─────────────────────────────────────────────────────────────
// Este arquivo exporta InfinitePayConfigForm (o formulário inline)
// e InfinitePayConfigModal (modal standalone, se precisar usar fora do
// FunctionConfigModal genérico).
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Smartphone, Link, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Formulário inline (para usar dentro do FunctionConfigModal genérico) ────

interface InfinitePayConfigFormProps {
  settings: Record<string, any>;
  onChange: (key: string, value: any) => void;
  /** function_key da função que abriu o modal */
  functionKey?: string;
}

export const InfinitePayConfigForm = ({
  settings,
  onChange,
  functionKey,
}: InfinitePayConfigFormProps) => {
  const [showToken, setShowToken] = useState(false);

  const isNFC = functionKey === 'nfc_debito' || functionKey === 'nfc_credito';
  const isLink = functionKey === 'link_pagamento';

  return (
    <div className="space-y-5">

      {/* ── Descrição da função ─────────────────────────────────────── */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          {isNFC
            ? <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            : <Link className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          }
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Como funciona{' '}
              {functionKey === 'link_pagamento' && 'o Link de Pagamento'}
              {functionKey === 'nfc_debito' && 'o NFC Débito'}
              {functionKey === 'nfc_credito' && 'o NFC Crédito'}
            </h4>
            {isLink && (
              <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <li>✓ O assistente solicita o celular do cliente</li>
                <li>✓ Gera um link personalizado InfinitePay</li>
                <li>✓ O cliente paga no browser, sem instalar app</li>
                <li>✓ Créditos cobrados apenas após confirmação</li>
              </ul>
            )}
            {isNFC && (
              <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <li>✓ Abre o app InfinitePay automaticamente no celular do lojista</li>
                <li>✓ Cliente aproxima o cartão para pagar</li>
                <li>✓ Créditos cobrados apenas após confirmação</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Aviso NFC ──────────────────────────────────────────────── */}
      {isNFC && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Atenção:</strong> As funções NFC só funcionam em aparelhos com chip NFC
            e com o app <strong>InfinitePay</strong> instalado no celular do lojista.
          </p>
        </div>
      )}

      {/* ── Campo: Handle / Token ───────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Handle InfinitePay (Token)
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            placeholder="$seu-handle-aqui"
            value={settings.infinitepay_handle || ''}
            onChange={(e) => onChange('infinitepay_handle', e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 border rounded-lg text-sm
              dark:bg-slate-800 dark:border-white/10 dark:text-white
              focus:ring-2 focus:ring-violet-500 focus:border-transparent
              font-mono"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          Encontre seu handle no <strong>Painel InfinitePay → Integrações → Token</strong>.
          Formato: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">$meu-handle</code>
        </p>
      </div>

      {/* ── Preview / status do token ───────────────────────────────── */}
      {settings.infinitepay_handle && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-xs text-green-800 dark:text-green-200">
            Token configurado. As{' '}
            <strong>3 funções InfinitePay</strong> (Link de Pagamento, NFC Débito e NFC Crédito)
            usam o mesmo token — você só precisa configurar uma vez.
          </p>
        </div>
      )}

      {/* ── Créditos ────────────────────────────────────────────────── */}
      <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Consumo de Créditos
          </h5>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>2 créditos</strong> são cobrados somente após o usuário confirmar que
          o pagamento foi recebido. Cobranças não confirmadas <strong>não</strong> consomem créditos.
        </p>
      </div>
    </div>
  );
};

// ─── Modal standalone (caso use fora do FunctionConfigModal) ─────────────────

interface InfinitePayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  functionKey?: string;
  onUpdate?: () => void;
}

export default function InfinitePayConfigModal({
  isOpen,
  onClose,
  companyId,
  functionKey,
  onUpdate,
}: InfinitePayConfigModalProps) {
  const supabase = createClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    supabase
      .from('companies')
      .select('infinitepay_handle')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data);
        setIsLoading(false);
      });
  }, [isOpen, companyId, supabase]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({ infinitepay_handle: settings.infinitepay_handle })
      .eq('id', companyId);

    setIsSaving(false);
    if (!error) {
      onUpdate?.();
      onClose();
    } else {
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Fechar"
        >
          <X size={20} className="text-gray-600 dark:text-gray-400" />
        </button>

        <div className="mb-6 pr-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Configurar InfinitePay
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure o token para habilitar Link de Pagamento, NFC Débito e NFC Crédito.
          </p>
        </div>

        {isLoading ? (
          <div className="min-h-[150px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <div className="mb-6">
            <InfinitePayConfigForm
              settings={settings}
              onChange={(key, value) => setSettings((prev) => ({ ...prev, [key]: value }))}
              functionKey={functionKey}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Salvando...
              </>
            ) : (
              'Salvar Token'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
