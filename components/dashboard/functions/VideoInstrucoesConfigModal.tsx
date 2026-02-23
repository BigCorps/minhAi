// ========================================
// ARQUIVO: components/dashboard/functions/VideoInstrucoesConfigModal.tsx
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { X, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface VideoInstrucoesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSave?: () => void;
}

export default function VideoInstrucoesConfigModal({
  isOpen,
  onClose,
  companyId,
  onSave,
}: VideoInstrucoesConfigModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Carregar configuração atual
  useEffect(() => {
    if (isOpen && companyId) {
      loadSettings();
    }
  }, [isOpen, companyId]);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('companies')
        .select('video_instrucoes_url')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      setVideoUrl(data.video_instrucoes_url || '');
    } catch (err: any) {
      console.error('Erro ao carregar configuração:', err);
      setError('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validação
    if (!videoUrl.trim()) {
      setError('Por favor, insira a URL do vídeo');
      return;
    }

    // Validar se é uma URL válida
    try {
      new URL(videoUrl);
    } catch {
      setError('URL inválida. Use um link completo (ex: https://...)');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('companies')
        .update({ video_instrucoes_url: videoUrl.trim() })
        .eq('id', companyId);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onSave?.();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Tem certeza que deseja remover o vídeo de instruções?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('companies')
        .update({ video_instrucoes_url: null })
        .eq('id', companyId);

      if (error) throw error;

      setVideoUrl('');
      setSuccess(true);
      setTimeout(() => {
        onSave?.();
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao limpar:', err);
      setError('Erro ao remover vídeo');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Configurar Vídeo de Instruções
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>Vídeo Tutorial</span>
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Configure um vídeo explicativo sobre seu produto ou serviço. 
              Os clientes poderão assistir dizendo frases como:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <li>• "Mostrar vídeo de instruções"</li>
              <li>• "Como funciona o produto?"</li>
              <li>• "Tutorial do serviço"</li>
            </ul>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Carregando...
              </p>
            </div>
          )}

          {/* Form */}
          {!loading && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  URL do Vídeo
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setError('');
                    setSuccess(false);
                  }}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Suporta: YouTube, Vimeo, links diretos de vídeo (.mp4, .webm)
                </p>
              </div>

              {/* Preview */}
              {videoUrl && !error && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      <strong>Vídeo configurado!</strong> Os clientes poderão assistir por comando de voz.
                    </span>
                  </p>
                  {videoUrl.includes('youtube.com') && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      📺 YouTube detectado - reprodução otimizada
                    </p>
                  )}
                  {videoUrl.includes('vimeo.com') && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      🎬 Vimeo detectado - reprodução otimizada
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Configuração salva com sucesso!</span>
                  </p>
                </div>
              )}

              {/* Instruções de teste */}
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  💡 Como testar:
                </p>
                <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Salve as configurações</li>
                  <li>Acesse o assistente de voz</li>
                  <li>Diga: "Tutorial" ou "Como funciona?"</li>
                  <li>O vídeo será exibido automaticamente</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={handleClear}
            disabled={saving || !videoUrl}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Remover Vídeo
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !videoUrl}
              className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
