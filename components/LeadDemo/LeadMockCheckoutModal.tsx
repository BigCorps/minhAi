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

import { useState } from 'react';
import { Copy, CheckCheck, ArrowLeft, Loader2, Check } from 'lucide-react';

export type ObjetivoInfo = { tipo: 'pedido' | 'horario'; horario?: string };

type MockStep = 'pagamento' | 'cobranca_opcional' | 'aguardando' | 'confirmado';

interface LeadMockCheckoutModalProps {
  info: ObjetivoInfo;
  produto: string;
  preco: number;
  nomeLead: string | null;
  onClose: () => void;
}

export function LeadMockCheckoutModal({
  info,
  produto,
  preco,
  nomeLead,
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
        className="max-w-sm w-full rounded-2xl bg-slate-900 border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {step === 'pagamento' && (
          <StepPagamentoMock
            produto={produto}
            precoFormatado={precoFormatado}
            onConfirmar={handleConfirmarPagamentoMock}
            onClose={onClose}
          />
        )}

        {step === 'cobranca_opcional' && (
          <StepCobrancaOpcionalMock
            produto={produto}
            horario={info.horario}
            nomeLead={nomeLead}
            onCobrarAgora={handleCobrarAgora}
            onCobrarDepois={handleCobrarDepois}
          />
        )}

        {step === 'aguardando' && (
          <StepAguardandoMock
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
  produto,
  precoFormatado,
  onConfirmar,
  onClose,
}: {
  produto: string;
  precoFormatado: string;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">Demonstração — Pagamento</p>
      <h2 className="text-lg font-bold text-white mb-1">{produto}</h2>
      <p className="text-3xl font-bold text-white mb-4">{precoFormatado}</p>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-4 text-left">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Forma de pagamento</p>
        <p className="text-sm font-semibold text-white">PIX — QR Code instantâneo</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          Fechar
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Confirmar pagamento
        </button>
      </div>
    </div>
  );
}

// ── Step: cobrança opcional (ramo Agenda) ──────────────────────────
// Espelha o StepPagamento real do GestorAgendaDisplay: banner +
// "cobrar depois" + (implícito) opção de cobrar agora.

function StepCobrancaOpcionalMock({
  produto,
  horario,
  nomeLead,
  onCobrarAgora,
  onCobrarDepois,
}: {
  produto: string;
  horario?: string;
  nomeLead: string | null;
  onCobrarAgora: () => void;
  onCobrarDepois: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
        Demonstração — Agendamento criado
      </p>
      <h2 className="text-lg font-bold text-white mb-1">{produto}</h2>
      {horario && <p className="text-base text-white/80 mb-1">{horario}</p>}
      {nomeLead && <p className="text-sm text-white/50 mb-3">Para: {nomeLead}</p>}

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 mb-4">
        <p className="text-sm font-semibold text-emerald-300">Agendamento criado! Deseja cobrar agora?</p>
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
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-white/15 text-white/60 hover:bg-white/5 transition-colors"
        >
          Cobrar depois — apenas confirmar agendamento
        </button>
      </div>
    </div>
  );
}

// ── Step: aguardando (PIX mock — compartilhado entre Vendas/Agenda) ──
// Espelha o step 'aguardando' (caminho PIX) do CheckoutFlow real:
// coluna de info/Copia-e-Cola + coluna de QR Code. Aqui colapsado em
// 1 coluna por ser modal menor, mas mantém os mesmos elementos.

function StepAguardandoMock({
  precoFormatado,
  pixCodeFake,
  pixCopied,
  confirmando,
  onCopiar,
  onJaPaguei,
  onVoltar,
}: {
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
        Demonstração — Pague com PIX
      </p>

      <div className="bg-white p-3 rounded-xl mx-auto mb-3" style={{ maxWidth: 200 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qrcode.png" alt="QR Code PIX (simulação)" className="w-full h-full object-contain" />
      </div>

      <p className="text-center text-2xl font-bold text-white mb-3">{precoFormatado}</p>

      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 mb-2">
        <p className="text-[10px] font-mono text-white/40 truncate">{pixCodeFake.slice(0, 40)}...</p>
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
        className="w-full flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Voltar
      </button>
    </div>
  );
}

// ── Step: confirmado (compartilhado) ───────────────────────────────

function StepConfirmadoMock({
  info,
  produto,
  precoFormatado,
  nomeLead,
  onClose,
}: {
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
          <p className="text-xl font-bold text-white mb-1">Pagamento confirmado!</p>
          {nomeLead && <p className="text-sm text-white/50 mb-2">Obrigado, {nomeLead}!</p>}
          <p className="text-lg font-bold text-emerald-400 mb-1">{precoFormatado}</p>
          <p className="text-sm text-white/40">{produto}</p>
        </>
      ) : (
        <>
          <p className="text-xl font-bold text-white mb-1">Agendamento confirmado!</p>
          {nomeLead && <p className="text-sm text-white/50 mb-2">Para: {nomeLead}</p>}
          <p className="text-sm text-white/80 mb-1">{produto}</p>
          {info.horario && <p className="text-sm text-emerald-400 font-semibold">{info.horario}</p>}
        </>
      )}

      <p className="text-xs text-white/30 mt-4 mb-4">
        Em um assistente real, isto seria processado automaticamente.
      </p>

      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}