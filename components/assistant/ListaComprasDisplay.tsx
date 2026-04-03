'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useIsMobile } from '@/hooks/useIsMobile';

// ========================================
// TIPOS E INTERFACES
// ========================================

type Estagio = 'coletando' | 'usando' | 'concluida';

interface ItemLista {
  id: string;
  nome: string;
  quantidade?: string;
  pego: boolean;
  isNew?: boolean;
}

interface ListaComprasDisplayProps {
  data: {
    companyId: string;
    listaId?: string;
  };
  onClose: () => void;
  playText: (text: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

// ========================================
// CONSTANTES
// ========================================

const OPENING_TEXT = 
  'Pode começar a ditar sua lista. Diga os itens um por um, ' +
  'por exemplo: leite, ovos, pão. Diga "salvar" quando terminar.';

const COLOR = '#10B981';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function ListaComprasDisplay({
  data,
  onClose,
  playText,
  theme = 'dark',
}: ListaComprasDisplayProps) {
  const isMobile = useIsMobile();
  const supabase = createClient();
  const lastSpeech = useRef('');

  // Estados
  const [estagio, setEstagio] = useState<Estagio>('coletando');
  const [itens, setItens] = useState<ItemLista[]>([]);
  const [listaId, setListaId] = useState<string | null>(data.listaId || null);
  const [nomeLista, setNomeLista] = useState('Lista de Compras');
  const [novoItem, setNovoItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Detectar tema
  const [currentTheme, setCurrentTheme] = useState(theme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setCurrentTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');

    return () => observer.disconnect();
  }, []);

  const C = currentTheme === 'dark' ? DARK : LIGHT;

  // ========================================
  // INICIALIZAÇÃO
  // ========================================

  useEffect(() => {
    if (data.listaId) {
      carregarLista(data.listaId);
      setEstagio('usando');
      playText('Lista aberta. Pode ir marcando os itens.').catch(() => {});
    } else {
      playText(OPENING_TEXT).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================
  // FUNÇÕES DE BANCO DE DADOS
  // ========================================

  async function carregarLista(id: string) {
    setIsLoading(true);
    try {
      const { data: lista, error: le } = await supabase
        .from('lista_compras')
        .select('*, lista_compras_itens(*)')
        .eq('id', id)
        .single();

      if (le || !lista) throw le ?? new Error('Lista não encontrada');

      setNomeLista(lista.nome);
      setListaId(lista.id);
      
      const itensDb = lista.lista_compras_itens || [];
      setItens(
        itensDb
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((i: any) => ({
            id: i.id,
            nome: i.nome,
            quantidade: i.quantidade || undefined,
            pego: i.pego,
            isNew: false,
          }))
      );
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
      playText('Erro ao carregar lista.').catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  async function salvarLista() {
    if (itens.length === 0) {
      playText('Adicione ao menos um item.').catch(() => {});
      return;
    }

    setIsSaving(true);
    try {
      // 1. Criar lista
      const { data: lista, error: le } = await supabase
        .from('lista_compras')
        .insert({ 
          company_id: data.companyId, 
          nome: nomeLista, 
          status: 'ativa' 
        })
        .select('id')
        .single();

      if (le || !lista) throw le ?? new Error('Erro ao criar lista');

      // 2. Inserir itens
      await supabase.from('lista_compras_itens').insert(
        itens.map((item, i) => ({
          lista_id: lista.id,
          nome: item.nome,
          quantidade: item.quantidade ?? null,
          pego: false,
          ordem: i,
        }))
      );

      // 3. Registrar uso (cobrar crédito)
      await supabase.from('assistant_function_logs').insert({
        company_id: data.companyId,
        function_key: 'lista_compras',
        credits_consumed: 1,
        metadata: { total_itens: itens.length, nome_lista: nomeLista },
      });

      setListaId(lista.id);

      // 4. Recarregar itens com UUIDs reais do banco
      const { data: itensDb } = await supabase
        .from('lista_compras_itens')
        .select('*')
        .eq('lista_id', lista.id)
        .order('ordem');

      setItens((itensDb ?? []).map(i => ({ 
        id: i.id,
        nome: i.nome,
        quantidade: i.quantidade || undefined,
        pego: i.pego,
        isNew: false 
      })));

      setEstagio('usando');

      const speech = `Lista salva com ${itens.length} itens. Pode começar as compras!`;
      lastSpeech.current = speech;
      playText(speech).catch(() => {});
    } catch (err) {
      console.error('Erro ao salvar:', err);
      playText('Erro ao salvar. Tente novamente.').catch(() => {});
    } finally {
      setIsSaving(false);
    }
  }

  async function marcarPego(itemId: string, pego: boolean) {
    // Atualização otimista
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, pego } : i));

    // Persistir no banco
    if (listaId) {
      await supabase
        .from('lista_compras_itens')
        .update({ pego })
        .eq('id', itemId);
    }

    // Verificar se todos foram pegos
    const atualizados = itens.map(i => i.id === itemId ? { ...i, pego } : i);
    const todosPegos = atualizados.every(i => i.pego);

    if (todosPegos && pego) {
      setEstagio('concluida');
      playText('Lista concluída! Boa compra.').catch(() => {});
    }
  }

  async function removerItem(itemId: string) {
    setItens(prev => prev.filter(i => i.id !== itemId));

    if (listaId) {
      await supabase
        .from('lista_compras_itens')
        .delete()
        .eq('id', itemId);
    }
  }

  // ========================================
  // PARSER DE ITENS POR VOZ
  // ========================================

  function parsearItens(transcript: string): { nome: string; quantidade?: string }[] {
    const limpo = transcript
      .replace(/\b(adicionar?|adiciona|coloca|inclui|incluir|quero|preciso de)\b/gi, '')
      .trim();

    const partes = limpo
      .split(/,|\se\s|\smais\s/i)
      .map(p => p.trim())
      .filter(Boolean);

    return partes.map(parte => {
      const m = parte.match(/^(\d+\s*(?:litros?|kg|g|gramas?|unidades?|dúzias?|pacotes?|caixas?)\s+(?:de\s+)?)?(.+)$/i);
      return {
        nome: (m?.[2] ?? parte).trim(),
        quantidade: m?.[1]?.trim() || undefined,
      };
    });
  }

  function adicionarItens(novosItens: { nome: string; quantidade?: string }[]) {
    const tempId = () => `temp-${Date.now()}-${Math.random()}`;
    
    const itensComId = novosItens.map(item => ({
      id: tempId(),
      nome: item.nome,
      quantidade: item.quantidade,
      pego: false,
      isNew: true,
    }));

    setItens(prev => [...prev, ...itensComId]);

    // Remover flag isNew após 1.5s
    setTimeout(() => {
      setItens(prev => prev.map(i => ({ ...i, isNew: false })));
    }, 1500);

    // Se já está usando (lista salva), adicionar no banco
    if (listaId && estagio === 'usando') {
      novosItens.forEach(async (item, idx) => {
        const { data: itemDb } = await supabase
          .from('lista_compras_itens')
          .insert({
            lista_id: listaId,
            nome: item.nome,
            quantidade: item.quantidade ?? null,
            pego: false,
            ordem: itens.length + idx,
          })
          .select('id')
          .single();

        if (itemDb) {
          // Atualizar ID temporário com ID real
          setItens(prev => 
            prev.map(i => 
              i.nome === item.nome && i.id.startsWith('temp-') 
                ? { ...i, id: itemDb.id } 
                : i
            )
          );
        }
      });
    }
  }

  function adicionarItemManual() {
    if (!novoItem.trim()) return;
    
    const parsed = parsearItens(novoItem);
    adicionarItens(parsed);
    setNovoItem('');
  }

  // ========================================
  // COMANDOS DE VOZ
  // ========================================

  function handleVoiceCommand(transcript: string) {
    const lower = transcript.toLowerCase().trim();

    // Fechar/Cancelar
    if (/\b(fechar|cancelar|sair)\b/i.test(lower)) {
      onClose();
      return;
    }

    // Salvar
    if (/\b(salvar|pronto|finalizar|concluir)\b/i.test(lower) && estagio === 'coletando') {
      salvarLista();
      return;
    }

    // Adicionar itens
    if (/\b(adicionar?|adiciona|coloca|inclui|incluir)\b/i.test(lower)) {
      const parsed = parsearItens(lower);
      if (parsed.length > 0) {
        adicionarItens(parsed);
        playText(`Adicionado: ${parsed.map(p => p.nome).join(', ')}`).catch(() => {});
      }
      return;
    }

    // Remover/Tirar
    if (/\b(remover?|tira|tirar|remove)\b/i.test(lower)) {
      const nomeItem = lower
        .replace(/\b(remover?|tira|tirar|remove)\b/gi, '')
        .trim();
      
      const item = itens.find(i => 
        i.nome.toLowerCase().includes(nomeItem) || 
        nomeItem.includes(i.nome.toLowerCase())
      );

      if (item) {
        if (estagio === 'usando') {
          marcarPego(item.id, true);
          playText(`${item.nome} marcado.`).catch(() => {});
        } else {
          removerItem(item.id);
          playText(`${item.nome} removido.`).catch(() => {});
        }
      }
      return;
    }

    // Peguei X (marcar como pego)
    if (/\b(peguei|já peguei)\b/i.test(lower) && estagio === 'usando') {
      const nomeItem = lower
        .replace(/\b(peguei|já peguei)\b/gi, '')
        .trim();
      
      const item = itens.find(i => 
        i.nome.toLowerCase().includes(nomeItem) || 
        nomeItem.includes(i.nome.toLowerCase())
      );

      if (item) {
        marcarPego(item.id, true);
        playText(`${item.nome} marcado.`).catch(() => {});
      }
      return;
    }

    // Nova lista
    if (/\b(nova lista)\b/i.test(lower)) {
      resetLista();
      return;
    }

    // Repetir
    if (/\b(repetir)\b/i.test(lower)) {
      if (lastSpeech.current) {
        playText(lastSpeech.current).catch(() => {});
      }
      return;
    }

    // Se não reconheceu comando, tenta adicionar como itens
    if (estagio === 'coletando') {
      const parsed = parsearItens(lower);
      if (parsed.length > 0) {
        adicionarItens(parsed);
      }
    }
  }

  function resetLista() {
    setItens([]);
    setListaId(null);
    setNomeLista('Lista de Compras');
    setEstagio('coletando');
    playText(OPENING_TEXT).catch(() => {});
  }

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  const pegos = itens.filter(i => i.pego).length;
  const total = itens.length;
  const pct = total > 0 ? Math.round((pegos / total) * 100) : 0;

  // SVG Icons
  const CheckboxIcon = ({ checked }: { checked: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect 
        x="3" y="3" width="18" height="18" 
        rx="4" 
        stroke={checked ? COLOR : C.border} 
        strokeWidth="2"
        fill={checked ? COLOR : 'transparent'}
      />
      {checked && (
        <path 
          d="M7 12L10.5 15.5L17 9" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      )}
    </svg>
  );

  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.text}>
      <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const ShoppingCartIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white">
      <circle cx="9" cy="21" r="1" strokeWidth="2"/>
      <circle cx="20" cy="21" r="1" strokeWidth="2"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={COLOR} opacity="0.2"/>
      <circle cx="12" cy="12" r="10" stroke={COLOR} strokeWidth="2"/>
      <path d="M8 12l3 3 5-6" stroke={COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (!document.body) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? 0 : 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          width: isMobile ? '100%' : 'min(900px, 90vw)',
          height: isMobile ? '100%' : 'min(700px, 85vh)',
          borderRadius: isMobile ? 0 : 16,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* SIDEBAR DESKTOP / HEADER MOBILE */}
        {isMobile ? (
          <div style={{ background: COLOR, padding: '20px 16px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ShoppingCartIcon />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Lista de Compras</h2>
                  <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
                    {estagio === 'coletando' && 'Ditando itens'}
                    {estagio === 'usando' && `${pegos}/${total} itens`}
                    {estagio === 'concluida' && 'Concluída'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: 280, background: COLOR, padding: '32px 24px', color: 'white', flexShrink: 0 }}>
            <div style={{ marginBottom: 32 }}>
              <ShoppingCartIcon />
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 8px' }}>Lista de Compras</h2>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { key: 'coletando', label: 'Coletando', num: 1 },
                { key: 'usando', label: 'Usando', num: 2 },
                { key: 'concluida', label: 'Concluída', num: 3 },
              ].map((step, idx) => {
                const isActive = estagio === step.key;
                const isPast = 
                  (estagio === 'usando' && step.key === 'coletando') ||
                  (estagio === 'concluida' && step.key !== 'concluida');

                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isActive || isPast ? 'white' : 'rgba(255,255,255,0.3)',
                        color: isActive || isPast ? COLOR : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {step.num}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: isActive ? 700 : 400, opacity: isActive ? 1 : 0.8 }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 40, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 8 }}>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.95 }}>
                <strong>{total}</strong> {total === 1 ? 'item' : 'itens'} na lista
              </p>
              {estagio === 'usando' && (
                <p style={{ fontSize: 13, margin: '8px 0 0', opacity: 0.95 }}>
                  <strong>{pegos}</strong> já pegou
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: 'auto',
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              Fechar
            </button>
          </div>
        )}

        {/* CORPO PRINCIPAL */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ESTÁGIO: COLETANDO */}
          {estagio === 'coletando' && (
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 32 }}>
              <input
                type="text"
                value={nomeLista}
                onChange={e => setNomeLista(e.target.value)}
                placeholder="Nome da lista"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 18,
                  fontWeight: 600,
                  background: C.bgSecondary,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                  marginBottom: 24,
                  outline: 'none',
                }}
              />

              {itens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textSecondary }}>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>Comece ditando seus itens</p>
                  <p style={{ fontSize: 14 }}>Ex: "leite, ovos, pão"</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {itens.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: item.isNew ? 'rgba(16,185,129,0.12)' : C.bgSecondary,
                        border: `1px solid ${item.isNew ? 'rgba(16,185,129,0.3)' : C.border}`,
                        borderRadius: 10,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>
                          {idx + 1}. {item.nome}
                        </span>
                        {item.quantidade && (
                          <span style={{ fontSize: 13, color: C.textSecondary, marginLeft: 8 }}>
                            ({item.quantidade})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removerItem(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: C.textSecondary,
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '4px 8px',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={novoItem}
                  onChange={e => setNovoItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarItemManual()}
                  placeholder="Adicionar item manualmente"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: C.bgSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={adicionarItemManual}
                  style={{
                    padding: '12px 20px',
                    background: COLOR,
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>

              <button
                onClick={salvarLista}
                disabled={isSaving || itens.length === 0}
                style={{
                  width: '100%',
                  marginTop: 24,
                  padding: '14px 24px',
                  background: itens.length === 0 ? C.bgTertiary : COLOR,
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: itens.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? 'Salvando...' : `Salvar Lista (${itens.length} ${itens.length === 1 ? 'item' : 'itens'})`}
              </button>
            </div>
          )}

          {/* ESTÁGIO: USANDO */}
          {estagio === 'usando' && (
            <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>{nomeLista}</h3>

              {/* Barra de progresso */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: C.textSecondary }}>
                    {pegos} de {total} itens pegos
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLOR }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.bgTertiary, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 4,
                      width: `${pct}%`,
                      background: pct === 100 ? '#16a34a' : COLOR,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Lista de itens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {itens.map(item => (
                  <div
                    key={item.id}
                    onClick={() => marcarPego(item.id, !item.pego)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: item.isNew 
                        ? 'rgba(16,185,129,0.12)' 
                        : item.pego 
                        ? C.bgSecondary 
                        : C.bg,
                      border: `1px solid ${item.pego ? C.border : 'rgba(16,185,129,0.3)'}`,
                      opacity: item.pego ? 0.5 : 1,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <CheckboxIcon checked={item.pego} />
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: 15,
                          color: C.text,
                          fontWeight: 500,
                          textDecoration: item.pego ? 'line-through' : 'none',
                        }}
                      >
                        {item.nome}
                      </span>
                      {item.quantidade && (
                        <span
                          style={{
                            fontSize: 13,
                            color: C.textSecondary,
                            marginLeft: 8,
                            textDecoration: item.pego ? 'line-through' : 'none',
                          }}
                        >
                          ({item.quantidade})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar mais itens */}
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={novoItem}
                  onChange={e => setNovoItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarItemManual()}
                  placeholder="Adicionar mais itens"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: C.bgSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={adicionarItemManual}
                  style={{
                    padding: '12px 20px',
                    background: COLOR,
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* ESTÁGIO: CONCLUÍDA */}
          {estagio === 'concluida' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? 16 : 32,
                textAlign: 'center',
              }}
            >
              <CheckCircleIcon />
              <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: '24px 0 8px' }}>
                Lista Concluída!
              </h2>
              <p style={{ fontSize: 16, color: C.textSecondary, marginBottom: 32 }}>
                Você marcou todos os {total} itens. Boa compra!
              </p>
              <button
                onClick={resetLista}
                style={{
                  padding: '14px 32px',
                  background: COLOR,
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Nova Lista
              </button>
            </div>
          )}

          {/* FOOTER - Hints de comandos */}
          <div
            style={{
              padding: isMobile ? '12px 16px' : '16px 32px',
              background: C.bgSecondary,
              borderTop: `1px solid ${C.border}`,
              fontSize: 12,
              color: C.textSecondary,
            }}
          >
            {estagio === 'coletando' && '💬 Diga: "adicionar leite" • "salvar" • "cancelar"'}
            {estagio === 'usando' && '💬 Diga: "peguei leite" • "adicionar manteiga" • "nova lista"'}
            {estagio === 'concluida' && '💬 Diga: "nova lista" • "fechar"'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================
// CORES POR TEMA
// ========================================

const DARK = {
  bg: '#1a1a1a',
  bgSecondary: '#262626',
  bgTertiary: '#404040',
  text: '#ffffff',
  textSecondary: '#a3a3a3',
  border: '#404040',
};

const LIGHT = {
  bg: '#ffffff',
  bgSecondary: '#f5f5f5',
  bgTertiary: '#e5e5e5',
  text: '#171717',
  textSecondary: '#737373',
  border: '#e5e5e5',
};
