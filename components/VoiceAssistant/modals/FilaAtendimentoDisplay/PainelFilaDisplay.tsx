'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  accent: '#808000',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  accent: '#808000',
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

  const supabase = createClient();

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
      // Senha atual (chamando ou atendimento)
      const { data: atual } = await supabase
        .from('fila_senhas')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['chamando', 'atendimento'])
        .order('chamada_em', { ascending: false })
        .limit(1)
        .single();

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

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        padding: '40px',
      }}
    >
      {/* Senha Atual */}
      <div
        style={{
          flex: 1,
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '60px',
          marginBottom: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `4px solid ${colors.accent}`,
        }}
      >
        <div style={{
          color: colors.textSecondary,
          fontSize: '32px',
          marginBottom: '20px',
          textTransform: 'uppercase',
          letterSpacing: '4px',
        }}>
          SENHA ATUAL
        </div>
        
        <div style={{
          fontSize: '180px',
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: '20px',
        }}>
          {senhaAtual ? senhaAtual.senha_completa : '---'}
        </div>

        {senhaAtual && (
          <div style={{
            color: colors.textSecondary,
            fontSize: '28px',
            textTransform: 'uppercase',
          }}>
            {senhaAtual.status === 'chamando' ? 'Sendo Chamada' : 'Em Atendimento'}
          </div>
        )}
      </div>

      {/* Próximas Senhas */}
      <div
        style={{
          background: colors.bgSecondary,
          borderRadius: '24px',
          padding: '40px',
        }}
      >
        <div style={{
          color: colors.textSecondary,
          fontSize: '24px',
          marginBottom: '30px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textAlign: 'center',
        }}>
          PRÓXIMAS SENHAS
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          flexWrap: 'wrap',
        }}>
          {proximasSenhas.length === 0 ? (
            <div style={{
              color: colors.textSecondary,
              fontSize: '20px',
              padding: '40px',
            }}>
              Nenhuma senha aguardando
            </div>
          ) : (
            proximasSenhas.map((senha) => (
              <div
                key={senha.id}
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: colors.text,
                  padding: '20px 40px',
                  background: colors.bg,
                  borderRadius: '12px',
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
