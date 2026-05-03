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

// Retorna as configurações de layout de acordo com o total de senhas
function getSenhaLayout(total: number): {
  columns: string;
  fontSize: string;
  padding: string;
  borderRadius: string;
} {
  if (total <= 2) {
    return {
      columns: '1fr',
      fontSize: 'clamp(32px, 4vw, 56px)',
      padding: '20px 32px',
      borderRadius: '14px',
    };
  }
  if (total <= 4) {
    return {
      columns: '1fr',
      fontSize: 'clamp(24px, 3vw, 40px)',
      padding: '14px 24px',
      borderRadius: '12px',
    };
  }
  // 5–10: duas colunas, menores
  return {
    columns: '1fr 1fr',
    fontSize: 'clamp(16px, 2vw, 26px)',
    padding: '10px 16px',
    borderRadius: '10px',
  };
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
        .limit(100); // Sem limite visual — rolagem cuida do excesso

      setProximasSenhas(proximas || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const scrollbarCSS = `
    .fila-scroll {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      transition: scrollbar-color 0.3s;
    }
    .fila-scroll:hover,
    .fila-scroll:active {
      scrollbar-color: rgba(128,128,200,0.45) transparent;
    }
    .fila-scroll::-webkit-scrollbar {
      width: 5px;
    }
    .fila-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .fila-scroll::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: 99px;
      transition: background-color 0.3s;
    }
    .fila-scroll:hover::-webkit-scrollbar-thumb,
    .fila-scroll:active::-webkit-scrollbar-thumb {
      background-color: rgba(128,128,200,0.45);
    }
  `;

  // =========================
  // LANDSCAPE
  // =========================
  if (isLandscape) {
    const total = proximasSenhas.length;
    const layout = getSenhaLayout(total);

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
        <style>{scrollbarCSS}</style>
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
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow:
              theme === 'dark'
                ? '0 20px 60px rgba(0,0,0,0.5)'
                : '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              color: colors.textSecondary,
              fontSize: 'clamp(14px,1.2vw,18px)',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: '600',
              letterSpacing: '2px',
              flexShrink: 0,
            }}
          >
            PRÓXIMAS SENHAS
            {total > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '0.75em',
                  opacity: 0.6,
                }}
              >
                ({total})
              </span>
            )}
          </div>

          {/* Lista com scroll suave e scrollbar oculta */}
          <div
            className="fila-scroll"
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: layout.columns,
              gap: total >= 5 ? '10px' : '14px',
              alignContent: 'start',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {total === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontSize: 'clamp(14px,1.2vw,18px)',
                }}
              >
                Nenhuma senha aguardando
              </div>
            ) : (
              proximasSenhas.map((senha, index) => (
                <div
                  key={senha.id}
                  style={{
                    fontSize: layout.fontSize,
                    fontWeight: 'bold',
                    color: colors.text,
                    padding: layout.padding,
                    background: colors.bg,
                    borderRadius: layout.borderRadius,
                    border: `2px solid ${colors.accent}`,
                    textAlign: 'center',
                    // Primeira senha da lista com destaque sutil
                    opacity: index === 0 ? 1 : 0.85,
                    boxSizing: 'border-box',
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
  const total = proximasSenhas.length;
  const layout = getSenhaLayout(total);

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
      <style>{scrollbarCSS}</style>
      {/* SENHA ATUAL */}
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
        <div style={{ color: colors.textSecondary, letterSpacing: '2px', fontWeight: '600' }}>
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

        {senhaAtual && (
          <div style={{ color: colors.textSecondary, fontSize: 'clamp(12px,3vw,18px)', letterSpacing: '1px' }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        )}
      </div>

      {/* PRÓXIMAS SENHAS */}
      <div
        style={{
          flex: 1,
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            color: colors.textSecondary,
            fontSize: 'clamp(12px,3vw,16px)',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: '600',
            letterSpacing: '2px',
            flexShrink: 0,
          }}
        >
          PRÓXIMAS SENHAS
        </div>

        <div
          className="fila-scroll"
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: layout.columns,
            gap: total >= 5 ? '8px' : '12px',
            alignContent: 'start',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {total === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                color: colors.textSecondary,
                textAlign: 'center',
              }}
            >
              Nenhuma senha aguardando
            </div>
          ) : (
            proximasSenhas.map((senha, index) => (
              <div
                key={senha.id}
                style={{
                  fontSize: layout.fontSize,
                  fontWeight: 'bold',
                  color: colors.text,
                  padding: layout.padding,
                  background: colors.bg,
                  borderRadius: layout.borderRadius,
                  border: `2px solid ${colors.accent}`,
                  textAlign: 'center',
                  opacity: index === 0 ? 1 : 0.85,
                  boxSizing: 'border-box',
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
