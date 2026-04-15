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

  // =========================
  // LANDSCAPE
  // =========================
  if (isLandscape) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: '20px',
          gap: '20px',
          background: colors.bg,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* SENHA ATUAL */}
        <div
          style={{
            flex: 3,
            background: colors.bgSecondary,
            borderRadius: '24px',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `4px solid ${colors.accent}`,
            boxShadow:
              theme === 'dark'
                ? '0 20px 60px rgba(0,0,0,0.5)'
                : '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              color: colors.textSecondary,
              fontSize: 'clamp(18px,2vw,28px)',
              marginBottom: '20px',
              letterSpacing: '4px',
              fontWeight: '600',
            }}
          >
            SENHA ATUAL
          </div>

          <div
            style={{
              fontSize: 'clamp(80px,12vw,160px)',
              fontWeight: 'bold',
              color: colors.senhaColor,
              marginBottom: '20px',
              lineHeight: 1,
            }}
          >
            {senhaAtual ? senhaAtual.senha_completa : '---'}
          </div>

          {senhaAtual && (
            <div
              style={{
                color: colors.textSecondary,
                fontSize: 'clamp(16px,1.5vw,24px)',
                letterSpacing: '2px',
              }}
            >
              {senhaAtual.status === 'chamando'
                ? 'Sendo Chamada'
                : 'Em Atendimento'}
            </div>
          )}
        </div>

        {/* PRÓXIMAS SENHAS */}
        <div
          style={{
            flex: 2,
            background: colors.bgSecondary,
            borderRadius: '24px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow:
              theme === 'dark'
                ? '0 20px 60px rgba(0,0,0,0.5)'
                : '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              color: colors.textSecondary,
              fontSize: 'clamp(16px,1.5vw,20px)',
              marginBottom: '30px',
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            PRÓXIMAS SENHAS
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            {proximasSenhas.length === 0 ? (
              <div style={{ color: colors.textSecondary }}>
                Nenhuma senha aguardando
              </div>
            ) : (
              proximasSenhas.map((senha) => (
                <div
                  key={senha.id}
                  style={{
                    fontSize: 'clamp(28px,3vw,48px)',
                    fontWeight: 'bold',
                    color: colors.text,
                    padding: '16px 32px',
                    background: colors.bg,
                    borderRadius: '12px',
                    border: `2px solid ${colors.accent}`,
                    width: '100%',
                    textAlign: 'center',
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
  // PORTRAIT
  // =========================
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        gap: '20px',
        background: colors.bg,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          flex: 1,
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `4px solid ${colors.accent}`,
        }}
      >
        <div style={{ color: colors.textSecondary }}>
          SENHA ATUAL
        </div>

        <div
          style={{
            fontSize: 'clamp(60px,20vw,120px)',
            fontWeight: 'bold',
            color: colors.senhaColor,
          }}
        >
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
        }}
      >
        {proximasSenhas.map((senha) => (
          <div
            key={senha.id}
            style={{
              fontSize: 'clamp(22px,5vw,36px)',
              textAlign: 'center',
              padding: '10px',
              borderRadius: '12px',
              border: `2px solid ${colors.accent}`,
            }}
          >
            {senha.senha_completa}
          </div>
        ))}
      </div>
    </div>
  );
}
