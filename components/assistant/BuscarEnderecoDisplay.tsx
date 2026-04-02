'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

const DARK = {
  bg: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(51,65,85,0.6)',
  text: '#ffffff',
  textMuted: '#94a3b8',
  buttonBg: '#800080',
  buttonHover: '#9333ea',
};

const LIGHT = {
  bg: '#ffffff',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  buttonBg: '#800080',
  buttonHover: '#9333ea',
};

type Stage = 'input' | 'processing' | 'result' | 'error';

interface EnderecoData {
  formatted: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

interface BuscarEnderecoDisplayProps {
  data: {
    companyId: string;
    termoInicial?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

// ✅ USAR playText DO SISTEMA
declare global {
  interface Window {
    playText?: (text: string) => void;
  }
}

export default function BuscarEnderecoDisplay({
  data,
  onClose,
  theme = 'dark',
}: BuscarEnderecoDisplayProps) {
  const palette = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [termo, setTermo] = useState(data.termoInicial || '');
  const [endereco, setEndereco] = useState<EnderecoData | null>(null);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ✅ USAR playText DO SISTEMA
  const playText = (text: string) => {
    if (window.playText) {
      window.playText(text);
    }
  };

  useEffect(() => {
    window.speechSynthesis?.cancel();
    const texto = data.termoInicial
      ? `Buscando endereço para ${data.termoInicial}. Aguarde.`
      : 'Qual endereço você quer buscar? Fale o CEP ou nome do local.';
    
    playText(texto);

    if (data.termoInicial) {
      handleBuscar();
    }
  }, []);

  const handleVoiceCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase();

      if (cmd.includes('fechar') || cmd.includes('sair')) {
        handleClose();
      } else if (cmd.includes('repetir') || cmd.includes('novamente')) {
        handleReset();
      } else if (cmd.includes('abrir') && cmd.includes('maps')) {
        handleOpenMaps();
      } else if (cmd.includes('copiar')) {
        handleCopy();
      } else if (cmd.includes('traçar') || cmd.includes('rota')) {
        handleTracarRota();
      } else if (stage === 'input') {
        setTermo(command);
      }
    },
    [stage, endereco]
  );

  useModalVoiceCommand(handleVoiceCommand);

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  const handleReset = () => {
    setStage('input');
    setTermo('');
    setEndereco(null);
    setError('');
    setQrCodeUrl('');
  };

const handleBuscar = async () => {
  if (!termo.trim()) {
    setError('Por favor, informe um CEP ou endereço.');
    return;
  }

  setStage('processing');
  setError('');

  try {
    // ✅ Agora enviamos APENAS o termo para a Edge Function. 
    // A chave da API e a URL ficam protegidas no backend.
    const { data: geocodeResponse, error: edgeError } = await supabase.functions.invoke(
      'google-maps-proxy',
      {
        body: { termo }, // <-- Mudança principal aqui
      }
    );

    console.log('Geocoding Response:', geocodeResponse); // ✅ DEBUG

    if (edgeError) {
      throw new Error(edgeError.message || 'Erro ao comunicar com o servidor');
    }

    // ✅ VALIDAÇÃO CORRIGIDA (Melhorada para exibir o erro da própria API do Google, se houver)
    if (!geocodeResponse || geocodeResponse.status !== 'OK') {
      throw new Error(geocodeResponse?.error_message || 'Endereço não encontrado');
    }

    if (!geocodeResponse.results || geocodeResponse.results.length === 0) {
      throw new Error('Nenhum resultado encontrado para este endereço');
    }

    const result = geocodeResponse.results[0];
    const { lat, lng } = result.geometry.location;

    const endData: EnderecoData = {
      formatted: result.formatted_address,
      latitude: lat,
      longitude: lng,
      placeId: result.place_id,
    };

    setEndereco(endData);

    // QR Code
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const qrUrl = `/api/qrcode?size=280&data=${encodeURIComponent(mapsUrl)}&color=%23800080${
      data.companyId ? `&company_id=${data.companyId}` : ''
    }`;
    setQrCodeUrl(qrUrl);

    setStage('result');

    // Cobrar crédito
    await fetch('/api/companies/deduct-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: data.companyId,
        credits: 1,
        functionKey: 'buscar_endereco',
      }),
    });

    playText(`Endereço encontrado: ${endData.formatted}`);
  } catch (err: any) {
    console.error('Erro ao buscar endereço:', err); // ✅ DEBUG
    setError(err.message || 'Erro ao buscar endereço.');
    setStage('error');
  }
};

  const handleOpenMaps = () => {
    if (!endereco) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${endereco.latitude},${endereco.longitude}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!endereco) return;
    try {
      await navigator.clipboard.writeText(endereco.formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleTracarRota = () => {
    if (!endereco) return;
    window.speechSynthesis?.cancel();
    
    const event = new CustomEvent('openModal', {
      detail: {
        type: 'TracarRotaDisplay',
        data: { companyId: data.companyId, destinoInicial: endereco.formatted },
      },
    });
    window.dispatchEvent(event);
    onClose();
  };

  const getMapEmbedUrl = () => {
    if (!endereco) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${endereco.latitude},${endereco.longitude}`;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '56rem',
          backgroundColor: palette.bg,
          borderRadius: '1rem',
          border: `1px solid ${palette.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🟣</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: palette.text }}>
                Buscar Endereço
              </h2>
              <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>
                {stage === 'input' && 'Informe o CEP ou nome do local'}
                {stage === 'processing' && 'Buscando...'}
                {stage === 'result' && 'Endereço encontrado'}
                {stage === 'error' && 'Erro na busca'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: palette.textMuted,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* INPUT */}
          {stage === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: palette.text }}>
                  CEP ou Endereço
                </label>
                <input
                  type="text"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Ex: 01310-100 ou Av. Paulista, São Paulo"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.cardBg,
                    color: palette.text,
                  }}
                />
              </div>

              <button
                onClick={handleBuscar}
                disabled={!termo.trim()}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  fontWeight: '600',
                  border: 'none',
                  cursor: termo.trim() ? 'pointer' : 'not-allowed',
                  opacity: termo.trim() ? 1 : 0.5,
                }}
              >
                Buscar
              </button>
            </div>
          )}

          {/* PROCESSING */}
          {stage === 'processing' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  margin: '0 auto',
                  border: '4px solid rgba(128,0,128,0.2)',
                  borderTopColor: '#800080',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ marginTop: '1rem', color: palette.textMuted }}>Buscando endereço...</p>
            </div>
          )}

          {/* RESULT */}
          {stage === 'result' && endereco && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Mapa */}
              <div
                style={{
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  border: `1px solid ${palette.border}`,
                }}
              >
                <iframe
                  src={getMapEmbedUrl()}
                  width="100%"
                  height="280"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Mapa do endereço"
                />
              </div>

              {/* Endereço + Botões */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      backgroundColor: palette.cardBg,
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>Endereço</p>
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: palette.text }}>
                      {endereco.formatted}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={handleCopy}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        backgroundColor: copied ? '#10b981' : '#3b82f6',
                        color: '#fff',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>

                    <button
                      onClick={handleOpenMaps}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Abrir no Maps
                    </button>
                  </div>

                  <button
                    onClick={handleTracarRota}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      backgroundColor: palette.buttonBg,
                      color: '#fff',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Traçar Rota até Aqui
                  </button>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: '#fff' }}>
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: '112px', height: '112px' }} />
                    ) : (
                      <div style={{ width: '112px', height: '112px' }} />
                    )}
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: palette.textMuted }}>
                    Escaneie para abrir
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
