'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { Check, AlertCircle } from 'lucide-react';

const DARK = {
  bg: '#1e293b',
  bgSecondary: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  border: '#475569',
  accent: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  border: '#cbd5e1',
  accent: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
};

interface PreAtendimentoDisplayProps {
  data: { companyId: string; formId: string };
  onClose: () => void;
  theme?: 'dark' | 'light';
  playText?: (text: string) => Promise<void>;
}

interface Campo {
  id: string;
  label: string;
  tipo: 'texto' | 'textarea' | 'multipla_escolha';
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[];
  multiplo?: boolean;
  ordem: number;
}

interface Form {
  id: string;
  nome: string;
  descricao?: string;
  campos: Campo[];
}

export default function PreAtendimentoDisplay({
  data,
  onClose,
  theme = 'dark',
  playText,
}: PreAtendimentoDisplayProps) {
  const colors = theme === 'dark' ? DARK : LIGHT;
  const { companyId, formId } = data;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    carregarForm();
  }, []);

  async function carregarForm() {
    try {
      setLoading(true);

      const { data: formData, error: formError } = await supabase
        .from('pre_atendimento_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !formData) {
        showToast('Formulário não encontrado', 'error');
        setTimeout(onClose, 2000);
        return;
      }

      setForm(formData);
      setLoading(false);

    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      showToast('Erro ao carregar formulário', 'error');
      setLoading(false);
    }
  }

  async function salvarRespostas() {
    try {
      // Validar campos obrigatórios
      const camposObrigatorios = form?.campos.filter(c => c.obrigatorio) || [];
      const faltandoResposta = camposObrigatorios.find(c => !respostas[c.id] || respostas[c.id] === '');

      if (faltandoResposta) {
        showToast(`Campo "${faltandoResposta.label}" é obrigatório`, 'error');
        return;
      }

      setSubmitting(true);

      // Salvar respostas
      const { error } = await supabase
        .from('pre_atendimento_respostas')
        .insert({
          form_id: formId,
          company_id: companyId,
          respostas: respostas,
        });

      if (error) {
        console.error('Erro ao salvar:', error);
        showToast('Erro ao salvar respostas', 'error');
        setSubmitting(false);
        return;
      }

      setCompleted(true);
      setSubmitting(false);

      if (playText) {
        await playText('Formulário enviado com sucesso! Obrigado.');
      }

      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      showToast('Erro ao salvar respostas', 'error');
      setSubmitting(false);
    }
  }

  function handleResposta(campoId: string, valor: any) {
    setRespostas(prev => ({ ...prev, [campoId]: valor }));
  }

  function handleMultiplaEscolha(campoId: string, opcao: string, multiplo: boolean) {
    if (multiplo) {
      const atual = respostas[campoId] || [];
      const novoArray = atual.includes(opcao)
        ? atual.filter((o: string) => o !== opcao)
        : [...atual, opcao];
      handleResposta(campoId, novoArray);
    } else {
      handleResposta(campoId, opcao);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

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
        <div style={{ color: '#fff', fontSize: '18px' }}>Carregando formulário...</div>
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
            Formulário Enviado!
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Suas informações foram registradas com sucesso.
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const campos = form?.campos.sort((a, b) => a.ordem - b.ordem) || [];

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
          maxWidth: '700px',
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
            {form?.nome}
          </div>
          {form?.descricao && (
            <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {form.descricao}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {campos.map((campo) => (
              <div key={campo.id}>
                <label style={{
                  display: 'block',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}>
                  {campo.label}
                  {campo.obrigatorio && (
                    <span style={{ color: colors.danger, marginLeft: '4px' }}>*</span>
                  )}
                </label>

                {/* Texto curto */}
                {campo.tipo === 'texto' && (
                  <input
                    type="text"
                    value={respostas[campo.id] || ''}
                    onChange={(e) => handleResposta(campo.id, e.target.value)}
                    placeholder={campo.placeholder || ''}
                    style={{
                      width: '100%',
                      background: colors.bgSecondary,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '16px',
                    }}
                  />
                )}

                {/* Texto longo */}
                {campo.tipo === 'textarea' && (
                  <textarea
                    value={respostas[campo.id] || ''}
                    onChange={(e) => handleResposta(campo.id, e.target.value)}
                    placeholder={campo.placeholder || ''}
                    rows={4}
                    style={{
                      width: '100%',
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

                {/* Múltipla escolha */}
                {campo.tipo === 'multipla_escolha' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {campo.opcoes?.map((opcao) => {
                      const isSelected = campo.multiplo
                        ? (respostas[campo.id] || []).includes(opcao)
                        : respostas[campo.id] === opcao;

                      return (
                        <button
                          key={opcao}
                          onClick={() => handleMultiplaEscolha(campo.id, opcao, campo.multiplo || false)}
                          style={{
                            background: isSelected ? colors.accent : colors.bgSecondary,
                            color: isSelected ? '#fff' : colors.text,
                            border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '16px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: campo.multiplo ? '4px' : '50%',
                            border: `2px solid ${isSelected ? '#fff' : colors.border}`,
                            background: isSelected ? '#fff' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isSelected && (
                              <Check style={{ width: '14px', height: '14px', color: colors.accent }} />
                            )}
                          </div>
                          {opcao}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
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
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: `2px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.text,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>

          <button
            onClick={salvarRespostas}
            disabled={submitting}
            style={{
              background: submitting ? colors.border : colors.success,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Enviar
              </>
            )}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? colors.success : colors.danger,
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
