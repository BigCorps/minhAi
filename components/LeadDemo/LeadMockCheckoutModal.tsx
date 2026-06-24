'use client';

// components/LeadDemo/LeadMockCheckoutModal.tsx
//
// Modal mock de "objetivo cumprido" — substitui o MockObjetivoModal
// simples anterior. Espelha a MÁQUINA DE ESTADOS (não o visual
// completo) dos componentes reais:
// - Ramo Vendas → CheckoutFlow.tsx: pagamento → aguardando (PIX/QR) → confirmado
// - Ramo Agenda → GestorAgendaDisplay.tsx (StepPagamento): banner
//   "cobrar agora ou depois" → (se agora) aguardando → confirmado
//                              → (se depois) confirmado direto
//
// Diferenças propositais (decisões confirmadas, é MOCK, não real):
// - Método de pagamento fixo: só PIX (não há grid de métodos)
// - QR Code é uma imagem estática (/qrcode.png), não gerado de verdade
// - "Copia e Cola" é uma string fake, não um payload PIX real
// - Botão "Já paguei, verificar" confirma IMEDIATAMENTE (sem polling,
//   sem timer de expiração — decisão confirmada)
// - Sem criarPedido, sem Edge Functions, sem useCart — só UI + callback
//
// ATUALIZAÇÃO 1: prop isDark adicionada — corrige bug real (modal
// sempre abria com visual dark mesmo em tema claro, por não receber
// nenhuma informação de tema do componente pai).
//
// ATUALIZAÇÃO 2: etapa de Agenda (StepCobrancaOpcionalMock) agora
// mostra um MiniCalendarioPassivo com o dia/hora extraídos do texto
// livre (info.horario) via lib/parse-horario-natural.ts. Decisão
// confirmada: o calendário é PASSIVO (só exibe visualmente o que o
// GPT já extraiu da conversa) — não é interativo, não permite trocar
// o dia/horário clicando, para não gerar inconsistência com o que
// foi dito na conversa.

import { useState, useMemo } from 'react';
import { Copy, CheckCheck, ArrowLeft, Loader2, Check, Calendar, Clock } from 'lucide-react';
import { parseHorarioNatural } from '@/lib/parse-horario-natural';

export type ObjetivoInfo = { tipo: 'pedido' | 'horario'; horario?: string };

type MockStep = 'pagamento' | 'cobranca_opcional' | 'aguardando' | 'confirmado';

interface LeadMockCheckoutModalProps {
  info: ObjetivoInfo;
  produto: string;
  preco: number;
  nomeLead: string | null;
  /** Tema visual. Default 'dark' — preserva o comportamento anterior se omitida. */
  isDark?: boolean;
  onClose: () => void;
}

export function LeadMockCheckoutModal({
  info,
  produto,
  preco,
  nomeLead,
  isDark = true,
  onClose,
}: LeadMockCheckoutModalProps) {
  // Ramo Vendas (tipo 'pedido') começa direto em 'pagamento'.
  // Ramo Agenda (tipo 'horario') começa em 'cobranca_opcional',
  // espelhando o StepPagamento real do GestorAgendaDisplay.
  const [step, setStep] = useState<MockStep>(info.tipo === 'pedido' ? 'pagamento' : 'cobranca_opcional');
  const [pixCopied, setPixCopied] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const precoFormatado = `R$ ${preco.toFixed(2).replace('.', ',')}`;
  // Código fake só para preencher visualmente o "Copia e Cola" —
  // nunca é um payload PIX real, decisão consciente de manter a
  // demo claramente identificada como simulação.
  const pixCodeFake =
    '00020126580014BR.GOV.BCB.PIX0136demo-simulacao-minhai-naoe-real520400005303986540' +
    preco.toFixed(2).replace('.', '') +
    '5802BR5913minhAI DEMO6009SAO PAULO62070503***6304ABCD';

  // Parsing de melhor esforço do horário em texto livre, só para o
  // ramo Agenda. Memoizado porque info.horario não muda durante a
  // vida do modal.
  const horarioParseado = useMemo(() => {
    if (info.tipo !== 'horario' || !info.horario) return null;
    return parseHorarioNatural(info.horario);
  }, [info.tipo, info.horario]);

  const handleCopiarPix = () => {
    navigator.clipboard.writeText(pixCodeFake).catch(() => {});
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const handleConfirmarPagamentoMock = () => {
    // "Confirmar pagamento" no step pagamento → vai para aguardando
    // (mostra o QR), igual ao real (handleConfirmarPagamento real
    // chama as edge functions; aqui só avança o step).
    setStep('aguardando');
  };

  const handleJaPaguei = () => {
    // Decisão confirmada: confirma IMEDIATAMENTE, sem polling/timer.
    setConfirmando(true);
    setTimeout(() => {
      setConfirmando(false);
      setStep('confirmado');
    }, 600); // pequeno delay só para a transição não parecer instantânea/falsa
  };

  const handleCobrarDepois = () => {
    // Espelha onPular do StepPagamento real — vai direto para
    // confirmado, sem QR/checkout.
    setStep('confirmado');
  };

  const handleCobrarAgora = () => {
    setStep('aguardando');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`max-w-sm w-full rounded-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {step === 'pagamento' && (
          <StepPagamentoMock
            isDark={isDark}
            produto={produto}
            precoFormatado={precoFormatado}
            onConfirmar={handleConfirmarPagamentoMock}
            onClose={onClose}
          />
        )}

        {step === 'cobranca_opcional' && (
          <StepCobrancaOpcionalMock
            isDark={isDark}
            produto={produto}
            horario={info.horario}
            horarioParseado={horarioParseado}
            nomeLead={nomeLead}
            onCobrarAgora={handleCobrarAgora}
            onCobrarDepois={handleCobrarDepois}
          />
        )}

        {step === 'aguardando' && (
          <StepAguardandoMock
            isDark={isDark}
            precoFormatado={precoFormatado}
            pixCodeFake={pixCodeFake}
            pixCopied={pixCopied}
            confirmando={confirmando}
            onCopiar={handleCopiarPix}
            onJaPaguei={handleJaPaguei}
            onVoltar={() => setStep(info.tipo === 'pedido' ? 'pagamento' : 'cobranca_opcional')}
          />
        )}

        {step === 'confirmado' && (
          <StepConfirmadoMock
            isDark={isDark}
            info={info}
            produto={produto}
            precoFormatado={precoFormatado}
            nomeLead={nomeLead}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ── Step: pagamento (ramo Vendas) ──────────────────────────────────
// Espelha o step 'pagamento' do CheckoutFlow real, simplificado para
// 1 método fixo (PIX) em vez do grid de métodos.

function StepPagamentoMock({
  isDark,
  produto,
  precoFormatado,
  onConfirmar,
  onClose,
}: {
  isDark: boolean;
  produto: string;
  precoFormatado: string;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">Demonstração — Pagamento</p>
      <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{produto}</h2>
      <p className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{precoFormatado}</p>

      <div className={`rounded-xl border p-3 mb-4 text-left ${
        isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
      }`}>
        <p className={`text-xs uppercase tracking-wide mb-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          Forma de pagamento
        </p>
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          PIX — QR Code instantâneo
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          Fechar
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Pagar com PIX
        </button>
      </div>
    </div>
  );
}

// ── Step: cobrança opcional (ramo Agenda) ──────────────────────────
// Espelha o StepPagamento real do GestorAgendaDisplay: banner +
// "cobrar depois" + (implícito) opção de cobrar agora. Agora também
// mostra o MiniCalendarioPassivo com o dia/hora extraídos da fala.

function StepCobrancaOpcionalMock({
  isDark,
  produto,
  horario,
  horarioParseado,
  nomeLead,
  onCobrarAgora,
  onCobrarDepois,
}: {
  isDark: boolean;
  produto: string;
  horario?: string;
  horarioParseado: ReturnType<typeof parseHorarioNatural>;
  nomeLead: string | null;
  onCobrarAgora: () => void;
  onCobrarDepois: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
        Demonstração — Agendamento criado
      </p>
      <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{produto}</h2>
      {nomeLead && (
        <p className={`text-sm mb-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Para: {nomeLead}</p>
      )}

      {horarioParseado ? (
        <MiniCalendarioPassivo isDark={isDark} horarioParseado={horarioParseado} textoOriginal={horario} />
      ) : horario ? (
        // Fallback: parser não reconheceu nenhum padrão de dia —
        // mostra só o texto livre, sem calendário (decisão: melhor
        // esforço, sem bloquear o fluxo quando falha).
        <p className={`text-base mb-3 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{horario}</p>
      ) : null}

      <div className={`rounded-xl border p-3 mb-4 mt-3 ${
        isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'
      }`}>
        <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          Agendamento criado! Deseja cobrar agora?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCobrarAgora}
          className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Cobrar agora (PIX)
        </button>
        <button
          onClick={onCobrarDepois}
          className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            isDark
              ? 'border-white/15 text-white/60 hover:bg-white/5'
              : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          Cobrar depois — apenas confirmar agendamento
        </button>
      </div>
    </div>
  );
}

// ── Mini-calendário PASSIVO ─────────────────────────────────────────
// Versão simplificada e NÃO INTERATIVA do MiniCalendario real visto
// em GestorAgendaDisplay.tsx. Só exibe visualmente o mês com o dia
// extraído marcado — não responde a cliques, não permite navegação
// entre meses, não permite trocar a seleção (decisão confirmada).

function MiniCalendarioPassivo({
  isDark,
  horarioParseado,
  textoOriginal,
}: {
  isDark: boolean;
  horarioParseado: NonNullable<ReturnType<typeof parseHorarioNatural>>;
  textoOriginal?: string;
}) {
  const { data, temHoraExata, periodoDia } = horarioParseado;

  const ano = data.getFullYear();
  const mes = data.getMonth();
  const diaSelecionado = data.getDate();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const mesStr = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const diasSemanaLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const hoje = new Date();

  const horaLabel = temHoraExata
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : periodoDia === 'manha'
    ? 'Manhã'
    : periodoDia === 'tarde'
    ? 'Tarde'
    : periodoDia === 'noite'
    ? 'Noite'
    : textoOriginal ?? '';

  return (
    <div className={`rounded-xl border p-3 mb-1 ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
      <p className={`text-xs font-semibold mb-2 capitalize text-center ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        {mesStr}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {diasSemanaLabels.map((d, i) => (
          <div key={i} className={`text-center text-[10px] font-semibold ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const isSelecionado = dia === diaSelecionado;
          const isHoje =
            dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          return (
            <div
              key={dia}
              className={`text-center text-xs rounded-md py-1 ${
                isSelecionado
                  ? 'bg-emerald-500 text-white font-bold'
                  : isHoje
                  ? isDark
                    ? 'bg-white/10 text-white/70'
                    : 'bg-gray-200 text-gray-700'
                  : isDark
                  ? 'text-white/40'
                  : 'text-gray-400'
              }`}
            >
              {dia}
            </div>
          );
        })}
      </div>

      <div className={`flex items-center justify-center gap-3 mt-3 pt-2 border-t ${
        isDark ? 'border-white/10' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-1">
          <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            {data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        </div>
        {horaLabel && (
          <div className="flex items-center gap-1">
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{horaLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step: aguardando (PIX mock — compartilhado entre Vendas/Agenda) ──
// Espelha o step 'aguardando' (caminho PIX) do CheckoutFlow real:
// coluna de info/Copia-e-Cola + coluna de QR Code. Aqui colapsado em
// 1 coluna por ser modal menor, mas mantém os mesmos elementos.

function StepAguardandoMock({
  isDark,
  precoFormatado,
  pixCodeFake,
  pixCopied,
  confirmando,
  onCopiar,
  onJaPaguei,
  onVoltar,
}: {
  isDark: boolean;
  precoFormatado: string;
  pixCodeFake: string;
  pixCopied: boolean;
  confirmando: boolean;
  onCopiar: () => void;
  onJaPaguei: () => void;
  onVoltar: () => void;
}) {
  return (
    <div className="p-6">
      <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2 text-center">
        Demonstração — o PIX é apenas demonstração, apenas verifique o pagamento
      </p>

      <div className="bg-white p-3 rounded-xl mx-auto mb-3" style={{ maxWidth: 200 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qrcode.png" alt="QR Code PIX (simulação)" className="w-full h-full object-contain" />
      </div>

      <p className={`text-center text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {precoFormatado}
      </p>

      <div className={`rounded-lg border px-2 py-1.5 mb-2 ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
      }`}>
        <p className={`text-[10px] font-mono truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          {pixCodeFake.slice(0, 40)}...
        </p>
      </div>

      <button
        onClick={onCopiar}
        className={`w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 mb-2 ${
          pixCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {pixCopied ? (
          <>
            <CheckCheck className="w-3.5 h-3.5" /> Copiado!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" /> Copiar Código PIX
          </>
        )}
      </button>

      <button
        onClick={onJaPaguei}
        disabled={confirmando}
        className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2 mb-2"
      >
        {confirmando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
          </>
        ) : (
          'Já paguei, verificar'
        )}
      </button>

      <button
        onClick={onVoltar}
        className={`w-full flex items-center justify-center gap-1 text-xs transition-colors ${
          isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <ArrowLeft className="w-3 h-3" /> Voltar
      </button>
    </div>
  );
}

// ── Step: confirmado (compartilhado) ───────────────────────────────

function StepConfirmadoMock({
  isDark,
  info,
  produto,
  precoFormatado,
  nomeLead,
  onClose,
}: {
  isDark: boolean;
  info: ObjetivoInfo;
  produto: string;
  precoFormatado: string;
  nomeLead: string | null;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
      </div>

      {info.tipo === 'pedido' ? (
        <>
          <p className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Pagamento confirmado!
          </p>
          {nomeLead && (
            <p className={`text-sm mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Obrigado, {nomeLead}!</p>
          )}
          <p className="text-lg font-bold text-emerald-400 mb-1">{precoFormatado}</p>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{produto}</p>
        </>
      ) : (
        <>
          <p className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Agendamento confirmado!
          </p>
          {nomeLead && (
            <p className={`text-sm mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Para: {nomeLead}</p>
          )}
          <p className={`text-sm mb-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{produto}</p>
          {info.horario && <p className="text-sm text-emerald-400 font-semibold">{info.horario}</p>}
        </>
      )}

      <p className={`text-xs mt-4 mb-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
        Em um assistente real, isto seria processado automaticamente.
      </p>

      <button
        onClick={onClose}
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        Fechar
      </button>
    </div>
  );
}