'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const DARK = {
  bg: '#0f172a',
  bgSecondary: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  accent: '#000080',
  senhaColor: '#ffffff',
};

const LIGHT = {
  bg: '#f8fafc',
  bgSecondary: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  accent: '#000080',
  senhaColor: '#000080',
};

interface PainelFilaDisplayProps {
  companyId: string;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface FilaSenha {
  id: string;
  senha_completa: string;
  status: string;
  chamada_em?: string;
}

export default function PainelFilaDisplay({
  companyId,
  theme = 'dark',
  playText,
}: PainelFilaDisplayProps) {
  const colors = theme === 'dark' ? DARK : LIGHT;

  const [senhaAtual, setSenhaAtual] = useState<FilaSenha | null>(null);
  const [proximasSenhas, setProximasSenhas] = useState<FilaSenha[]>([]);
  const [isLandscape, setIsLandscape] = useState(true);
  const [animar, setAnimar] = useState(false);

  const supabase = createClient();

  // Detectar orientação
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Realtime + dados
  useEffect(() => {
    carregarDados();

    const channel = supabase
      .channel('painel-fila')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_senhas',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          if (
            payload.eventType === 'UPDATE' &&
            payload.new.status === 'chamando'
          ) {
            const novaSenha = payload.new as FilaSenha;

            setSenhaAtual(novaSenha);

            // 🔥 animação
            setAnimar(true);
            setTimeout(() => setAnimar(false), 2000);

            // 🔊 TTS
            const prefixo = novaSenha.senha_completa[0];
            const numeros = novaSenha.senha_completa.slice(1).split('');
            const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;

            if (playText) {
              await playText(texto);
            } else {
              const utterance = new SpeechSynthesisUtterance(texto);
              utterance.lang = 'pt-BR';
              utterance.rate = 0.8;
              window.speechSynthesis.speak(utterance);
            }
          }

          await carregarDados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function carregarDados() {
    try {
      const { data: atual } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('chamada_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSenhaAtual(atual || null);

      const { data: proximas } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .order('gerada_em', { ascending: true })
        .limit(6);

      setProximasSenhas(proximas || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  // 🔥 estilos reutilizáveis
  const cardStyle = {
    background: colors.bgSecondary,
    borderRadius: '24px',
    border: `3px solid ${colors.accent}`,
    boxShadow:
      theme === 'dark'
        ? '0 10px 40px rgba(0,0,0,0.5)'
        : '0 10px 30px rgba(0,0,0,0.1)',
  };

  const senhaStyle = {
    fontSize: 'clamp(60px, 14vw, 180px)',
    fontWeight: 'bold',
    color: colors.senhaColor,
    lineHeight: 1,
    transition: 'all 0.3s ease',
    transform: animar ? 'scale(1.1)' : 'scale(1)',
  };

  // =========================
  // LANDSCAPE (TV / Desktop)
  // =========================
  if (isLandscape) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          gap: 'clamp(10px, 2vw, 20px)',
          padding: '10px',
          background: colors.bg,
          overflow: 'hidden',
        }}
      >
        {/* SENHA ATUAL */}
        <div
          style={{
            ...cardStyle,
            flex: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(16px,2vw,28px)',
              color: colors.textSecondary,
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}
          >
            SENHA ATUAL
          </div>

          <div style={senhaStyle}>
            {senhaAtual ? senhaAtual.senha_completa : '---'}
          </div>

          {senhaAtual && (
            <div
              style={{
                fontSize: 'clamp(14px,1.5vw,22px)',
                color: colors.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              {senhaAtual.status === 'chamando'
                ? 'Sendo chamada'
                : 'Em atendimento'}
            </div>
          )}
        </div>

        {/* PRÓXIMAS SENHAS */}
        <div
          style={{
            ...cardStyle,
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontSize: 'clamp(14px,1.5vw,20px)',
              marginBottom: '10px',
              color: colors.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            PRÓXIMAS SENHAS
          </div>

          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '10px',
            }}
          >
            {proximasSenhas.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}
              >
                Nenhuma senha aguardando
              </div>
            ) : (
              proximasSenhas.map((senha) => (
                <div
                  key={senha.id}
                  style={{
                    fontSize: 'clamp(24px,3vw,48px)',
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '12px',
                    border: `2px solid ${colors.accent}`,
                  }}
                >
                  {senha.senha_completa}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // PORTRAIT (Mobile)
  // =========================
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px',
        background: colors.bg,
        overflow: 'hidden',
      }}
    >
      {/* SENHA ATUAL */}
      <div
        style={{
          ...cardStyle,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          alignItems: 'center',
        }}
      >
        <div style={{ color: colors.textSecondary }}>
          SENHA ATUAL
        </div>

        <div
          style={{
            ...senhaStyle,
            fontSize: 'clamp(50px, 20vw, 120px)',
          }}
        >
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>
      </div>

      {/* PRÓXIMAS */}
      <div
        style={{
          ...cardStyle,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          padding: '10px',
        }}
      >
        {proximasSenhas.map((senha) => (
          <div
            key={senha.id}
            style={{
              fontSize: 'clamp(20px,5vw,36px)',
              textAlign: 'center',
              padding: '10px',
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
            }}
          >
            {senha.senha_completa}
          </div>
        ))}
      </div>
    </div>
  );
}
