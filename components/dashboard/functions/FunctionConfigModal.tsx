// components/dashboard/functions/FunctionConfigModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Calendar, Settings, AlertCircle, Check, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { InfinitePayConfigForm } from './InfinitePayConfigModal';
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
          ✅ <strong>Funcionalidade especial:</strong> Ao escanear este QR Code, o celular do cliente abrirá automaticamente o aplicativo de ligações com o número já preenchido, pronto para ligar!
        </p>
      </div>
    )}
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
        💡 Funciona com Google Drive (PDF público), iFood, Linktree, site próprio e qualquer link público.
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

const NossoQRCodeForm = ({ settings, onChange }: any) => (
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
      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="text-xs text-orange-800 dark:text-orange-200 mb-2">Prévia do QR Code:</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(settings.qrcode_content)}&margin=5`}
          alt="Preview QR"
          className="w-20 h-20 rounded"
        />
      </div>
    )}
    <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exemplos de uso:</p>
      <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
        <li>Chave Pix estática</li>
        <li>Link de avaliação Google Maps</li>
        <li>Formulário, promoção, entre outros</li>
      </ul>
    </div>
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
  'agendar_compromisso': GoogleCalendarForm,
  'ver_agenda': GoogleCalendarForm, 
  'sequencia_videos': SequenciaVideosForm,
  'link_pagamento': InfinitePayConfigForm,
  'nfc_debito':     InfinitePayConfigForm,
  'nfc_credito':    InfinitePayConfigForm,
  'wifi_qrcode':  WifiQRCodeForm,
  'cardapio':     CardapioForm,
  'nosso_qrcode': NossoQRCodeForm,
  'ler_qrcode':          LerQRCodeConfigForm,
  'ler_codigo_barras':   LerCodigoBarrasConfigForm,
  'validar_cupom':       ValidarCupomConfigForm,
  'imagem_em_texto':     ImagemEmTextoConfigForm,
  'tabela_em_texto':     TabelaEmTextoConfigForm,
  'contrato_em_texto':   ContratoEmTextoConfigForm,
  'fichas_producao': FichasProducaoForm,
};

// ===== INTERFACE =====
interface FunctionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  functionData: any;
  companyId: string;
  onUpdate: () => void;
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
        .select('whatsapp_number, instagram_username, website, facebook, email_contato, linkedin, tiktok, twitter, telefone_fixo, receiving_pix_key, receiving_pix_key_type, system_prompt, orcamento_prompt, brand_description, business_hours, business_address, video_instrucoes_url, sequencia_videos_urls, infinitepay_handle, wifi_network_name, wifi_network_password, cardapio_url, cardapio_description, validar_cupom, qrcode_content, qrcode_label')
        .eq('id', companyId)
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
