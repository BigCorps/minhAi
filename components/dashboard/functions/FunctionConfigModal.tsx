// components/dashboard/functions/FunctionConfigModal.tsx
'use client';
 
import { useState, useEffect } from 'react';
import { CheckCircle, Info, Mic, Sparkles, Loader2, X, Mail, Calendar, ExternalLink, Settings, AlertCircle, Check, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { InfinitePayConfigForm } from './InfinitePayConfigModal';
import { MpPointConfigForm } from './MpPointConfigModal'
import {
  LerQRCodeConfigForm,
  LerCodigoBarrasConfigForm,
  ValidarCupomConfigForm,
  ImagemEmTextoConfigForm,
  TabelaEmTextoConfigForm,
  ContratoEmTextoConfigForm,
} from './CameraConfigModal';

// ===== FORMULÁRIOS =====

const SequenciaVideosForm = ({ settings, onChange }: any) => {
  const videos = settings.sequencia_videos_urls || [];

  const handleAddVideo = () => {
    const newVideos = [...videos, { title: '', url: '' }];
    onChange('sequencia_videos_urls', newVideos);
  };

  const handleRemoveVideo = (index: number) => {
    const newVideos = videos.filter((_: any, i: number) => i !== index);
    onChange('sequencia_videos_urls', newVideos);
  };

  const handleUpdateVideo = (index: number, field: 'title' | 'url', value: string) => {
    const newVideos = [...videos];
    newVideos[index][field] = value;
    onChange('sequencia_videos_urls', newVideos);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newVideos = [...videos];
    [newVideos[index - 1], newVideos[index]] = [newVideos[index], newVideos[index - 1]];
    onChange('sequencia_videos_urls', newVideos);
  };

  const handleMoveDown = (index: number) => {
    if (index === videos.length - 1) return;
    const newVideos = [...videos];
    [newVideos[index], newVideos[index + 1]] = [newVideos[index + 1], newVideos[index]];
    onChange('sequencia_videos_urls', newVideos);
  };

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
          Configure a ordem dos vídeos que serão reproduzidos em sequência.
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Os vídeos tocam em ordem automática</li>
          <li>• Navegação: "próximo", "anterior"</li>
          <li>• Suporta YouTube, Vimeo, MP4</li>
        </ul>
      </div>

      {/* Lista de Vídeos */}
      {videos.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
            Nenhum vídeo adicionado
          </p>
          <button
            onClick={handleAddVideo}
            type="button"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            + Adicionar Primeiro Vídeo
          </button>
        </div>
      ) : (
        videos.map((video: any, index: number) => (
          <div
            key={index}
            className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-white/10"
          >
            <div className="flex items-start gap-2">
              {/* Número e Controles */}
              <div className="flex flex-col items-center space-y-1 pt-2">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {index + 1}
                </span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-xs"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === videos.length - 1}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-xs"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Título do vídeo"
                  value={video.title}
                  onChange={e => handleUpdateVideo(index, 'title', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="url"
                  placeholder="URL (YouTube, Vimeo ou MP4)"
                  value={video.url}
                  onChange={e => handleUpdateVideo(index, 'url', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Remover */}
              <button
                type="button"
                onClick={() => handleRemoveVideo(index)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}

      {/* Botão Adicionar Mais */}
      {videos.length > 0 && (
        <button
          type="button"
          onClick={handleAddVideo}
          className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 text-sm"
        >
          <Plus size={18} />
          <span>Adicionar Outro Vídeo</span>
        </button>
      )}

      {/* Dicas */}
      <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Dica:</strong> Use as setas ▲▼ para reordenar. Quando um vídeo termina, avança automaticamente.
        </p>
      </div>
    </div>
  );
};

const TracarRotaForm = () => (
  <div className="space-y-4">
    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 className="font-semibold mb-2">Como funciona</h4>
      <ul className="space-y-1 text-sm">
        <li>• Detecta localização atual automaticamente</li>
        <li>• Cliente fala ou digita o destino</li>
        <li>• Exibe mapa com rota desenhada + tempo + distância</li>
        <li>• QR Code para abrir no Google Maps</li>
      </ul>
    </div>

    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      <h4 className="font-semibold mb-2">Comandos de voz</h4>
      <ul className="space-y-1 text-sm">
        <li>• "Traçar rota para [destino]"</li>
        <li>• "Como chegar no aeroporto"</li>
        <li>• "Calcular rota"</li>
        <li>• "Abrir no Maps"</li>
      </ul>
    </div>
  </div>
);

const GoogleCalendarForm = ({ companyId }: any) => {
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (companyId) {
      checkGoogleConnection();
    }
  }, [companyId]);

  async function checkGoogleConnection() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active, scopes')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Verificar se tem permissão de calendário
      const hasCalendarScope = data?.scopes?.some((scope: string) => 
        scope.includes('calendar')
      );

      if (data && hasCalendarScope) {
        setGoogleAccount(data);
      } else {
        setGoogleAccount(null);
      }

      console.log('✅ Conta Google encontrada:', data);
    } catch (error) {
      console.error('Erro ao verificar conta Google:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleGoToAgenda() {
    if (!companyId) {
      console.error('❌ companyId não está definido');
      alert('Erro: ID da empresa não encontrado');
      return;
    }
    
    console.log('🔗 Navegando para /dashboard/agenda com companyId:', companyId);
    window.location.href = `/dashboard/agenda?companyId=${companyId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informação sobre a função */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Como funciona o Calendário
        </h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>✓ Diga: <strong>"Marcar evento"</strong> para criar compromissos</li>
          <li>✓ Diga: <strong>"Ver agenda"</strong> para visualizar eventos</li>
          <li>✓ Escolha o período: mês, semana ou dia</li>
          <li>✓ Sincronização automática com Google Calendar</li>
        </ul>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs font-mono">
          CompanyId: {companyId || 'undefined'} | Conta: {googleAccount?.google_email || 'não encontrada'}
        </div>
      )}

      {/* Status da conexão Google */}
      {googleAccount ? (
        // ✅ CONECTADO
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  ✅ Conta Google Conectada
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Email: <span className="font-mono">{googleAccount.google_email}</span>
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Esta conta será usada para gerenciar eventos no calendário.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Gerenciar Conexão Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Comandos de Voz
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marcar Evento:
                </p>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>• "Agendar reunião"</li>
                  <li>• "Marcar compromisso"</li>
                  <li>• "Criar evento"</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ver Agenda:
                </p>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>• "Ver minha agenda"</li>
                  <li>• "Mostrar calendário"</li>
                  <li>• "Meus compromissos"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ❌ NÃO CONECTADO
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Conta Google não conectada
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Para usar as funções de calendário, você precisa conectar uma conta Google com permissão de acesso ao Google Calendar.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Conectar Conta Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Você será redirecionado para a seção <strong>Agenda</strong> onde poderá conectar sua conta Google e autorizar o acesso ao calendário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const PlaylistConfigForm = ({ companyId }: any) => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [accountPlaylists, setAccountPlaylists] = useState<any[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data } = await supabase
        .from('company_function_settings').select('config')
        .eq('company_id', companyId).eq('function_key', 'playlist').maybeSingle();
      setPlaylists(data?.config?.playlists || []);
      setLoading(false);
      fetchAccountPlaylists();
    }
    init();
  }, [companyId]);

  const fetchAccountPlaylists = async () => {
    setLoadingAccount(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/playlist-items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ action: 'list', company_id: companyId }),
        }
      );
      const json = await res.json();
      setAccountPlaylists(json.playlists || []);
    } catch { setAccountPlaylists([]); }
    finally { setLoadingAccount(false); }
  };

  const addFromAccount = (pl: any) => {
    if (playlists.some((p: any) => p.id === pl.id)) return;
    setPlaylists(prev => [...prev, { id: pl.id, name: pl.name, type: 'video' }]);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('company_function_settings')
      .update({ config: { playlists }, updated_at: new Date().toISOString() })
      .eq('company_id', companyId).eq('function_key', 'playlist');
    setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-800 dark:text-red-200">
          Selecione playlists da sua conta YouTube ou adicione manualmente pelo ID/link.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        <button onClick={() => setMode('browse')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${mode === 'browse' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
          Minhas Playlists
        </button>
        <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${mode === 'manual' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
          Adicionar Manual
        </button>
      </div>

      {/* Browse playlists da conta */}
      {mode === 'browse' && (
        <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Playlists da conta Google</span>
            <button onClick={fetchAccountPlaylists} className="text-xs text-blue-500 hover:underline">Atualizar</button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loadingAccount ? (
              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" /></div>
            ) : accountPlaylists.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400">Nenhuma playlist encontrada na conta</p>
            ) : (
              accountPlaylists.map(pl => {
                const added = playlists.some((p: any) => p.id === pl.id);
                return (
                  <div key={pl.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    {pl.thumbnail && <img src={pl.thumbnail} alt="" className="w-12 h-9 object-cover rounded flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pl.name}</p>
                      <p className="text-xs text-gray-400">{pl.itemCount} itens</p>
                    </div>
                    <button
                      onClick={() => addFromAccount(pl)}
                      disabled={added}
                      className={`text-xs px-2 py-1 rounded flex-shrink-0 transition ${added ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'}`}
                    >
                      {added ? '✓ Adicionada' : '+ Adicionar'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Manual */}
      {mode === 'manual' && (
        <div className="space-y-2">
          <input type="text" placeholder="Link ou ID da playlist YouTube"
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white"
            id="manual-playlist-input"
          />
          <button
            onClick={() => {
              const input = document.getElementById('manual-playlist-input') as HTMLInputElement;
              const val = input.value.trim();
              if (!val) return;
              const m = val.match(/[?&]list=([^&]+)/);
              const id = m ? m[1] : val;
              if (playlists.some((p: any) => p.id === id)) return;
              setPlaylists(prev => [...prev, { id, name: id, type: 'video' }]);
              input.value = '';
            }}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition"
          >
            Adicionar
          </button>
        </div>
      )}

      {/* Playlists selecionadas */}
      {playlists.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Playlists configuradas ({playlists.length})</p>
          {playlists.map((pl: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-white/10">
              <span className="text-sm flex-1 truncate text-gray-800 dark:text-gray-200">📋 {pl.name}</span>
              <select value={pl.type || 'video'} onChange={e => { const a = [...playlists]; a[idx].type = e.target.value; setPlaylists(a); }}
                className="text-xs px-2 py-1 border rounded dark:bg-slate-900 dark:border-white/10 dark:text-white">
                <option value="video">Vídeo</option>
                <option value="music">Música</option>
              </select>
              <button onClick={() => setPlaylists(playlists.filter((_: any, i: number) => i !== idx))}
                className="text-red-400 hover:text-red-600 text-xs flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving || playlists.length === 0}
        className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm transition">
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
      </button>
    </div>
  );
};

const PortaRetratoConfigForm = ({ companyId }: any) => {
  const [config, setConfig] = useState<any>({ folder_id: '', seconds_per_photo: 5, transition: 'fade', shuffle: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('company_function_settings').select('config')
        .eq('company_id', companyId).eq('function_key', 'porta_retrato').maybeSingle();
      if (data?.config) setConfig(data.config);
      fetchFolders(null);
    }
    init();
  }, [companyId]);

  const fetchFolders = async (parentId: string | null) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-drive-folders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: companyId, parent_id: parentId }),
        }
      );
      const json = await res.json();
      setFolders(json.folders || []);
    } catch { setFolders([]); }
    finally { setLoadingFolders(false); }
  };

  const enterFolder = (folder: { id: string; name: string }) => {
    setFolderPath(prev => [...prev, folder]);
    fetchFolders(folder.id);
  };

  const goBack = () => {
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    fetchFolders(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const selectFolder = (folder: { id: string; name: string }) => {
    setConfig((p: any) => ({ ...p, folder_id: folder.id }));
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('company_function_settings')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('company_id', companyId).eq('function_key', 'porta_retrato');
    setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false);
  };

  const selectedFolderName = folderPath.find(f => f.id === config.folder_id)?.name
    || folders.find(f => f.id === config.folder_id)?.name
    || config.folder_id;

  return (
    <div className="space-y-4">
      <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
        <p className="text-sm text-pink-800 dark:text-pink-200">🖼️ Coloque fotos em uma pasta do Google Drive e selecione-a abaixo.</p>
      </div>

      {/* Pasta selecionada */}
      {config.folder_id && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <span className="text-green-600 dark:text-green-400">📁</span>
          <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate flex-1">{selectedFolderName}</span>
          <button onClick={() => setConfig((p: any) => ({ ...p, folder_id: '' }))} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">Remover</button>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2">
        <button onClick={() => setMode('browse')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${mode === 'browse' ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
          📁 Navegar Drive
        </button>
        <button onClick={() => setMode('manual')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${mode === 'manual' ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
          ✏️ Inserir ID
        </button>
      </div>

      {/* Navegar */}
      {mode === 'browse' && (
        <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 text-xs overflow-x-auto">
            <button onClick={() => { setFolderPath([]); fetchFolders(null); }} className="text-blue-500 hover:underline flex-shrink-0">Meu Drive</button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-400">/</span>
                <button onClick={() => { const p = folderPath.slice(0, i + 1); setFolderPath(p); fetchFolders(f.id); }} className="text-blue-500 hover:underline">{f.name}</button>
              </span>
            ))}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loadingFolders ? (
              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500" /></div>
            ) : folders.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400">Nenhuma pasta encontrada</p>
            ) : (
              <>
                {folderPath.length > 0 && (
                  <button onClick={goBack} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition border-b border-gray-100 dark:border-white/5">← Voltar</button>
                )}
                {folders.map(folder => (
                  <div key={folder.id} className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition ${config.folder_id === folder.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                    <button onClick={() => enterFolder(folder)} className="flex items-center gap-2 flex-1 text-left text-sm text-gray-800 dark:text-gray-200">📁 {folder.name}</button>
                    <button onClick={() => selectFolder(folder)} className={`text-xs px-2 py-1 rounded flex-shrink-0 transition ${config.folder_id === folder.id ? 'bg-pink-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-pink-100'}`}>
                      {config.folder_id === folder.id ? '✓ Selecionada' : 'Usar'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Manual */}
      {mode === 'manual' && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">ID da Pasta</label>
          <input type="text" placeholder="Cole o ID da pasta do Drive"
            value={config.folder_id || ''}
            onChange={e => setConfig((p: any) => ({ ...p, folder_id: e.target.value }))}
            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white" />
          <p className="text-xs text-gray-500 mt-1">Abra a pasta no Drive e copie o ID da URL (após /folders/).</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Segundos por foto</label>
        <input type="number" min="2" max="30" value={config.seconds_per_photo || 5}
          onChange={e => setConfig((p: any) => ({ ...p, seconds_per_photo: Number(e.target.value) }))}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Transição</label>
        <select value={config.transition || 'fade'} onChange={e => setConfig((p: any) => ({ ...p, transition: e.target.value }))}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white">
          <option value="fade">Fade</option>
          <option value="slide">Slide</option>
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.shuffle || false}
          onChange={e => setConfig((p: any) => ({ ...p, shuffle: e.target.checked }))} />
        <span className="text-sm text-gray-900 dark:text-white">Embaralhar fotos</span>
      </label>

      <button onClick={save} disabled={saving || !config.folder_id}
        className="w-full py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold text-sm transition">
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
      </button>
    </div>
  );
};

const PainelOfertasConfigForm = ({ companyId }: any) => {
  const [config, setConfig] = useState<any>({ folder_id: '', seconds_per_image: 8, shuffle: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'painel_ofertas')
        .maybeSingle();
      if (data?.config) setConfig(data.config);
      fetchFolders(null);
    }
    init();
  }, [companyId]);

  const fetchFolders = async (parentId: string | null) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-drive-folders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, parent_id: parentId }),
        }
      );
      const json = await res.json();
      setFolders(json.folders || []);
    } catch (e) {
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const enterFolder = (folder: { id: string; name: string }) => {
    setFolderPath(prev => [...prev, folder]);
    fetchFolders(folder.id);
  };

  const goBack = () => {
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    fetchFolders(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const selectFolder = (folder: { id: string; name: string }) => {
    setConfig((p: any) => ({ ...p, folder_id: folder.id }));
  };

  const save = async () => {
    setSaving(true);
    await supabase
      .from('company_function_settings')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('function_key', 'painel_ofertas');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const selectedFolderName = folderPath.find(f => f.id === config.folder_id)?.name
    || folders.find(f => f.id === config.folder_id)?.name
    || config.folder_id;

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="text-sm text-orange-800 dark:text-orange-200">
          Coloque imagens de ofertas em uma pasta do Google Drive e selecione-a abaixo.
        </p>
      </div>

      {/* Pasta selecionada */}
      {config.folder_id && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <span className="text-green-600 dark:text-green-400">📁</span>
          <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate flex-1">
            {selectedFolderName || config.folder_id}
          </span>
          <button
            onClick={() => setConfig((p: any) => ({ ...p, folder_id: '' }))}
            className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
          >
            Remover
          </button>
        </div>
      )}

      {/* Abas: Navegar / Manual */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('browse')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${
            mode === 'browse'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          📁 Navegar Drive
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${
            mode === 'manual'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Inserir ID
        </button>
      </div>

      {/* Modo: Navegar */}
      {mode === 'browse' && (
        <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 text-xs overflow-x-auto">
            <button
              onClick={() => { setFolderPath([]); fetchFolders(null); }}
              className="text-blue-500 hover:underline flex-shrink-0"
            >
              Meu Drive
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => {
                    const newPath = folderPath.slice(0, i + 1);
                    setFolderPath(newPath);
                    fetchFolders(f.id);
                  }}
                  className="text-blue-500 hover:underline"
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          {/* Lista de pastas */}
          <div className="max-h-48 overflow-y-auto">
            {loadingFolders ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
              </div>
            ) : folders.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-400">Nenhuma pasta encontrada</p>
            ) : (
              <>
                {folderPath.length > 0 && (
                  <button
                    onClick={goBack}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition border-b border-gray-100 dark:border-white/5"
                  >
                    ← Voltar
                  </button>
                )}
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition ${
                      config.folder_id === folder.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                  >
                    <button
                      onClick={() => enterFolder(folder)}
                      className="flex items-center gap-2 flex-1 text-left text-sm text-gray-800 dark:text-gray-200"
                    >
                      📁 {folder.name}
                    </button>
                    <button
                      onClick={() => selectFolder(folder)}
                      className={`text-xs px-2 py-1 rounded flex-shrink-0 transition ${
                        config.folder_id === folder.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-orange-100'
                      }`}
                    >
                      {config.folder_id === folder.id ? '✓ Selecionada' : 'Usar'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modo: Manual */}
      {mode === 'manual' && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
            ID da Pasta <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            value={config.folder_id || ''}
            onChange={e => setConfig((p: any) => ({ ...p, folder_id: e.target.value }))}
            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Abra a pasta no Drive e copie o ID da URL (após /folders/).
          </p>
        </div>
      )}

      {/* Configurações */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Segundos por imagem</label>
        <input
          type="number" min="3" max="60"
          value={config.seconds_per_image || 8}
          onChange={e => setConfig((p: any) => ({ ...p, seconds_per_image: Number(e.target.value) }))}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.shuffle || false}
          onChange={e => setConfig((p: any) => ({ ...p, shuffle: e.target.checked }))}
        />
        <span className="text-sm text-gray-900 dark:text-white">Embaralhar imagens</span>
      </label>

      {/* ── Seção QR Code ── */}
      <div className="border-t border-gray-200 dark:border-white/10 pt-4">
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
          QR Code fixo no slideshow
        </label>
        <select
          value={config.qr_type || 'none'}
          onChange={e => setConfig((p: any) => ({ ...p, qr_type: e.target.value }))}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white mb-3"
        >
          <option value="none">Sem QR Code</option>
          <option value="website">🌐 Site da empresa</option>
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="instagram">📸 Instagram</option>
          <option value="custom">🔗 Link personalizado</option>
        </select>

        {config.qr_type === 'custom' && (
          <div className="space-y-2">
            <input type="url" placeholder="https://..."
              value={config.qr_custom_link || ''}
              onChange={e => setConfig((p: any) => ({ ...p, qr_custom_link: e.target.value }))}
              className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white" />
            <input type="text" placeholder="Texto abaixo do QR (ex: Saiba mais)"
              value={config.qr_custom_label || ''}
              onChange={e => setConfig((p: any) => ({ ...p, qr_custom_label: e.target.value }))}
              className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white" />
          </div>
        )}

        {config.qr_type && config.qr_type !== 'none' && config.qr_type !== 'custom' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              ✅ O QR Code será gerado automaticamente usando os dados já configurados em{' '}
              <strong>
                {config.qr_type === 'website' ? 'Site da empresa' :
                 config.qr_type === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
              </strong>.
              {config.qr_type === 'website' && ' Configure em Configurações > Contato > Site.'}
              {config.qr_type === 'whatsapp' && ' Configure em Configurações > Contato > WhatsApp.'}
              {config.qr_type === 'instagram' && ' Configure em Configurações > Contato > Instagram.'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving || !config.folder_id}
        className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold text-sm transition"
      >
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
      </button>
    </div>
  );
};

const AparelhosSmartConfigForm = ({ companyId }: any) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('company_function_settings').select('config')
        .eq('company_id', companyId).eq('function_key', 'aparelhos_smart').maybeSingle();
      setSelectedIds(data?.config?.selected_devices || []);
      fetchDevices();
    }
    init();
  }, [companyId]);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/smart-home-devices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ company_id: companyId, action: 'list' }),
        }
      );
      const json = await res.json();
      setDevices(json.devices || []);
    } catch { setDevices([]); }
    finally { setLoadingDevices(false); }
  };

  const toggleDevice = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setSaving(true);
    const config = {
      selected_devices: selectedIds.length > 0 ? selectedIds : null,
    };
    await supabase.from('company_function_settings')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('company_id', companyId).eq('function_key', 'aparelhos_smart');
    setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200">
          Selecione quais dispositivos serão exibidos no painel. Deixe todos desmarcados para mostrar todos.
        </p>
      </div>

      <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Dispositivos da conta</span>
          <button onClick={fetchDevices} className="text-xs text-blue-500 hover:underline">Atualizar</button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {loadingDevices ? (
            <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" /></div>
          ) : devices.length === 0 ? (
            <div className="text-center py-6 space-y-1">
              <p className="text-sm text-gray-400">Nenhum dispositivo encontrado</p>
              <p className="text-xs text-gray-400">Verifique se a conta Google tem dispositivos Smart Home.</p>
            </div>
          ) : (
            devices.map(device => (
              <label
                key={device.id}
                className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(device.id)}
                  onChange={() => toggleDevice(device.id)}
                  className="flex-shrink-0"
                />
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                  device.online ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
                }`}>
                  {device.type.toLowerCase().includes('light') ? '💡'
                    : device.type.toLowerCase().includes('thermostat') ? '🌡️'
                    : device.type.toLowerCase().includes('fan') ? '🌀'
                    : device.type.toLowerCase().includes('tv') ? '📺'
                    : '🔌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.displayName}</p>
                  <p className="text-xs text-gray-400">{device.type.split('.').pop()} · {device.online ? '🟢 Online' : '🔴 Offline'}</p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          {selectedIds.length} de {devices.length} dispositivos selecionados
        </p>
      )}
      {selectedIds.length === 0 && devices.length > 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Nenhum selecionado — todos os dispositivos serão exibidos
        </p>
      )}

      <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
        <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Comandos de voz</h5>
        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <li>• "Aparelhos smart" — abre o painel</li>
          <li>• "Ligar luz da sala"</li>
          <li>• "Desligar ar condicionado"</li>
        </ul>
      </div>

      <button onClick={save} disabled={saving || loadingDevices}
        className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm transition">
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
      </button>
    </div>
  );
};
const GoogleEmailForm = ({ companyId }: any) => {
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (companyId) {
      checkGoogleConnection();
    }
  }, [companyId]);

  async function checkGoogleConnection() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_accounts')
        .select('id, google_email, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setGoogleAccount(data);
      console.log('✅ Conta Google encontrada:', data); // Debug
    } catch (error) {
      console.error('Erro ao verificar conta Google:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleGoToAgenda() {
    if (!companyId) {
      console.error('❌ companyId não está definido');
      alert('Erro: ID da empresa não encontrado');
      return;
    }
    
    console.log('🔗 Navegando para /dashboard/agenda com companyId:', companyId);
    window.location.href = `/dashboard/agenda?companyId=${companyId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informação sobre a função */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Como funciona o Envio de Email
        </h4>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>✓ Diga: <strong>"Enviar email"</strong> para iniciar</li>
          <li>✓ Informe o destinatário por voz</li>
          <li>✓ Dite o assunto e conteúdo</li>
          <li>✓ Confirme ou edite antes de enviar</li>
        </ul>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs font-mono">
          CompanyId: {companyId || 'undefined'} | Conta: {googleAccount?.google_email || 'não encontrada'}
        </div>
      )}

      {/* Status da conexão Google */}
      {googleAccount ? (
        // ✅ CONECTADO
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  ✅ Conta Google Conectada
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Email: <span className="font-mono">{googleAccount.google_email}</span>
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Esta conta será usada para enviar os emails pelo assistente.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Gerenciar Conexão Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Comandos de Voz
            </h5>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>• "Enviar email para João"</li>
              <li>• "Mandar email para cliente"</li>
              <li>• "Envie um email"</li>
            </ul>
          </div>
        </div>
      ) : (
        // ❌ NÃO CONECTADO
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Conta Google não conectada
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Para enviar emails por voz, você precisa conectar uma conta Google primeiro.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoToAgenda}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Conectar Conta Google
          </button>

          <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Você será redirecionado para a seção <strong>Agenda</strong> onde poderá conectar sua conta Google e gerenciar emails e calendário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const WhatsappForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Número de WhatsApp
    </label>
    <input
      type="text"
      placeholder="(XX) XXXXX-XXXX"
      value={settings.whatsapp_number || ''}
      onChange={e => onChange('whatsapp_number', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O número que será usado para gerar o QR Code do WhatsApp.
    </p>
    {settings.whatsapp_number && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> wa.me/55{settings.whatsapp_number.replace(/\D/g, '')}
        </p>
      </div>
    )}
  </div>
);

const EnderecoForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    {/* Informação */}
    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
      <p className="text-sm text-blue-900 dark:text-blue-100">
        <strong>Configuração do Endereço:</strong> Configure o endereço físico da sua empresa. 
        Ele será exibido em um mapa interativo grande.
      </p>
    </div>

    {/* Endereço Físico */}
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Endereço Completo
      </label>
      <input
        type="text"
        placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100"
        value={settings.business_address || ''}
        onChange={e => onChange('business_address', e.target.value)}
        className="w-full p-3 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-red-500 focus:border-transparent"
        maxLength={300}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Digite o endereço completo: rua, número, bairro, cidade e estado. 
        Quanto mais completo, melhor a precisão no mapa.
      </p>
    </div>

    {/* Dicas */}
    <div className="space-y-2">
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-800 dark:text-green-200">
          ✅ <strong>Bom exemplo:</strong> Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100
        </p>
      </div>
      
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Evite:</strong> Endereços incompletos como apenas "Rua ABC" ou "São Paulo"
        </p>
      </div>
    </div>

    {/* Preview Endereço */}
    {settings.business_address && (
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Preview do Endereço:
        </label>
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-white/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {settings.business_address}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Este endereço será exibido em um mapa grande do Google Maps
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Preview Google Maps Link */}
    {settings.business_address && (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-xs text-red-800 dark:text-red-200 mb-2">
          <strong>Link do Google Maps:</strong>
        </p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.business_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-800 dark:hover:text-blue-300"
        >
          {`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.business_address)}`}
        </a>
        <p className="text-xs text-red-700 dark:text-red-300 mt-2">
          Clique no link acima para testar se o endereço está correto no Google Maps
        </p>
      </div>
    )}

 

    {/* Contador de caracteres */}
    {settings.business_address && (
      <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
        {settings.business_address.length}/300 caracteres
      </p>
    )}
  </div>
);


const InstagramForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Usuário do Instagram
    </label>
    <input
      type="text"
      placeholder="@seuusuario"
      value={settings.instagram_username || ''}
      onChange={e => onChange('instagram_username', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O @ do Instagram que será usado para gerar o QR Code.
    </p>
    {settings.instagram_username && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> instagram.com/{settings.instagram_username.replace('@', '')}
        </p>
      </div>
    )}
  </div>
);

const WebsiteForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      URL do Site
    </label>
    <input
      type="url"
      placeholder="https://www.seusite.com.br"
      value={settings.website || ''}
      onChange={e => onChange('website', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      A URL completa do seu site que será usada para gerar o QR Code.
    </p>
    {settings.website && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> {settings.website}
        </p>
      </div>
    )}
  </div>
);

const FacebookForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Username do Facebook
    </label>
    <input
      type="text"
      placeholder="@suapagina ou suapagina"
      value={settings.facebook || ''}
      onChange={e => onChange('facebook', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O username da sua página/perfil do Facebook (sem espaços).
    </p>
    {settings.facebook && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> facebook.com/{settings.facebook.replace('@', '')}
        </p>
      </div>
    )}
  </div>
);

const EmailForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Email de Contato
    </label>
    <input
      type="email"
      placeholder="contato@suaempresa.com.br"
      value={settings.email_contato || ''}
      onChange={e => onChange('email_contato', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O QR Code abrirá direto no app de email do cliente já endereçado para você.
    </p>
    {settings.email_contato && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> Ao escanear, abrirá o app de email com destino: <span className="font-mono">{settings.email_contato}</span>
        </p>
      </div>
    )}
  </div>
);

const LinkedinForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Username ou URL do LinkedIn
    </label>
    <input
      type="text"
      placeholder="suaempresa ou https://linkedin.com/company/suaempresa"
      value={settings.linkedin || ''}
      onChange={e => onChange('linkedin', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Pode inserir apenas o username ou a URL completa do perfil/empresa.
    </p>
    {settings.linkedin && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong>{' '}
          {settings.linkedin.startsWith('http')
            ? settings.linkedin
            : `linkedin.com/company/${settings.linkedin.replace('@', '')}`}
        </p>
      </div>
    )}
  </div>
);

const TiktokForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Username do TikTok
    </label>
    <input
      type="text"
      placeholder="@suaconta ou suaconta"
      value={settings.tiktok || ''}
      onChange={e => onChange('tiktok', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O username da sua conta TikTok (com ou sem @).
    </p>
    {settings.tiktok && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> tiktok.com/{settings.tiktok.startsWith('@') ? settings.tiktok : `@${settings.tiktok}`}
        </p>
      </div>
    )}
  </div>
);

const TwitterForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Username do Twitter/X
    </label>
    <input
      type="text"
      placeholder="@suaconta ou suaconta"
      value={settings.twitter || ''}
      onChange={e => onChange('twitter', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      O username da sua conta Twitter/X (com ou sem @).
    </p>
    {settings.twitter && (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Preview:</strong> x.com/{settings.twitter.replace('@', '')}
        </p>
      </div>
    )}
  </div>
);

const TelefoneForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Telefone Fixo
    </label>
    <input
      type="tel"
      placeholder="(XX) XXXX-XXXX"
      value={settings.telefone_fixo || ''}
      onChange={e => onChange('telefone_fixo', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Digite o número com DDD. Apenas números.
    </p>
    {settings.telefone_fixo && (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-800 dark:text-green-200">
          <strong>Funcionalidade especial:</strong> Ao escanear este QR Code, o celular do cliente abrirá automaticamente o aplicativo de ligações com o número já preenchido, pronto para ligar!
        </p>
      </div>
    )}
  </div>
);

const IdentificarFraudeForm = () => (
  <div className="space-y-4">
    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
        Como funciona o Identificar Fraude
      </h4>
      <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
        <li>✓ Analisa imagens e boletos (PDF) em busca de adulteração</li>
        <li>✓ Verifica links e sites suspeitos de phishing</li>
        <li>✓ Detecta fraudes em PIX, boleto e mensagens de golpe</li>
        <li>✓ Retorna nível de risco: Seguro, Suspeito ou Fraude</li>
      </ul>
    </div>

    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-2">
        <Mic size={14} />
        Comandos de Voz
      </h5>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>• "Identificar fraude"</li>
        <li>• "Verificar boleto suspeito"</li>
        <li>• "Checar link"</li>
        <li>• "Site suspeito"</li>
        <li>• "Analisar link"</li>
      </ul>
    </div>

    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
      <p className="text-xs text-amber-800 dark:text-amber-200">
        ⚠️ <strong>Atenção:</strong> A análise usa IA e pode ter limitações.
        Em caso de dúvida, consulte sempre seu banco ou órgão competente.
      </p>
    </div>
  </div>
);

const VideoInstrucoesForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
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

    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        URL do Vídeo
      </label>
      <input
        type="url"
        placeholder="https://www.youtube.com/watch?v=..."
        value={settings.video_instrucoes_url || ''}
        onChange={e => {
          onChange('video_instrucoes_url', e.target.value);
        }}
        className="w-full px-4 py-3 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Suporta: YouTube, Vimeo, links diretos de vídeo (.mp4, .webm)
      </p>
    </div>

    {/* Preview */}
    {settings.video_instrucoes_url && !isInvalidUrl(settings.video_instrucoes_url) && (
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200 flex items-center space-x-2">
          <span>✓</span>
          <span>
            <strong>Vídeo configurado!</strong> Os clientes poderão assistir por comando de voz.
          </span>
        </p>
        {settings.video_instrucoes_url.includes('youtube.com') && (
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            YouTube detectado - reprodução otimizada
          </p>
        )}
        {settings.video_instrucoes_url.includes('vimeo.com') && (
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            Vimeo detectado - reprodução otimizada
          </p>
        )}
      </div>
    )}

    {/* Error */}
    {settings.video_instrucoes_url && isInvalidUrl(settings.video_instrucoes_url) && (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-800 dark:text-red-200 flex items-center space-x-2">
          <span>⚠️</span>
          <span>URL inválida. Use um link completo começando com https://</span>
        </p>
      </div>
    )}

    {/* Dicas */}
    <div className="space-y-2">
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-800 dark:text-green-200">
          ✅ <strong>Bom exemplo:</strong> https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </p>
      </div>
      
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ <strong>Evite:</strong> URLs encurtadas (bit.ly) ou links privados
        </p>
      </div>
    </div>
  </div>
);

// Função auxiliar para validar URL
function isInvalidUrl(url: string): boolean {
  try {
    new URL(url);
    return false;
  } catch {
    return true;
  }
}

const PixForm = ({ settings, onChange }: any) => {
  const [isLocked] = useState(!!settings.receiving_pix_key);

  return (
    <div className="space-y-4">
      <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Como funciona o Recebimento via PIX
        </h4>
        <ul className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
          <li>✓ <strong>Gerar PIX:</strong> Diga "Gerar PIX de 50 reais" para criar um QR Code instantaneamente</li>
          <li>✓ <strong>Confirmar recebimento:</strong> Após o cliente pagar, diga "Confirmar PIX" para confirmação automática. (Apenas na confirmação de pix que é cobrado 1 crédito).</li>
          <li>✓ <strong>Cancelar:</strong> Se não utilizado, diga "Cancelar PIX" para invalidar o QR Code</li>
        </ul>
      </div>
      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-900 dark:text-green-100">
          Os valores recebidos são creditados automaticamente na seção <strong>Recebimentos</strong> do Menu Principal.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Chave PIX para Recebimento
        </label>
        <input
          type="text"
          placeholder="Sua chave PIX (CPF, e-mail, telefone ou chave aleatória)"
          value={settings.receiving_pix_key || ''}
          onChange={e => onChange('receiving_pix_key', e.target.value)}
          disabled={isLocked}
          className={`w-full p-2 border rounded-md
            dark:bg-slate-800 dark:border-white/10
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            dark:disabled:bg-slate-900 dark:disabled:text-gray-500`}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isLocked
            ? 'Chave PIX configurada! Esta chave será usada para receber pagamentos dos clientes via QR Code gerado pelo assistente.'
            : 'Esta chave será usada para identificar sua conta ao receber pagamentos via PIX dos clientes.'}
        </p>
      </div>
    </div>
  );
};

const ChatGptForm = ({ settings, onChange }: any) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
      Prompt do Sistema (ChatGPT)
    </label>
    <textarea
      rows={6}
      placeholder="Ex: Você é um assistente de vendas. Seja sempre cordial e ajude o cliente a encontrar o melhor produto..."
      value={settings.system_prompt || ''}
      onChange={e => onChange('system_prompt', e.target.value)}
      className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Determine como o assistente deve responder. Seja específico para obter melhores resultados.
    </p>
  </div>
);

const WifiQRCodeForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Nome da Rede (SSID) <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder="Ex: Minha Empresa - WiFi"
        value={settings.wifi_network_name || ''}
        onChange={e => onChange('wifi_network_name', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Senha da Rede
      </label>
      <input
        type="text"
        placeholder="Deixe em branco se a rede for aberta"
        value={settings.wifi_network_password || ''}
        onChange={e => onChange('wifi_network_password', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500"
      />
    </div>
    {settings.wifi_network_name && (
      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="text-xs text-orange-800 dark:text-orange-200">
          ✅ QR Code gerado automaticamente no formato padrão Wi-Fi
        </p>
      </div>
    )}
  </div>
);

const CardapioForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
      <p className="text-sm text-blue-800 dark:text-blue-200">
        Funciona com Google Drive (PDF público), iFood, Linktree, site próprio e qualquer link público.
      </p>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Link do Cardápio <span className="text-red-500">*</span>
      </label>
      <input
        type="url"
        placeholder="https://meusite.com/cardapio ou link do PDF"
        value={settings.cardapio_url || ''}
        onChange={e => onChange('cardapio_url', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Descrição (opcional)
      </label>
      <input
        type="text"
        placeholder="Ex: Cardápio completo com pratos, bebidas e sobremesas"
        value={settings.cardapio_description || ''}
        onChange={e => onChange('cardapio_description', e.target.value)}
        maxLength={120}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
        {(settings.cardapio_description || '').length}/120
      </p>
    </div>
    {settings.cardapio_url && (
      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="text-xs text-orange-800 dark:text-orange-200">
          ✅ {settings.cardapio_url.toLowerCase().includes('.pdf') ? '📄 PDF detectado' : '🌐 Link de site detectado'}
        </p>
      </div>
    )}
  </div>
);

const CanalYoutubeForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
      <p className="text-sm text-red-800 dark:text-red-200">
        Cole o link do seu canal do YouTube. Funciona com <strong>@handle</strong> (ex: youtube.com/@seucanal) ou link direto do canal.
      </p>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Link do Canal <span className="text-red-500">*</span>
      </label>
      <input
        type="url"
        placeholder="https://youtube.com/@seucanal"
        value={settings.youtube_channel_url || ''}
        onChange={e => onChange('youtube_channel_url', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-red-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Nome do Canal (opcional)
      </label>
      <input
        type="text"
        placeholder="Ex: Canal Oficial da Empresa"
        value={settings.youtube_channel_name || ''}
        onChange={e => onChange('youtube_channel_name', e.target.value)}
        maxLength={80}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-red-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Descrição (opcional)
      </label>
      <input
        type="text"
        placeholder="Ex: Inscreva-se e fique por dentro das novidades!"
        value={settings.youtube_channel_description || ''}
        onChange={e => onChange('youtube_channel_description', e.target.value)}
        maxLength={120}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-red-500"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
        {(settings.youtube_channel_description || '').length}/120
      </p>
    </div>
    {settings.youtube_channel_url && (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-xs text-red-800 dark:text-red-200">
          ✅ {settings.youtube_channel_url.includes('@')
            ? `🔴 Canal detectado: ${settings.youtube_channel_url.match(/@[\w-]+/)?.[0] ?? ''}`
            : '🔴 Link de canal detectado'}
        </p>
      </div>
    )}
  </div>
);

const NossoQRCodeForm = ({ settings, onChange, companyId }: any) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Conteúdo do QR Code <span className="text-red-500">*</span>
      </label>
      <textarea
        rows={3}
        placeholder={'Ex: https://instagram.com/suaempresa\nou chave Pix: email@empresa.com'}
        value={settings.qrcode_content || ''}
        onChange={e => onChange('qrcode_content', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500 resize-none font-mono text-sm"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        O que o assistente vai falar <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder="Ex: Escaneie para nos seguir no Instagram"
        value={settings.qrcode_label || ''}
        onChange={e => onChange('qrcode_label', e.target.value)}
        maxLength={100}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-orange-500"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
        {(settings.qrcode_label || '').length}/100
      </p>
    </div>

    {settings.qrcode_content && (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>

        {/* QR Code */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid #e5e7eb',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#000080',
            margin: 0,
            whiteSpace: 'nowrap',
          }}>
            Prévia do QR Code:
          </p>
          <img
            src={`/api/qrcode?size=120&data=${encodeURIComponent(settings.qrcode_content)}&color=%23000080${companyId ? `&company_id=${companyId}` : ''}`}
            alt="Preview QR"
            style={{ width: '120px', height: '120px', display: 'block', borderRadius: '6px' }}
          />
        </div>

        {/* Exemplos de uso ao lado */}
        <div style={{
          flex: 1,
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'rgba(229,231,235,1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          background: 'transparent',
        }}>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Exemplos de uso:</p>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            <li>Chave Pix estática</li>
            <li>Link de avaliação Google Maps</li>
            <li>Formulário, promoção, entre outros</li>
          </ul>
        </div>

      </div>
    )}

    {!settings.qrcode_content && (
      <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exemplos de uso:</p>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          <li>Chave Pix estática</li>
          <li>Link de avaliação Google Maps</li>
          <li>Formulário, promoção, entre outros</li>
        </ul>
      </div>
    )}
  </div>
);

const OrcamentoForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">

    {/* Dica de Uso */}
    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
      <p className="text-sm text-blue-900 dark:text-blue-100">
        <strong>Dica:</strong> Seja específico! Inclua tabelas de preços, condições de pagamento, 
        prazos de validade e qualquer informação relevante para orçamentos precisos.
      </p>
    </div>

    {/* Prompt de Configuração */}
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Configuração de Orçamento (Prompt)
      </label>
      <textarea 
        rows={12}
        placeholder={`Exemplo:

Você é um assistente de vendas especializado em criar orçamentos.

TABELA DE PREÇOS:
- Produto A: R$ 100,00
- Produto B: R$ 250,00
- Serviço de Instalação: R$ 150,00

CONDIÇÕES:
- Pagamento à vista: 10% desconto
- Parcelado em até 3x sem juros
- Validade: 7 dias

Ao gerar orçamento:
1. Calcule valores com base na tabela
2. Aplique descontos quando mencionado
3. Apresente de forma profissional
4. Inclua condições e validade`}
        value={settings.orcamento_prompt || ''}
        onChange={e => onChange('orcamento_prompt', e.target.value)}
        className="w-full p-3 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Configure preços, produtos, serviços e regras. O assistente usará estas informações 
        para criar orçamentos precisos quando solicitado.
      </p>
    </div>

    {/* Exemplos de Uso */}
    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
        📝 Exemplos de Comandos de Voz
      </h5>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>• "Quanto custa 5 unidades do Produto A?"</li>
        <li>• "Preciso de um orçamento para instalação"</li>
        <li>• "Qual o valor total com desconto à vista?"</li>
        <li>• "Faça um orçamento de 3 Produtos B"</li>
      </ul>
    </div>
  </div>
);

const FaqForm = () => (
  <div>
    <div className="text-sm bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-4">
      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
        💡 Vantagens das Respostas Rápidas (FAQs)
      </h4>
      <ul className="space-y-2 text-green-800 dark:text-green-200">
        <li>✓ Gastam <strong>metade dos créditos</strong> de uma interação com ChatGPT</li>
        <li>✓ Respostas instantâneas e consistentes</li>
        <li>✓ Ideal para perguntas frequentes e repetitivas</li>
      </ul>
    </div>
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        ⚠️ <strong>Limitação:</strong> FAQs não processam cálculos ou informações complexas. Para isso, use o ChatGPT.
      </p>
    </div>
    <a
      href="/dashboard/faqs"
      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      Gerenciar FAQs
    </a>
  </div>
);

// ── 1. Componente CriarNotaForm (adicionar antes de FORM_COMPONENTS) ────────
 
const CriarNotaForm = () => (
  <div className="space-y-4">
    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
      <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
        Como funciona
      </h4>
      <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
        <li>• Cliente dita a nota por voz ou usa comando "criar nota sobre [assunto]"</li>
        <li>• Assistente reconhece e transcreve o texto automaticamente</li>
        <li>• Cliente pode editar e adicionar título antes de salvar</li>
        <li>• Notas ficam salvas no dashboard em Arquivos → Notas</li>
      </ul>
    </div>
 
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
        Comandos de voz
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-200">
        <div>
          <p className="font-medium">Para criar:</p>
          <ul className="space-y-0.5 mt-1">
            <li>• "Criar nota"</li>
            <li>• "Anotar isso"</li>
            <li>• "Fazer anotação"</li>
          </ul>
        </div>
        <div>
          <p className="font-medium">Durante gravação:</p>
          <ul className="space-y-0.5 mt-1">
            <li>• "Concluir" (finaliza)</li>
            <li>• "Salvar" (confirma)</li>
            <li>• "Cancelar" (fecha)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);
 
const LembreteRemediosForm = () => (
  <div className="space-y-4">
    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
      <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
        Como funciona
      </h4>
      <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
        <li>• Cliente preenche 4 campos: nome, intervalo, horário e duração</li>
        <li>• Sistema calcula automaticamente todos os horários do tratamento</li>
        <li>• Preview em tempo real mostra quantas doses por dia e total de dias</li>
        <li>• Opção de receber lembretes no assistente ou Google Calendar</li>
      </ul>
    </div>
 
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
        📋 Campos do formulário
      </h4>
      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
        <div>
          <p className="font-medium">1. Nome do Remédio</p>
          <p className="text-xs">Ex: Paracetamol 500mg</p>
        </div>
        <div>
          <p className="font-medium">2. Intervalo entre doses</p>
          <p className="text-xs">Ex: 8 horas (= 3 doses por dia)</p>
        </div>
        <div>
          <p className="font-medium">3. Horário da primeira dose</p>
          <p className="text-xs">Ex: 08:00 (demais horários são calculados)</p>
        </div>
        <div>
          <p className="font-medium">4. Duração do tratamento</p>
          <p className="text-xs">Escolha: Total de dias OU Quantidade de comprimidos</p>
        </div>
      </div>
    </div>
 
    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
        Modos de lembrete
      </h4>
      <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
        <div>
          <p className="font-medium">🔔 Assistente</p>
          <p className="text-xs">Salva horários diários - alertas quando cliente usar o assistente</p>
        </div>
        <div>
          <p className="font-medium">📅 Google Calendar</p>
          <p className="text-xs">Cria TODOS os eventos até o fim do tratamento (ex: 21 comprimidos = 21 eventos)</p>
        </div>
        <div>
          <p className="font-medium">🔔📅 Ambos</p>
          <p className="text-xs">Salva no assistente + cria todos os eventos no Calendar</p>
        </div>
      </div>
    </div>
 
    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
        💡 Exemplo de uso
      </h4>
      <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
        <p>• <strong>Remédio:</strong> Paracetamol 500mg</p>
        <p>• <strong>Intervalo:</strong> 8 horas</p>
        <p>• <strong>Primeira dose:</strong> 08:00</p>
        <p>• <strong>Duração:</strong> 21 comprimidos</p>
        <p className="pt-2 border-t border-green-300 dark:border-green-700 mt-2">
          📊 <strong>Sistema calcula:</strong> 3 doses/dia × 7 dias = 21 doses totais<br/>
          Horários: 08:00, 16:00, 00:00
        </p>
      </div>
    </div>
 
    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        🔗 Integração Google Calendar
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Se Google Calendar não estiver conectado, o modal exibirá um botão para conectar
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Os modos Calendar e Ambos ficam desabilitados até a conexão ser estabelecida
      </p>
    </div>
 
    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        Comandos de voz
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Para criar:</p>
          <ul className="space-y-0.5 mt-1">
            <li>• "Lembrete de remédio"</li>
            <li>• "Configurar remédio"</li>
            <li>• "Horário do remédio"</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">No formulário:</p>
          <ul className="space-y-0.5 mt-1">
            <li>• "Salvar" (confirma)</li>
            <li>• "Cancelar" (fecha)</li>
          </ul>
        </div>
      </div>
    </div>
 
    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        Créditos
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Cada lembrete salvo consome <strong>1 crédito</strong>
      </p>
    </div>
  </div>
);

const RastreioCorreiosForm = () => (
  <div className="space-y-4">
    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 className="font-semibold mb-2">Como funciona</h4>
      <ul className="space-y-1 text-sm">
        <li>• Cliente digita código de rastreio (13 caracteres)</li>
        <li>• Assistente consulta API pública dos Correios</li>
        <li>• Exibe status atual + data/hora + local</li>
        <li>• Ícones coloridos por status (entregue, em trânsito, postado)</li>
      </ul>
    </div>

    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      <h4 className="font-semibold mb-2">Comandos de voz</h4>
      <ul className="space-y-1 text-sm">
        <li>• "Rastrear encomenda"</li>
        <li>• "Rastreio Correios"</li>
        <li>• "Cadê minha encomenda"</li>
      </ul>
    </div>
  </div>
);

const NossaMarcaForm = ({ settings, onChange }: any) => (
  <div className="space-y-4">
    {/* Descrição da Marca */}
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Descrição da Marca
      </label>
      <textarea
        rows={4}
        placeholder="Ex: Somos uma empresa inovadora que transforma o atendimento com inteligência artificial..."
        value={settings.brand_description || ''}
        onChange={e => onChange('brand_description', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        maxLength={500}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {(settings.brand_description || '').length}/500 caracteres
      </p>
    </div>

    {/* Horário de Funcionamento */}
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Horário de Funcionamento
      </label>
      <input
        type="text"
        placeholder="Ex: Seg-Sex: 8h às 18h | Sáb: 9h às 13h"
        value={settings.business_hours || ''}
        onChange={e => onChange('business_hours', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        maxLength={200}
      />
    </div>

    {/* Endereço ou Site */}
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
        Endereço ou Site
      </label>
      <input
        type="text"
        placeholder="Ex: Rua Exemplo, 123 - São Paulo, SP ou www.seusite.com.br"
        value={settings.business_address || ''}
        onChange={e => onChange('business_address', e.target.value)}
        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        maxLength={300}
      />
      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          💡 <strong>Dica:</strong> Se for endereço físico, o QR Code abrirá no Google Maps. 
          Se for URL, abrirá o site com preview.
        </p>
      </div>
    </div>

    {/* Preview */}
    {settings.business_address && (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-800 dark:text-green-200">
          <strong>Preview:</strong>{' '}
          {settings.business_address.startsWith('http') || settings.business_address.includes('www.')
            ? `Site: ${settings.business_address}`
            : `📍 Localização: ${settings.business_address}`
          }
        </p>
      </div>
    )}
  </div>
);

const SegundaViaBoletoForm = () => (
  <div className="space-y-4">
    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
      <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
        Como funciona a Segunda Via de Boleto
      </h4>
      <ul className="space-y-1 text-sm text-indigo-800 dark:text-indigo-200">
        <li>✓ Cliente digita a linha digitável (47 ou 48 dígitos)</li>
        <li>✓ Sistema valida e extrai: banco, valor e vencimento</li>
        <li>✓ Gera PDF com código de barras para leitura no caixa</li>
        <li>✓ PDF disponível para download e envio por email</li>
        <li>✓ 100% local — sem consulta a APIs externas</li>
      </ul>
    </div>
    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
      <p className="text-xs text-amber-800 dark:text-amber-200">
        <strong>Limitação:</strong> Apenas dados da linha digitável são extraídos
        (banco, valor, vencimento). Nome do pagador/beneficiário não está disponível.
      </p>
    </div>
    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Comandos de voz</h5>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>• "Segunda via do boleto"</li>
        <li>• "Gerar boleto"</li>
        <li>• "Perdi meu boleto"</li>
        <li>• "Reimprimir boleto"</li>
      </ul>
    </div>
  </div>
);

const FichasProducaoForm = ({ companyId }: any) => {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
          Fichas de Producao
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Gerencie suas fichas técnicas, ingredientes e preços diretamente no dashboard.
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10 space-y-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Como usar:</p>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Diga "criar ficha" ou "nova receita" para o assistente</li>
          <li>• O assistente gera uma ficha base automaticamente</li>
          <li>• Corrija quantidades e precos por voz ou manualmente</li>
          <li>• Custa 3 créditos por ficha salva</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/dashboard/fichas?company=${companyId}`)}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
      >
        <ExternalLink size={16} />
        Abrir Fichas de Producao no Dashboard
      </button>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-xs text-yellow-800 dark:text-yellow-300">
          Precos estimados pela IA são marcados com aviso. Confirme com seus fornecedores antes de tomar decisões financeiras.
        </p>
      </div>
    </div>
  );
};

const ClimaTempoForm = ({ companyId }: any) => {
  const [config, setConfig] = useState<any>({ mode: 'auto', default_city: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      const { data } = await supabase
        .from('company_function_settings')
        .select('config')
        .eq('company_id', companyId)
        .eq('function_key', 'clima_tempo')
        .maybeSingle();
      if (data?.config) setConfig(data.config);
      setLoading(false);
    }
    fetchConfig();
  }, [companyId]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('company_function_settings')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('function_key', 'clima_tempo');

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('Erro ao salvar. Tente novamente.');
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🌤️ Como funciona o Clima e Tempo
        </h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>✓ Localização automática: usa o GPS do dispositivo do cliente</li>
          <li>✓ Cidade fixa: sempre mostra o clima dessa cidade</li>
          <li>✓ O cliente pode perguntar "tempo em [cidade]" a qualquer momento</li>
        </ul>
      </div>

      {/* Modo */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Modo de Localização
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all border-gray-200 dark:border-white/10 hover:border-blue-400">
            <input
              type="radio"
              name="clima_mode"
              checked={config.mode === 'auto'}
              onChange={() => setConfig((p: any) => ({ ...p, mode: 'auto', default_city: '' }))}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                📍 Localização automática do cliente
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Usa o GPS do dispositivo. Se negado, usa São Paulo como fallback.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all border-gray-200 dark:border-white/10 hover:border-blue-400">
            <input
              type="radio"
              name="clima_mode"
              checked={config.mode === 'fixed'}
              onChange={() => setConfig((p: any) => ({ ...p, mode: 'fixed', default_city: p.default_city || 'São Paulo' }))}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                🏙️ Cidade fixa do estabelecimento
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Sempre mostra o clima da cidade configurada abaixo.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Campo cidade — só aparece no modo fixo */}
      {config.mode === 'fixed' && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
            Cidade Padrão <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: São Paulo, Rio de Janeiro, Curitiba..."
            value={config.default_city || ''}
            onChange={e => setConfig((p: any) => ({ ...p, default_city: e.target.value }))}
            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use o nome em português. Ex: "Belo Horizonte", "Porto Alegre".
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-white/10">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 O cliente sempre pode perguntar{' '}
          <span className="font-mono bg-gray-200 dark:bg-slate-700 px-1 rounded">
            "tempo em Florianópolis"
          </span>{' '}
          para consultar qualquer cidade, independente da configuração.
        </p>
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving || (config.mode === 'fixed' && !config.default_city?.trim())}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
      >
        {saving
          ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Salvando...</span></>
          : saved ? '✓ Salvo!' : 'Salvar Configurações'
        }
      </button>
    </div>
  );
};

const BuscarEnderecoForm = () => (
  <div className="space-y-4">
    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 className="font-semibold mb-2">Como funciona</h4>
      <ul className="space-y-1 text-sm">
        <li>• Cliente fala CEP ou nome do local</li>
        <li>• Assistente busca via Google Maps</li>
        <li>• Exibe mapa com pin + endereço formatado</li>
        <li>• Botão "Traçar Rota" para abrir modal de rota</li>
      </ul>
    </div>

    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      <h4 className="font-semibold mb-2">Comandos de voz</h4>
      <ul className="space-y-1 text-sm">
        <li>• "Buscar esse endereço na Av. Paulista"</li>
        <li>• "Buscar endereço"</li>
        <li>• "Pesquisar um endereço"</li>
      </ul>
    </div>
  </div>
);

const MeuCupomForm = ({ companyId }: any) => {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchConfig();
  }, [companyId]);

  async function fetchConfig() {
    setLoading(true);
    const { data } = await supabase
      .from('company_function_settings')
      .select('config')
      .eq('company_id', companyId)
      .eq('function_key', 'meu_cupom')
      .maybeSingle();
    setConfig(data?.config || {});
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('company_function_settings')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('function_key', 'meu_cupom');

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      console.error('Erro ao salvar config meu_cupom:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
    setSaving(false);
  }

  function handleChange(key: string, value: any) {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
          Programa de Indicação
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Clientes geram cupons personalizados pelo assistente de voz. 
          Configure aqui o benefício que cada cupom concede.
        </p>
      </div>

      {/* Tipo de desconto */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Tipo de Desconto
        </label>
        <select
          value={config.discount_type || 'percentage'}
          onChange={e => handleChange('discount_type', e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="percentage">Porcentagem (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
        </select>
      </div>

      {/* Valor */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Valor do Desconto
        </label>
        <input
          type="number"
          min="1"
          max={config.discount_type === 'percentage' ? 100 : undefined}
          placeholder={config.discount_type === 'percentage' ? 'Ex: 10' : 'Ex: 25'}
          value={config.discount_value || ''}
          onChange={e => handleChange('discount_value', Number(e.target.value))}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {config.discount_type === 'percentage'
            ? 'Percentual de desconto que o cupom concede (1–100)'
            : 'Valor em reais que o cupom concede (ex: 25 = R$ 25,00)'}
        </p>
      </div>

      {/* Validade */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Validade (dias)
        </label>
        <input
          type="number"
          min="1"
          placeholder="Ex: 30 — deixe vazio para sem expiração"
          value={config.validity_days || ''}
          onChange={e => handleChange('validity_days', e.target.value ? Number(e.target.value) : null)}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Destino do QR */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
          Destino do QR Code
        </label>
        <select
          value={config.qr_destination || 'share_only'}
          onChange={e => handleChange('qr_destination', e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="share_only">Apenas o código (para compartilhar)</option>
          <option value="assistant_preconfigured">Link para o assistente com cupom</option>
          <option value="landing_page">Landing page personalizada</option>
        </select>
      </div>

      {/* Landing page URL — só aparece se qr_destination = landing_page */}
      {config.qr_destination === 'landing_page' && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
            URL da Landing Page
          </label>
          <input
            type="url"
            placeholder="https://meusite.com.br/promocao"
            value={config.landing_page_url || ''}
            onChange={e => handleChange('landing_page_url', e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            O QR Code apontará para: {config.landing_page_url || 'sua-url'}?ref=CODIGO
          </p>
        </div>
      )}

      {/* Preview */}
      {config.discount_value > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            ✅ Cupom configurado:{' '}
            <strong>
              {config.discount_type === 'percentage'
                ? `${config.discount_value}% de desconto`
                : `R$ ${config.discount_value},00 de desconto`}
            </strong>
            {config.validity_days ? ` · válido por ${config.validity_days} dias` : ' · sem expiração'}
          </p>
        </div>
      )}

      {/* Botão salvar próprio (não usa o handleSave do modal pai) */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
      >
        {saving
          ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Salvando...</span></>
          : saved ? '✓ Salvo!' : 'Salvar Configurações'
        }
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Estas configurações são lidas pela edge function ao gerar cada cupom.
      </p>
    </div>
  );
};

const RegistrationConfigForm = ({ companyId }: any) => {
  const FIXED_FIELDS = [
    { key: 'nome',        label: 'Nome',        required: true },
    { key: 'sobrenome',   label: 'Sobrenome',   required: false },
    { key: 'telefone',    label: 'Telefone',    required: false },
    { key: 'email',       label: 'E-mail',      required: false },
    { key: 'cpf',         label: 'CPF',         required: false },
    { key: 'endereco',    label: 'Endereço',    required: false },
    { key: 'empresa',     label: 'Empresa',     required: false },
    { key: 'cargo',       label: 'Cargo',       required: false },
    { key: 'observacoes', label: 'Observações', required: false },
  ];

  const [selectedFields, setSelectedFields] = useState<string[]>(['nome']);
  // Campos customizados: [{ key: 'outros_0', label: 'Meu Campo' }, ...]
  const [customFields, setCustomFields] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      const { data } = await supabase
        .from('registration_configs')
        .select('fields, custom_fields')
        .eq('company_id', companyId)
        .maybeSingle();

      if (data?.fields) setSelectedFields(data.fields);
      if (data?.custom_fields) setCustomFields(data.custom_fields);
      setLoading(false);
    }
    fetchConfig();
  }, [companyId]);

  function toggleField(key: string) {
    if (key === 'nome') return;
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  }

  function addCustomField() {
    const key = `outros_${Date.now()}`;
    setCustomFields(prev => [...prev, { key, label: '' }]);
    setSelectedFields(prev => [...prev, key]);
  }

  function updateCustomLabel(key: string, label: string) {
    setCustomFields(prev => prev.map(f => f.key === key ? { ...f, label } : f));
  }

  function removeCustomField(key: string) {
    setCustomFields(prev => prev.filter(f => f.key !== key));
    setSelectedFields(prev => prev.filter(k => k !== key));
  }

  // Ordem: fixos selecionados primeiro, depois customizados
  const allFieldLabels: Record<string, string> = {
    ...Object.fromEntries(FIXED_FIELDS.map(f => [f.key, f.label])),
    ...Object.fromEntries(customFields.map(f => [f.key, f.label || 'Campo sem nome'])),
  };

  const orderedSelected = [
    ...FIXED_FIELDS.filter(f => selectedFields.includes(f.key)).map(f => f.key),
    ...customFields.filter(f => selectedFields.includes(f.key)).map(f => f.key),
  ];

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('registration_configs')
      .upsert(
        {
          company_id: companyId,
          fields: orderedSelected,
          custom_fields: customFields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      console.error('Erro ao salvar registration_configs:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
          Campos do Cadastro
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Selecione quais informações o assistente irá coletar.{' '}
          <strong className="text-blue-900 dark:text-blue-100">Nome</strong> é obrigatório.
        </p>
      </div>

      {/* Grid 2 colunas no desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FIXED_FIELDS.map(field => {
          const isSelected = selectedFields.includes(field.key);
          return (
            <button
              key={field.key}
              type="button"
              onClick={() => toggleField(field.key)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
              } ${field.required ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
            >
              <span className="font-medium">{field.label}</span>
              <div className="flex items-center gap-2">
                {field.required && (
                  <span className="text-xs text-blue-500 dark:text-blue-400">obrigatório</span>
                )}
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-slate-600'
                }`}>
                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Campos customizados */}
      {customFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Campos personalizados:</p>
          {customFields.map(cf => (
            <div key={cf.key} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome do campo (ex: Matrícula, Setor...)"
                value={cf.label}
                onChange={e => updateCustomLabel(cf.key, e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeCustomField(cf.key)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition flex-shrink-0"
                title="Remover campo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botão adicionar campo customizado */}
      <button
        type="button"
        onClick={addCustomField}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm text-gray-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Adicionar campo personalizado
      </button>

      {/* Preview da ordem */}
      {orderedSelected.length > 0 && (
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Ordem das perguntas:</p>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            {orderedSelected.map((k, i) => (
              <span key={k}>
                {i + 1}. {allFieldLabels[k] || 'Campo sem nome'}
                {i < orderedSelected.length - 1 ? ' → ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Em breve */}
      <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 opacity-60">
        <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">Em breve</p>
        <div className="flex gap-4 text-xs text-gray-400 dark:text-slate-500">
          <span>Cadastro com biometria</span>
          <span>Identificação facial</span>
        </div>
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
      >
        {saving
          ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Salvando...</span></>
          : saved ? '✓ Salvo!' : 'Salvar Configurações'
        }
      </button>
    </div>
  );
};

const TocarVideoForm = () => (
  <div className="space-y-4">
    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
        Como funciona o Tocar Vídeo
      </h4>
      <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
        <li>✓ Busca vídeos automaticamente no YouTube por voz</li>
        <li>✓ Reproduz o resultado mais relevante em tela cheia</li>
        <li>✓ Fecha automaticamente quando o vídeo termina</li>
        <li>✓ O cliente pode buscar outro vídeo direto no player</li>
      </ul>
    </div>

    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-2">
        Comandos de Voz
      </h5>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>• "Tocar vídeo de yoga"</li>
        <li>• "Assistir receita de bolo"</li>
        <li>• "Me mostra um vídeo de meditação"</li>
        <li>• "Reproduzir vídeo sobre finanças"</li>
      </ul>
    </div>
  </div>
);

const TocarMusicaForm = () => (
  <div className="space-y-4">
    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
        Como funciona o Tocar Música
      </h4>
      <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
        <li>✓ Busca músicas no YouTube por voz</li>
        <li>✓ Mini player no canto da tela — não interrompe o assistente</li>
        <li>✓ Pode minimizar e continuar ouvindo em segundo plano</li>
        <li>✓ Cliente pode buscar outra música direto no player</li>
      </ul>
    </div>
    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Comandos de Voz</h5>
      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>• "Tocar música de jazz"</li>
        <li>• "Ouvir lofi"</li>
        <li>• "Coloca uma música relaxante"</li>
        <li>• "Quero ouvir rock clássico"</li>
      </ul>
    </div>
  </div>
);

// ============================================================
// Formulário de configuração para Impressão Local (Nativa)
// ============================================================
 
const NativeConfigForm = ({ settings, onChange }: any) => {
  const manualPaymentEnabled = settings.manual_payment_enabled ?? false;
  const pricePerPage = settings.print_price_per_page ?? 0.50;
  const maxPages = settings.print_max_pages_per_job ?? 50;
 
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
          <strong>Impressão Local:</strong> Usa a impressora nativa do dispositivo.
        </p>
        <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
          <li>• Funciona em qualquer dispositivo (desktop, tablet, mobile)</li>
          <li>• Cliente escolhe a impressora e confirma</li>
          <li>• Sem custo mensal</li>
        </ul>
      </div>
 
      {/* Toggle Cobrança */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Cobrança Manual (dinheiro/cartão)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {manualPaymentEnabled
                ? 'Atendente cobra no caixa — impressão liberada automaticamente'
                : 'Sistema gera PIX automático para o cliente pagar sozinho'}
            </p>
          </div>
          <div className="relative">
            <input type="checkbox" checked={manualPaymentEnabled} onChange={e => onChange('manual_payment_enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
          </div>
        </label>
 
        {/* ✅ Descrição sem mencionar "atendente libera" */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ✅ Ativado: Cliente paga no caixa (dinheiro/cartão) — a impressão é liberada automaticamente<br/>
          ❌ Desativado: Sistema gera PIX automático para o cliente pagar sozinho
        </p>
 
        {manualPaymentEnabled && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              O sistema libera a impressão automaticamente. O pagamento é cobrado pelo atendente no caixa.
            </p>
          </div>
        )}
 
        {!manualPaymentEnabled && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-800 dark:text-green-200">
              Você receberá os pagamentos no <strong>seu Saldo</strong> aqui no dashboard.
            </p>
          </div>
        )}
      </div>
 
      {/* Preço por Página */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Preço por Página</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">R$</span>
          <input type="number" step="0.10" min="0" max="10" value={pricePerPage} onChange={e => onChange('print_price_per_page', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preço sugerido: R$ 0,30 a R$ 0,80 por página</p>
      </div>
 
      {/* Máximo de Páginas */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Máximo de Páginas por Trabalho</label>
        <input type="number" step="1" min="1" max="200" value={maxPages} onChange={e => onChange('print_max_pages_per_job', parseInt(e.target.value) || 50)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-purple-500" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Limite de páginas para evitar abusos</p>
      </div>
    </div>
  );
};
 
// ============================================================
// Formulário de configuração para Impressão Remota (PrintNode)
// ============================================================
 
const PrintNodeConfigForm = ({ settings, onChange }: any) => {
  const supabase = createClient();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [printersList, setPrintersList] = useState<any[]>([]);
  const [computerInfo, setComputerInfo] = useState<any>(null);
 
  const manualPaymentEnabled = settings.manual_payment_enabled ?? false;
  const colorEnabled = settings.print_color_enabled ?? false;
  const priceBW = settings.print_price_bw ?? 0.30;
  const priceColor = settings.print_price_color ?? 0.80;
  const computerId = settings.printnode_computer_id ?? '';
  const printerIdBW = settings.printnode_printer_id_bw ?? '';
  const printerIdColor = settings.printnode_printer_id_color ?? '';
 
const handleTestConnection = async () => {
  if (!computerId) {
    alert('Por favor, insira o Computer ID primeiro');
    setConnectionStatus('error');
    return;
  }

  setTestingConnection(true);
  setConnectionStatus('idle');
  setPrintersList([]);
  setComputerInfo(null);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('/api/edge/test-printnode-computer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ computerId }),
    });

    if (!response.ok) throw new Error('Erro ao conectar com PrintNode');

    const data = await response.json();

    if (data.success) {
      setConnectionStatus('success');
      setComputerInfo(data.computer);
      setPrintersList(data.printers || []);
    } else {
      setConnectionStatus('error');
      alert(data.error || 'Computer ID não encontrado');
    }
  } catch (error: any) {
    setConnectionStatus('error');
    alert('Erro ao testar conexão: ' + error.message);
  } finally {
    setTestingConnection(false);
  }
};
 
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-2"><strong>Impressão Remota:</strong> Impressão 100% automática via PrintNode.</p>
        <ul className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
          <li>• Documento enviado automaticamente para a impressora</li>
          <li>• Ideal para desktop sem touch</li>
          <li>• Suporta filas separadas para P&B e Colorida</li>
          <li>• Baixe gratuitamente em: https://www.printnode.com/en/download</li>
        </ul>
      </div>
 
      {/* Computer ID */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Computer ID <span className="text-red-500">*</span></label>
        <input type="text" value={computerId} onChange={e => onChange('printnode_computer_id', e.target.value)} placeholder="Ex: abc123def456" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Encontre no PrintNode Client → aba "Account"</p>
      </div>
 
      {/* Botão Detectar */}
      {computerId && (
        <button type="button" onClick={handleTestConnection} disabled={testingConnection} className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${connectionStatus === 'success' ? 'bg-green-600 text-white' : connectionStatus === 'error' ? 'bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} disabled:opacity-50`}>
          {testingConnection ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Testando...</> : connectionStatus === 'success' ? <>✓ Conexão OK!</> : connectionStatus === 'error' ? <>✗ Erro na Conexão</> : '🔍 Detectar Impressoras'}
        </button>
      )}
 
      {computerInfo && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">✅ Computador conectado:</p>
          <p className="text-xs text-green-700 dark:text-green-300"><strong>{computerInfo.name}</strong> · {computerInfo.inet || 'IP não disponível'}</p>
        </div>
      )}
 
      {/* Seleção de Impressoras */}
      {printersList.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Impressora Preto e Branco <span className="text-red-500">*</span></label>
            <select value={printerIdBW} onChange={e => onChange('printnode_printer_id_bw', e.target.value)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500">
              <option value="">Selecione a impressora P&B...</option>
              {printersList.map(p => <option key={p.id} value={p.id.toString()}>{p.name} (ID: {p.id}){p.state === 'online' ? ' ✓' : ''}</option>)}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fila configurada para impressão monocromática</p>
          </div>
 
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={colorEnabled} onChange={e => onChange('print_color_enabled', e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Oferecer impressão colorida</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">Se desativado, apenas P&B estará disponível para o cliente</p>
          </div>
 
          {colorEnabled && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Impressora Colorida</label>
              <select value={printerIdColor} onChange={e => onChange('printnode_printer_id_color', e.target.value)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500">
                <option value="">Selecione a impressora colorida...</option>
                {printersList.map(p => <option key={p.id} value={p.id.toString()}>{p.name} (ID: {p.id}){p.state === 'online' ? ' ✓' : ''}</option>)}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fila configurada para impressão colorida (CMYK)</p>
            </div>
          )}
        </>
      )}
 
      <div className="border-t border-gray-200 dark:border-white/10 my-4"></div>
 
      {/* Toggle Cobrança */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Cobrança Manual (dinheiro/cartão)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {manualPaymentEnabled
                ? 'Atendente cobra no caixa — impressão liberada automaticamente'
                : 'Sistema gera PIX automático para o cliente pagar sozinho'}
            </p>
          </div>
          <div className="relative">
            <input type="checkbox" checked={manualPaymentEnabled} onChange={e => onChange('manual_payment_enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </div>
        </label>
        {/* ✅ Descrição sem mencionar "atendente libera" */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ✅ Ativado: Cliente paga no caixa (dinheiro/cartão) — a impressão é liberada automaticamente<br/>
          ❌ Desativado: Sistema gera PIX automático para o cliente pagar sozinho
        </p>
      </div>
 
      {/* Preço P&B */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Preço por Página — Preto e Branco</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">R$</span>
          <input type="number" step="0.10" min="0" max="10" value={priceBW} onChange={e => onChange('print_price_bw', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preço sugerido: R$ 0,20 a R$ 0,50 por página</p>
      </div>
 
      {/* Preço Colorida */}
      {colorEnabled && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Preço por Página — Colorida</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">R$</span>
            <input type="number" step="0.10" min="0" max="10" value={priceColor} onChange={e => onChange('print_price_color', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preço sugerido: R$ 0,60 a R$ 1,50 por página</p>
        </div>
      )}
 
      {/* Máximo */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Máximo de Páginas</label>
        <input type="number" step="1" min="1" max="200" value={settings.print_max_pages_per_job ?? 50} onChange={e => onChange('print_max_pages_per_job', parseInt(e.target.value) || 50)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-indigo-500" />
      </div>
    </div>
  );
};
 
// ============================================================
// Formulário de configuração para Impressão Recibo (Térmica)
// ============================================================
 
const ThermalConfigForm = ({ settings, onChange }: any) => {
  const [detectingPrinters, setDetectingPrinters] = useState(false);
  const [thermalPrinters, setThermalPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [testingPrint, setTestingPrint] = useState(false);
 
  const manualPaymentEnabled = settings.manual_payment_enabled ?? false;
  const pricePerPage = settings.print_price_per_page ?? 0.50;
  const maxPages = settings.print_max_pages_per_job ?? 50;
  const thermalPrinterId = settings.thermal_printer_id ?? '';
 
  const handleDetectPrinters = async () => {
    setDetectingPrinters(true);
    try {
      const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
      const printers = await thermalPrinterService.detectPrinters();
      setThermalPrinters(printers);
      if (printers.length === 0) alert('Nenhuma impressora térmica detectada.');
    } catch (error: any) {
      alert('Erro ao detectar impressoras: ' + error.message);
    } finally {
      setDetectingPrinters(false);
    }
  };
 
  const handleRequestUSB = async () => {
    try {
      const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
      const printer = await thermalPrinterService.requestUSBPrinter();
      if (printer) { setThermalPrinters(prev => [...prev, printer]); setSelectedPrinter(printer); onChange('thermal_printer_id', printer.id); onChange('thermal_connection_type', 'usb'); }
    } catch (error: any) {
      alert('Erro ao conectar impressora USB: ' + error.message);
    }
  };
 
  const handleSelectPrinter = (printer: any) => { setSelectedPrinter(printer); onChange('thermal_printer_id', printer.id); onChange('thermal_connection_type', printer.type); };
 
  const handleTestPrint = async () => {
    if (!selectedPrinter) { alert('Selecione uma impressora primeiro'); return; }
    setTestingPrint(true);
    try {
      const { thermalPrinterService } = await import('@/lib/thermal-printer-service');
      await thermalPrinterService.printText('──── TESTE ────\n\neAi Assistente\nImpressão Térmica\n\n' + new Date().toLocaleString('pt-BR') + '\n\n────────────────\n', { align: 'center', bold: true, cut: true });
      alert('✅ Teste de impressão enviado com sucesso!');
    } catch (error: any) {
      alert('❌ Erro no teste: ' + error.message);
    } finally {
      setTestingPrint(false);
    }
  };
 
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200 mb-2"><strong>Impressão Térmica:</strong> Para PDV, Totens e TEF.</p>
        <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
          <li>• Conecta via USB ou Bluetooth diretamente</li>
          <li>• Ideal para recibos e cupons fiscais</li>
        </ul>
      </div>
 
      <div className="space-y-2">
        <button type="button" onClick={handleDetectPrinters} disabled={detectingPrinters} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
          {detectingPrinters ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Detectando...</> : <>📡 Detectar Impressoras Bluetooth</>}
        </button>
        <button type="button" onClick={handleRequestUSB} className="w-full px-4 py-2 border-2 border-green-600 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 font-medium flex items-center justify-center gap-2">🔌 Conectar Impressora USB</button>
      </div>
 
      {thermalPrinters.length > 0 && (
        <div className="space-y-2">
          {thermalPrinters.map((printer, index) => (
            <div key={index} onClick={() => handleSelectPrinter(printer)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedPrinter?.id === printer.id || thermalPrinterId === printer.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-white/10 hover:border-green-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{printer.type === 'usb' ? '🔌' : '📡'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{printer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{printer.type === 'usb' ? 'USB' : 'Bluetooth'}</p>
                  </div>
                </div>
                {printer.connected && <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">Conectada</span>}
              </div>
            </div>
          ))}
        </div>
      )}
 
      {selectedPrinter && (
        <button type="button" onClick={handleTestPrint} disabled={testingPrint} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
          {testingPrint ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Imprimindo...</> : <>✓ Imprimir Teste</>}
        </button>
      )}
 
      <div className="border-t border-gray-200 dark:border-white/10 my-4"></div>
 
      {/* Toggle Cobrança */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Cobrança Manual (dinheiro/cartão)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {manualPaymentEnabled
                ? 'Atendente cobra no caixa — impressão liberada automaticamente'
                : 'Sistema gera PIX automático para o cliente pagar sozinho'}
            </p>
          </div>
          <div className="relative">
            <input type="checkbox" checked={manualPaymentEnabled} onChange={e => onChange('manual_payment_enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
          </div>
        </label>
        {/* ✅ Descrição sem mencionar "atendente libera" */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ✅ Ativado: Cliente paga no caixa (dinheiro/cartão) — a impressão é liberada automaticamente<br/>
          ❌ Desativado: Sistema gera PIX automático para o cliente pagar sozinho
        </p>
      </div>
 
      {/* Preço por Página */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Preço por Página</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">R$</span>
          <input type="number" step="0.10" min="0" max="10" value={pricePerPage} onChange={e => onChange('print_price_per_page', parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-green-500" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preço sugerido: R$ 0,30 a R$ 0,80 por página</p>
      </div>
 
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Máximo de Páginas</label>
        <input type="number" step="1" min="1" max="200" value={maxPages} onChange={e => onChange('print_max_pages_per_job', parseInt(e.target.value) || 50)} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-white/10 dark:text-white focus:ring-2 focus:ring-green-500" />
      </div>
    </div>
  );
};

const VendasForm = ({ functionKey, companyId }: { functionKey: string; companyId: string }) => {
  const router = useRouter();

  const FUNCOES_INFO: Record<string, {
    titulo: string;
    descricao: string;
    comoUsar: string[];
    comandos: string[];
    destino: string;
  }> = {
    modo_venda: {
      titulo: 'Modo Venda',
      descricao: 'Abre a loja virtual com catálogo de produtos e carrinho de compras no kiosk.',
      comoUsar: [
        'O cliente fala "quero comprar" ou clica no botão no header',
        'A loja abre mostrando os produtos cadastrados',
        'O assistente de voz continua disponível para ajudar',
      ],
      comandos: ['Quero comprar', 'Abrir modo venda', 'Escolher produtos', 'Comprar agora'],
      destino: '/dashboard/vendas',
    },
    ver_produtos: {
      titulo: 'Ver Produtos',
      descricao: 'Cliente pede um produto específico e o assistente abre a loja destacando o item.',
      comoUsar: [
        'Cliente fala o nome de um produto',
        'Assistente abre a loja e destaca o produto encontrado',
        'Cliente adiciona ao carrinho com um clique',
      ],
      comandos: ['Tem coca-cola?', 'Ver produtos', 'O que vocês vendem?', 'Tem algum suco?'],
      destino: '/dashboard/vendas',
    },
    fazer_pedido: {
      titulo: 'Fazer Pedido',
      descricao: 'Cliente monta o pedido por voz, adicionando itens ao carrinho e finalizando com pagamento.',
      comoUsar: [
        'Cliente diz o que quer comprar e a quantidade',
        'Assistente abre a loja já com o item destacado',
        'Cliente finaliza o pedido com pagamento via PIX, NFC ou TEF',
      ],
      comandos: ['Quero 2 sucos', 'Pedir uma pizza', 'Adicionar ao carrinho', 'Fazer pedido'],
      destino: '/dashboard/vendas',
    },
    consultar_estoque: {
      titulo: 'Consultar Estoque',
      descricao: 'Consulta o estoque atual de um produto e avisa se estiver abaixo do mínimo.',
      comoUsar: [
        'Operador pergunta sobre o estoque de um produto',
        'Assistente responde com a quantidade atual',
        'Alerta automático se estiver abaixo do mínimo configurado',
      ],
      comandos: ['Quantos pães tem?', 'Estoque de refrigerante', 'Verificar estoque do café'],
      destino: '/dashboard/vendas/produtos',
    },
    cadastrar_produto: {
      titulo: 'Cadastrar Produto',
      descricao: 'Cadastre novos produtos na loja pelo painel de administração.',
      comoUsar: [
        'Acesse o painel de produtos para cadastrar itens',
        'Defina nome, preço, estoque, categoria e imagem',
        'Produtos da Linha de Produção podem ser importados automaticamente',
      ],
      comandos: ['Cadastrar produto', 'Novo produto', 'Adicionar item na loja'],
      destino: '/dashboard/vendas/produtos',
    },
  };

  const info = FUNCOES_INFO[functionKey];
  if (!info) return null;

  return (
    <div className="space-y-4">
      {/* Header visual */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">
              {info.titulo}
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              {info.descricao}
            </p>
          </div>
        </div>
      </div>

      {/* Como usar */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-1.5">
          <Info size={13} />
          Como funciona
        </h5>
        <ul className="space-y-1">
          {info.comoUsar.map((passo, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
              <span className="text-blue-500 font-bold mt-0.5">·</span>
              {passo}
            </li>
          ))}
        </ul>
      </div>

      {/* Comandos de voz */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <h5 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
          <Mic size={13} />
          Comandos de voz
        </h5>
        <div className="flex flex-wrap gap-1.5">
          {info.comandos.map((cmd, i) => (
            <code key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
              "{cmd}"
            </code>
          ))}
        </div>
      </div>

      {/* Destaque integração Linha de Produção (só para produtos) */}
      {(functionKey === 'modo_venda' || functionKey === 'ver_produtos' || functionKey === 'fazer_pedido' || functionKey === 'cadastrar_produto') && (
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-800 dark:text-purple-200">
            <span className="font-semibold">Integrado com Linha de Produção:</span>{' '}
            Produtos criados nas fichas técnicas podem ser importados diretamente para a loja.
          </p>
        </div>
      )}

      {/* Botão ir para a seção */}
      <button
        type="button"
        onClick={() => router.push(`${info.destino}?company=${companyId}`)}
        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
      >
        <ExternalLink size={16} />
        {functionKey === 'consultar_estoque' || functionKey === 'cadastrar_produto'
          ? 'Gerenciar Produtos'
          : 'Gerenciar Loja Virtual'
        }
      </button>
    </div>
  );
};

// ===== MAPEAMENTO: function_key → componente =====
const FORM_COMPONENTS: { [key: string]: React.FC<any> } = {
  'qrcode_whatsapp': WhatsappForm,
  'qrcode_instagram': InstagramForm,
  'qrcode_website': WebsiteForm,
  'qrcode_facebook': FacebookForm,
  'qrcode_email': EmailForm,
  'qrcode_linkedin': LinkedinForm,
  'qrcode_tiktok': TiktokForm,
  'qrcode_twitter': TwitterForm,
  'qrcode_telefone': TelefoneForm,
  'pix_generate': PixForm,
  'chatgpt': ChatGptForm,
  'orcamento': OrcamentoForm,  // ← ADICIONAR
  'faq': FaqForm,
  'endereco': EnderecoForm, 
  'nossa_marca': NossaMarcaForm,
  'video_instrucoes': VideoInstrucoesForm,
  'enviar_email': GoogleEmailForm,
  'ver_agenda': GoogleCalendarScheduleForm,
  'agendar_compromisso': GoogleCalendarScheduleForm,
  'confirmar_presenca': GoogleCalendarScheduleForm,
  'reagendar_compromisso': GoogleCalendarScheduleForm,
  'cancelar_agendamento': GoogleCalendarScheduleForm,
  'horarios_disponiveis': GoogleCalendarScheduleForm,
  'sequencia_videos': SequenciaVideosForm,
  'link_pagamento': InfinitePayConfigForm,
  'nfc_debito':     InfinitePayConfigForm,
  'nfc_credito':    InfinitePayConfigForm,
  'tef_debito': MpPointConfigForm,
  'tef_credito': MpPointConfigForm,
  'wifi_qrcode':  WifiQRCodeForm,
  'cardapio':     CardapioForm,
  'nosso_qrcode': NossoQRCodeForm,
  'ler_qrcode':          LerQRCodeConfigForm,
  'ler_codigo_barras':   LerCodigoBarrasConfigForm,
  'validar_cupom':       ValidarCupomConfigForm,
  'imagem_em_texto':     ImagemEmTextoConfigForm,
  'tabela_em_texto':     TabelaEmTextoConfigForm,
  'contrato_em_texto':   ContratoEmTextoConfigForm,
  'identificar_fraude': IdentificarFraudeForm,
  'fichas_producao': FichasProducaoForm,
  'fichas_producao_conversacional': FichasProducaoForm,
  'meu_cupom': MeuCupomForm,
  'cadastro': RegistrationConfigForm,
  'clima_tempo': ClimaTempoForm,
  'tocar_video': TocarVideoForm,
  'modo_venda':        VendasForm,
  'ver_produtos':      VendasForm,
  'fazer_pedido':      VendasForm,
  'consultar_estoque': VendasForm,
  'cadastrar_produto': VendasForm,
  'tocar_musica': TocarMusicaForm,
  'impressao_local': NativeConfigForm,
  'impressao_remota': PrintNodeConfigForm,
  'impressao_recibo': ThermalConfigForm,
  'playlist': PlaylistConfigForm,
  'porta_retrato': PortaRetratoConfigForm,
  'painel_ofertas': PainelOfertasConfigForm,
  'aparelhos_smart': AparelhosSmartConfigForm,
  'canal_youtube': CanalYoutubeForm,
  'segunda_via_boleto': SegundaViaBoletoForm,
  'tracar_rota': TracarRotaForm,
  'buscar_endereco': BuscarEnderecoForm,
  'rastreio_correios': RastreioCorreiosForm,
  'criar_nota': CriarNotaForm,
  'lembrete_remedios': LembreteRemediosForm,
};

// ===== INTERFACE =====
interface FunctionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  functionData: any;
  companyId: string;
  onUpdate: () => void;
}

// ============================================================
// GOOGLE CALENDAR SCHEDULE FORM - Para todas as 6 funções
// ============================================================

interface GoogleCalendarScheduleFormProps {
  functionKey: string;
  companyId: string;
}

function GoogleCalendarScheduleForm({ 
  functionKey, 
  companyId 
}: GoogleCalendarScheduleFormProps) {
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGoogleConnection();
  }, [companyId]);

  async function checkGoogleConnection() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('google_accounts')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (!error && data) {
        const hasCalendarScope = data.scopes?.includes('https://www.googleapis.com/auth/calendar');
        if (hasCalendarScope) {
          setGoogleAccount(data);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar Google:', err);
    } finally {
      setLoading(false);
    }
  }

  // Configurações específicas por função
  const FUNCTION_INFO: Record<string, {
    howItWorks: string[];
    voiceCommands: string[];
    smartFeature?: string;
  }> = {
    ver_agenda: {
      howItWorks: [
        'Visualize eventos do Google Calendar por voz',
        'Escolha o período: mês, semana ou dia',
        'Sincronização automática em tempo real',
      ],
      voiceCommands: [
        'Ver minha agenda',
        'Mostrar calendário',
        'Meus compromissos',
      ],
    },
    agendar_compromisso: {
      howItWorks: [
        'Crie eventos apenas com comandos de voz',
        'Informe data, hora e descrição',
        'Evento criado automaticamente no calendário',
      ],
      voiceCommands: [
        'Agendar reunião',
        'Marcar compromisso',
        'Criar evento',
      ],
    },
    confirmar_presenca: {
      howItWorks: [
        'Cliente informa email ou telefone',
        'Sistema busca o agendamento automaticamente',
        'Confirmação com um clique',
      ],
      voiceCommands: [
        'Confirmar presença',
        'Confirmar agendamento',
        'Vou comparecer',
      ],
      smartFeature: 'Busca automática do agendamento. Todas as alterações sincronizam em tempo real com o Google Calendar.',
    },
    reagendar_compromisso: {
      howItWorks: [
        'Cliente informa email ou telefone',
        'Sistema mostra agendamento atual',
        'Escolha nova data e horário no calendário interativo',
      ],
      voiceCommands: [
        'Reagendar',
        'Remarcar',
        'Mudar data',
      ],
      smartFeature: 'Busca automática do agendamento. Todas as alterações sincronizam em tempo real com o Google Calendar.',
    },
    cancelar_agendamento: {
      howItWorks: [
        'Cliente informa email ou telefone',
        'Sistema mostra agendamento a cancelar',
        'Confirmação de cancelamento com motivo opcional',
      ],
      voiceCommands: [
        'Cancelar agendamento',
        'Desmarcar',
        'Não poderei comparecer',
      ],
      smartFeature: 'Busca automática do agendamento. Todas as alterações sincronizam em tempo real com o Google Calendar.',
    },
    horarios_disponiveis: {
      howItWorks: [
        'Cliente pergunta sobre horário específico',
        'IA verifica disponibilidade no calendário',
        'Responde por voz se está livre ou ocupado',
      ],
      voiceCommands: [
        'Tem horário disponível?',
        'Está livre amanhã às 14h?',
        'Horários vagos',
      ],
      smartFeature: 'IA entende linguagem natural como "tem horário amanhã de manhã?" e verifica automaticamente. Após consultar, oferece opções: marcar direto ou visualizar agenda.',
    },
  };

  const info = FUNCTION_INFO[functionKey] || FUNCTION_INFO.ver_agenda;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da Conexão */}
      <div className={`p-3 rounded-lg border ${
        googleAccount 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex items-start gap-3">
          {googleAccount ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Conta Google Conectada
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  {googleAccount.google_email}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Google Calendar não conectado
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Conecte sua conta Google para usar esta função.
                </p>
                
<a
                  href="/dashboard/google-connect"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition mt-2"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Conectar Conta
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Como Funciona */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Como funciona
        </h4>
        <ul className="space-y-1">
          {info.howItWorks.map((step, index) => (
            <li key={index} className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-200">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">·</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* Comandos de Voz */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5" />
          Comandos de voz
        </h4>
        <div className="space-y-1.5">
          {info.voiceCommands.map((cmd, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
              <code className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200">
                "{cmd}"
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Funcionalidade Inteligente (apenas para funções específicas) */}
      {info.smartFeature && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            IA Integrada
          </h4>
          <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
            {info.smartFeature}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FunctionConfigModal({
  isOpen,
  onClose,
  functionData,
  companyId,
  onUpdate,
}: FunctionConfigModalProps) {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
.select('whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, tiktok, twitter, telefone_fixo, receiving_pix_key, receiving_pix_key_type, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, wifi_network_password, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label, manual_payment_enabled, print_price_per_page, print_max_pages_per_job, print_color_enabled, print_price_bw, print_price_color, printnode_computer_id, printnode_printer_id_bw, printnode_printer_id_color, thermal_printer_id, thermal_connection_type, youtube_channel_url, youtube_channel_name, youtube_channel_description')        .eq('id', companyId)
        .single();

      if (data) {
        setSettings(data);
      } else if (error) {
        console.error('Erro ao carregar configurações:', error);
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, [isOpen, companyId, supabase]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from('companies')
      .update(settings)
      .eq('id', companyId);

    if (!error) {
      onUpdate();
      onClose();
    } else {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar as configurações. Tente novamente.');
    }

    setIsSaving(false);
  };

  if (!isOpen) return null;

  const FormComponent = FORM_COMPONENTS[functionData?.function_key];
  const hasForm = !!FormComponent;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} className="text-gray-600 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: functionData?.color || '#6B7280' }}
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {functionData?.function_name}
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {functionData?.description}
          </p>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="min-h-[150px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {hasForm ? (
              <FormComponent 
                settings={settings} 
                onChange={handleSettingChange}
                companyId={companyId}
                functionKey={functionData?.function_key}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Esta função não possui configurações editáveis.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300 font-medium"
            disabled={isSaving}
          >
            Cancelar
          </button>
          {hasForm && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Salvando...</span>
                </>
              ) : (
                'Salvar Configurações'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
