'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const DARK = {
  bg: '#0f172a',
  bgSecondary: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  accent: '#000080', // Azul navy
};

const LIGHT = {
  bg: '#f8fafc',
  bgSecondary: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  accent: '#000080', // Azul navy
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

  // Carregar dados
  useEffect(() => {
    carregarDados();

    // Realtime
    const channel = supabase
      .channel('painel-fila')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fila_senhas',
        filter: `company_id=eq.${companyId}`,
      }, async (payload) => {
        // Se mudou para "chamando", atualizar senha atual e falar
        if (payload.eventType === 'UPDATE' && payload.new.status === 'chamando') {
          const novaSenha = payload.new as FilaSenha;
          setSenhaAtual(novaSenha);
          
          // TTS
          if (playText) {
            const prefixo = novaSenha.senha_completa[0];
            const numeros = novaSenha.senha_completa.slice(1).split('');
            const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;
            await playText(texto);
          } else {
            // Web Speech API fallback
            const prefixo = novaSenha.senha_completa[0];
            const numeros = novaSenha.senha_completa.slice(1).split('');
            const texto = `Senha ${prefixo}. ${numeros.join('. ')}.`;
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
          }
        }

        // Recarregar lista
        await carregarDados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  async function carregarDados() {
    try {
      // ✅ CORREÇÃO: Usar .maybeSingle() em vez de .single()
      const { data: atual, error: atualError } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('chamada_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atualError) {
        console.error('Erro ao carregar senha atual:', atualError);
      }

      setSenhaAtual(atual || null);

      // Próximas senhas
      const { data: proximas } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'aguardando')
        .order('gerada_em', { ascending: true })
        .limit(5);

      setProximasSenhas(proximas || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  // Layout Landscape (deitado)
  if (isLandscape) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: colors.bg,
          display: 'flex',
          padding: '30px',
          gap: '30px',
        }}
      >
        {/* Senha Atual - 60% da largura */}
        <div
          style={{
            flex: '0 0 60%',
            background: colors.bgSecondary,
            borderRadius: '24px',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `4px solid ${colors.accent}`,
            boxShadow: theme === 'dark' 
              ? '0 20px 60px rgba(0,0,0,0.5)' 
              : '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{
            color: colors.textSecondary,
            fontSize: '28px',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            SENHA ATUAL
          </div>
          
          <div style={{
            fontSize: '160px',
            fontWeight: 'bold',
            color: colors.accent,
            marginBottom: '20px',
            lineHeight: 1,
          }}>
            {senhaAtual ? senhaAtual.senha_completa : '---'}
          </div>

          {senhaAtual && (
            <div style={{
              color: colors.textSecondary,
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}>
              {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
            </div>
          )}
        </div>

        {/* Próximas Senhas - 40% da largura */}
        <div
          style={{
            flex: '0 0 calc(40% - 30px)',
            background: colors.bgSecondary,
            borderRadius: '24px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: theme === 'dark' 
              ? '0 20px 60px rgba(0,0,0,0.5)' 
              : '0 20px 60px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{
            color: colors.textSecondary,
            fontSize: '20px',
            marginBottom: '30px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center',
            fontWeight: '600',
          }}>
            PRÓXIMAS SENHAS
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
          }}>
            {proximasSenhas.length === 0 ? (
              <div style={{
                color: colors.textSecondary,
                fontSize: '18px',
                padding: '40px',
              }}>
                Nenhuma senha aguardando
              </div>
            ) : (
              proximasSenhas.map((senha) => (
                <div
                  key={senha.id}
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: colors.text,
                    padding: '16px 32px',
                    background: colors.bg,
                    borderRadius: '12px',
                    border: `2px solid ${colors.accent}`,
                    boxShadow: theme === 'dark'
                      ? '0 4px 12px rgba(0,0,0,0.3)'
                      : '0 4px 12px rgba(0,0,0,0.08)',
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

  // Layout Portrait (em pé) - vertical
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        padding: '30px',
      }}
    >
      {/* Senha Atual - 60% da altura */}
      <div
        style={{
          flex: '0 0 60%',
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '60px',
          marginBottom: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `4px solid ${colors.accent}`,
          boxShadow: theme === 'dark' 
            ? '0 20px 60px rgba(0,0,0,0.5)' 
            : '0 20px 60px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{
          color: colors.textSecondary,
          fontSize: '28px',
          marginBottom: '20px',
          textTransform: 'uppercase',
          letterSpacing: '4px',
          fontWeight: '600',
        }}>
          SENHA ATUAL
        </div>
        
        <div style={{
          fontSize: '140px',
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: '20px',
          lineHeight: 1,
        }}>
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>

        {senhaAtual && (
          <div style={{
            color: colors.textSecondary,
            fontSize: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        )}
      </div>

      {/* Próximas Senhas - 40% da altura */}
      <div
        style={{
          flex: '0 0 calc(40% - 30px)',
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme === 'dark' 
            ? '0 20px 60px rgba(0,0,0,0.5)' 
            : '0 20px 60px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{
          color: colors.textSecondary,
          fontSize: '20px',
          marginBottom: '20px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textAlign: 'center',
          fontWeight: '600',
        }}>
          PRÓXIMAS SENHAS
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
        }}>
          {proximasSenhas.length === 0 ? (
            <div style={{
              color: colors.textSecondary,
              fontSize: '16px',
              padding: '20px',
            }}>
              Nenhuma senha aguardando
            </div>
          ) : (
            proximasSenhas.map((senha) => (
              <div
                key={senha.id}
                style={{
                  fontSize: '40px',
                  fontWeight: 'bold',
                  color: colors.text,
                  padding: '12px 24px',
                  background: colors.bg,
                  borderRadius: '12px',
                  border: `2px solid ${colors.accent}`,
                  boxShadow: theme === 'dark'
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.08)',
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
