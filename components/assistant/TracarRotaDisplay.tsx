'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { useModalVoiceCommand } from '@/components/VoiceAssistant/hooks/useModalVoiceCommand';

// Paletas inline
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

interface RouteData {
  distance: string;
  duration: string;
  polyline: string;
  startAddress: string;
  endAddress: string;
}

interface TracarRotaDisplayProps {
  data: {
    companyId: string;
    destinoInicial?: string;
  };
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function TracarRotaDisplay({
  data,
  onClose,
  theme = 'dark',
}: TracarRotaDisplayProps) {
  const palette = theme === 'dark' ? DARK : LIGHT;
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>('input');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState(data.destinoInicial || '');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Detectar localização atual
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setOrigem(`${latitude},${longitude}`);
        },
        () => {
          setOrigem(''); // Se negar permissão, cliente digita
        }
      );
    }
  }, []);

  // Fala inicial
  useEffect(() => {
    window.speechSynthesis?.cancel();
    const texto = data.destinoInicial
      ? `Calculando rota para ${data.destinoInicial}. Aguarde.`
      : 'Para onde você quer ir? Fale o destino ou digite abaixo.';
    
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    window.speechSynthesis?.speak(utterance);

    // Se já tem destino, calcula automaticamente
    if (data.destinoInicial && origem) {
      handleCalcularRota();
    }
  }, []);

  // Comandos de voz
  const handleVoiceCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase();

      if (cmd.includes('fechar') || cmd.includes('sair')) {
        handleClose();
      } else if (cmd.includes('repetir') || cmd.includes('novamente')) {
        handleReset();
      } else if (cmd.includes('abrir') && cmd.includes('maps')) {
        handleOpenMaps();
      } else if (stage === 'input' && destino.trim()) {
        // Cliente falou algo e já tem destino → calcula
        handleCalcularRota();
      } else if (stage === 'input') {
        // Considera o comando como destino
        setDestino(command);
      }
    },
    [stage, destino, origem]
  );

  useModalVoiceCommand(handleVoiceCommand);

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  const handleReset = () => {
    setStage('input');
    setDestino('');
    setRouteData(null);
    setError('');
    setQrCodeUrl('');
  };

  const handleCalcularRota = async () => {
    if (!destino.trim()) {
      setError('Por favor, informe o destino.');
      return;
    }

    if (!origem) {
      setError('Não foi possível obter sua localização. Digite o endereço de origem.');
      return;
    }

    setStage('processing');
    setError('');

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origem
      )}&destination=${encodeURIComponent(destino)}&key=${apiKey}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== 'OK' || !json.routes[0]) {
        throw new Error('Rota não encontrada.');
      }

      const route = json.routes[0];
      const leg = route.legs[0];

      const routeInfo: RouteData = {
        distance: leg.distance.text,
        duration: leg.duration.text,
        polyline: route.overview_polyline.points,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
      };

      setRouteData(routeInfo);

      // Gerar QR Code para abrir no Maps
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origem
      )}&destination=${encodeURIComponent(destino)}`;
      
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
          functionKey: 'tracar_rota',
        }),
      });

      // Fala resultado
      const fala = `Rota calculada. Distância: ${routeInfo.distance}. Tempo estimado: ${routeInfo.duration}.`;
      const utterance = new SpeechSynthesisUtterance(fala);
      utterance.lang = 'pt-BR';
      window.speechSynthesis?.speak(utterance);
    } catch (err: any) {
      setError(err.message || 'Erro ao calcular rota.');
      setStage('error');
    }
  };

  const handleOpenMaps = () => {
    if (!routeData) return;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origem
    )}&destination=${encodeURIComponent(destino)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const getMapEmbedUrl = () => {
    if (!routeData) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(
      origem
    )}&destination=${encodeURIComponent(destino)}`;
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
                Traçar Rota
              </h2>
              <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>
                {stage === 'input' && 'Informe o destino'}
                {stage === 'processing' && 'Calculando rota...'}
                {stage === 'result' && 'Rota encontrada'}
                {stage === 'error' && 'Erro ao calcular'}
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
            {/* SVG X inline */}
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
                  Origem (sua localização)
                </label>
                <input
                  type="text"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  placeholder="Detectando... ou digite"
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: palette.text }}>
                  Destino
                </label>
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000"
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
                onClick={handleCalcularRota}
                disabled={!destino.trim() || !origem}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  backgroundColor: palette.buttonBg,
                  color: '#fff',
                  fontWeight: '600',
                  border: 'none',
                  cursor: destino.trim() && origem ? 'pointer' : 'not-allowed',
                  opacity: destino.trim() && origem ? 1 : 0.5,
                }}
              >
                Calcular Rota
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
              <p style={{ marginTop: '1rem', color: palette.textMuted }}>Calculando rota...</p>
            </div>
          )}

          {/* RESULT */}
          {stage === 'result' && routeData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Mapa com rota */}
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
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Mapa da rota"
                />
              </div>

              {/* Info + QR Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      backgroundColor: palette.cardBg,
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>Distância</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: palette.text }}>
                      {routeData.distance}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      backgroundColor: palette.cardBg,
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: palette.textMuted }}>
                      Tempo estimado
                    </p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: palette.text }}>
                      {routeData.duration}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenMaps}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.75rem',
                      backgroundColor: '#10b981',
                      color: '#fff',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Abrir no Google Maps
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
