'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { Star, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  border: '#475569',
  accent: '#f59e0b',
  success: '#10b981',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  border: '#cbd5e1',
  accent: '#f59e0b',
  success: '#10b981',
};

interface ResponderPesquisaDisplayProps {
  data: { companyId: string; pesquisaId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface Pergunta {
  id: string;
  ordem: number;
  pergunta: string;
  tipo: 'multipla_escolha' | 'texto_livre' | 'estrelas';
  opcoes?: string[];
  obrigatoria: boolean;
}

interface Pesquisa {
  id: string;
  titulo: string;
  descricao?: string;
  mensagem_agradecimento: string;
}

export default function ResponderPesquisaDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: ResponderPesquisaDisplayProps) {
  const colors = theme === 'dark' ? DARK : LIGHT;
  const { companyId, pesquisaId } = data;

  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    carregarPesquisa();
  }, []);

  async function carregarPesquisa() {
    try {
      setLoading(true);

      // Carregar pesquisa
      const { data: pesquisaData, error: pesquisaError } = await supabase
        .from('pesquisas')
        .select('*')
        .eq('id', pesquisaId)
        .single();

      if (pesquisaError || !pesquisaData) {
        showToast('Pesquisa não encontrada', 'error');
        setTimeout(onClose, 2000);
        return;
      }

      setPesquisa(pesquisaData);

      // Carregar perguntas
      const { data: perguntasData, error: perguntasError } = await supabase
        .from('pesquisa_perguntas')
        .select('*')
        .eq('pesquisa_id', pesquisaId)
        .order('ordem', { ascending: true });

      if (perguntasError || !perguntasData) {
        showToast('Erro ao carregar perguntas', 'error');
        return;
      }

      setPerguntas(perguntasData);
      setLoading(false);

    } catch (error) {
      console.error('Erro ao carregar pesquisa:', error);
      showToast('Erro ao carregar pesquisa', 'error');
      setLoading(false);
    }
  }

  async function salvarRespostas() {
    try {
      // Validar campos obrigatórios
      const perguntasObrigatorias = perguntas.filter(p => p.obrigatoria);
      const faltandoResposta = perguntasObrigatorias.find(p => !respostas[p.id]);

      if (faltandoResposta) {
        showToast('Por favor, responda todas as perguntas obrigatórias', 'error');
        return;
      }

      // Salvar cada resposta
      for (const pergunta of perguntas) {
        const resposta = respostas[pergunta.id];
        if (!resposta) continue;

        const payload: any = {
          pesquisa_id: pesquisaId,
          pergunta_id: pergunta.id,
          company_id: companyId,
        };

        if (pergunta.tipo === 'estrelas') {
          payload.nota = resposta;
        } else {
          payload.resposta = Array.isArray(resposta) ? resposta.join(', ') : resposta;
        }

        await supabase
          .from('pesquisa_respostas')
          .insert(payload);
      }

      setCompleted(true);

      if (playText) {
        await playText(pesquisa?.mensagem_agradecimento || 'Obrigado pela sua avaliação!');
      }

      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      showToast('Erro ao salvar respostas', 'error');
    }
  }

  function handleResposta(perguntaId: string, valor: any) {
    setRespostas(prev => ({ ...prev, [perguntaId]: valor }));
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const perguntaAtual = perguntas[currentIndex];
  const isLastQuestion = currentIndex === perguntas.length - 1;
  const canGoNext = perguntaAtual && (!perguntaAtual.obrigatoria || respostas[perguntaAtual.id]);

  if (loading) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Carregando pesquisa...</div>
      </div>,
      document.body
    );
  }

  if (completed) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}>
        <div style={{
          background: colors.bg,
          borderRadius: '16px',
          padding: '60px 40px',
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: colors.success,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Check style={{ width: '48px', height: '48px', color: '#fff' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, marginBottom: '12px' }}>
            {pesquisa?.mensagem_agradecimento || 'Obrigado!'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Sua avaliação é muito importante para nós.
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.bg,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ color: colors.text, fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
            {pesquisa?.titulo}
          </div>
          {pesquisa?.descricao && (
            <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {pesquisa.descricao}
            </div>
          )}
          <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '8px' }}>
            Pergunta {currentIndex + 1} de {perguntas.length}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
          {perguntaAtual && (
            <div>
              <div style={{
                color: colors.text,
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '24px',
              }}>
                {perguntaAtual.pergunta}
                {perguntaAtual.obrigatoria && (
                  <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                )}
              </div>

              {/* Renderizar por tipo */}
              {perguntaAtual.tipo === 'estrelas' && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((nota) => (
                    <button
                      key={nota}
                      onClick={() => handleResposta(perguntaAtual.id, nota)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                      }}
                    >
                      <Star
                        style={{
                          width: '48px',
                          height: '48px',
                          fill: respostas[perguntaAtual.id] >= nota ? colors.accent : 'none',
                          stroke: respostas[perguntaAtual.id] >= nota ? colors.accent : colors.border,
                          transition: 'all 0.2s',
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {perguntaAtual.tipo === 'multipla_escolha' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {perguntaAtual.opcoes?.map((opcao) => (
                    <button
                      key={opcao}
                      onClick={() => handleResposta(perguntaAtual.id, opcao)}
                      style={{
                        background: respostas[perguntaAtual.id] === opcao ? colors.accent : colors.bgSecondary,
                        color: respostas[perguntaAtual.id] === opcao ? '#fff' : colors.text,
                        border: `2px solid ${respostas[perguntaAtual.id] === opcao ? colors.accent : colors.border}`,
                        borderRadius: '8px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              )}

              {perguntaAtual.tipo === 'texto_livre' && (
                <textarea
                  value={respostas[perguntaAtual.id] || ''}
                  onChange={(e) => handleResposta(perguntaAtual.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    background: colors.bgSecondary,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    resize: 'vertical',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            style={{
              background: 'transparent',
              border: `2px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.text,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>

          {isLastQuestion ? (
            <button
              onClick={salvarRespostas}
              disabled={!canGoNext}
              style={{
                background: canGoNext ? colors.success : colors.border,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check className="w-5 h-5" />
              Finalizar
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(prev => Math.min(perguntas.length - 1, prev + 1))}
              disabled={!canGoNext}
              style={{
                background: canGoNext ? colors.accent : colors.border,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Próxima
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? colors.success : '#ef4444',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 400,
          }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
