'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { X, Wifi, Eye, EyeOff } from 'lucide-react';

interface WifiQRCodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onUpdate: () => void;
}

export function WifiQRCodeConfigModal({
  isOpen,
  onClose,
  companyId,
  onUpdate,
}: WifiQRCodeConfigModalProps) {
  const [networkName, setNetworkName] = useState('');
  const [networkPassword, setNetworkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    supabase
      .from('companies')
      .select('wifi_network_name, wifi_network_password')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) {
          setNetworkName(data.wifi_network_name ?? '');
          setNetworkPassword(data.wifi_network_password ?? '');
        }
        setLoading(false);
      });
  }, [isOpen, companyId]);

  async function handleSave() {
    if (!networkName.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from('companies')
        .update({
          wifi_network_name: networkName.trim(),
          wifi_network_password: networkPassword,
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
              <Wifi className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Configurar Wi-Fi QR Code
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
              Configure o nome e senha da sua rede Wi-Fi. O assistente vai gerar um QR Code para seus clientes se conectarem automaticamente.
            </p>

            {/* Nome da Rede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nome da Rede (SSID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
                placeholder="Ex: Minha Empresa - WiFi"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Senha da Rede
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={networkPassword}
                  onChange={(e) => setNetworkPassword(e.target.value)}
                  placeholder="Senha do Wi-Fi"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Deixe em branco se a rede for aberta (sem senha).
              </p>
            </div>

            {/* Prévia */}
            {networkName && (
              <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 p-3">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">Prévia</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Rede:</span> {networkName}
                </p>
                {networkPassword && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Senha:</span>{' '}
                    {showPassword ? networkPassword : '•'.repeat(networkPassword.length)}
                  </p>
                )}
              </div>
            )}

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
                disabled={saving || !networkName.trim()}
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
