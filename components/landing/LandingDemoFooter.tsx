'use client';

// components/landing/LandingDemoFooter.tsx
// Usa o ActionModals REAL com dados mockados — mostra o visual exato da função.
// Funções que executariam ações reais (PIX, NFC, TEF, email, SMS, etc.)
// recebem um overlay "Modo Demo" por cima que bloqueia a ação e convida ao cadastro.

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import CategoryCarousel from '@/components/assistant/CategoryCarousel';
import { ActionModals } from '@/components/assistant/VoiceAssistant/ActionModals';

interface LandingDemoFooterProps {
  theme?: 'dark' | 'light';
}

// ── Funções que executam ações reais — recebem overlay de demo ────────────────
// Critério: fazem chamada de API externa, enviam dados, movem dinheiro ou
// dependem de configuração da empresa (token, chave PIX, etc.)
const BLOCKED_FUNCTIONS = new Set([
  // Pagamentos reais
  'pix_generate', 'pix_confirm', 'pix_cancel',
  'nfc_credito', 'nfc_debito',
  'tef_credito', 'tef_debito',
  'link_pagamento',
  // Comunicação — enviam mensagens de verdade
  'enviar_email', 'enviar_sms',
  'chamar_gerente',
  // Consultas pagas (Quod, DETRAN, etc.)
  'restricoes_cpf', 'restricoes_cnpj', 'consultar_leilao',
  'consultar_cpf', 'consultar_cnpj', 'consultar_placa',
  'consultar_ddd', 'consultar_feriados', 'consultar_cambio',
  // Agenda — escreveria no Google Calendar real
  'agendar_compromisso', 'cancelar_agendamento', 'reagendar_compromisso',
  'confirmar_presenca', 'horarios_disponiveis', 'ver_agenda',
  // Impressão — acionaria impressora real
  'impressao_remota', 'impressao_recibo', 'impressao_local',
  // Fila — escreveria no banco de dados real
  'fila_atendimento', 'gerar_senha', 'chamar_proxima_senha',
  'finalizar_atendimento', 'pausar_fila', 'retomar_fila', 'cancelar_senha',
  // Cadastro — escreveria dados no banco
  'cadastro', 'minha_conta',
  // Vendas — depende de estoque/produto configurado
  'registrar_venda', 'fechar_caixa', 'trocar_turno', 'fazer_pedido',
  // Smart home — controlaria dispositivos reais
  'aparelhos_smart',
  // Vídeo chamada — iniciaria chamada real
  'solicitar_video_chamada',
]);

// ── Mock data por função — o que passar para o modal real abrir corretamente ──
// Funções de QR Code (QRCodeDisplay) precisam de: type, value, label
// Funções de busca precisam de: query pré-preenchida
// Funções de mídia precisam de: url configurada
const MOCK_DATA: Record<string, any> = {
  // QR Codes de contato — usa dados reais do minhAi como demo
  'qrcode_whatsapp':  { type: 'whatsapp',  value: '5511987311425',           label: 'WhatsApp minhAi',     companyId: 'demo' },
  'qrcode_instagram': { type: 'instagram', value: 'bigcorps',                label: 'Instagram @bigcorps', companyId: 'demo' },
  'qrcode_website':   { type: 'website',   value: 'https://www.minhai.app',  label: 'Site minhAi',         companyId: 'demo' },
  'qrcode_email':     { type: 'email',     value: 'contato@bigcorps.com.br', label: 'Email BigCorps',      companyId: 'demo' },
  'qrcode_facebook':  { type: 'facebook',  value: 'bigcorps',                label: 'Facebook BigCorps',   companyId: 'demo' },
  'qrcode_linkedin':  { type: 'linkedin',  value: 'bigcorps',                label: 'LinkedIn BigCorps',   companyId: 'demo' },
  'qrcode_twitter':   { type: 'twitter',   value: 'bigcorpsbr',              label: 'Twitter @bigcorpsbr', companyId: 'demo' },
  'qrcode_tiktok':    { type: 'tiktok',    value: 'bigcorps',                label: 'TikTok BigCorps',     companyId: 'demo' },
  'qrcode_telefone':  { type: 'phone',     value: '5511987311425',           label: 'Telefone minhAi',     companyId: 'demo' },

  // QR Code do Wi-Fi — dados fictícios para demo
  'wifi_qrcode': { companyId: 'demo', networkName: 'minhAi-Demo', networkPassword: 'minhai2026' },

  // Nosso QR Code customizado
  'nosso_qrcode': { companyId: 'demo', qrContent: 'https://www.minhai.app', qrLabel: 'Acesse o minhAi!' },

  // Vídeos — canal do YouTube do minhAi/BigCorps
  'canal_youtube':    { companyId: 'demo', youtubeChannelUrl: 'https://www.youtube.com/@bigcorps', youtubeChannelName: 'BigCorps', youtubeChannelDescription: 'Canal oficial da BigCorps' },
  'tocar_video':      { companyId: 'demo', query: 'minhAi assistente IA' },
  'tocar_musica':     { companyId: 'demo', query: 'música ambiente trabalho' },
  'video_instrucoes': { companyId: 'demo', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  'sequencia_videos': { companyId: 'demo', videos: [] },
  'playlist':         { companyId: 'demo', playlistUrl: '' },
  'porta_retrato':    { companyId: 'demo', photos: [] },
  'painel_ofertas':   { companyId: 'demo', imagens: [] },

  // Cardápio
  'cardapio': { companyId: 'demo', cardapioUrl: 'https://www.minhai.app', cardapioDescription: 'Demonstração do cardápio digital' },

  // Clima — cidade padrão São Paulo
  'clima_tempo': { companyId: 'demo', city: 'São Paulo' },

  // Notícias
  'ver_noticias': { companyId: 'demo' },

  // Relógio mundial
  'relogio_mundial': { companyId: 'demo' },

  // Endereço do minhAi
  'endereco': { companyId: 'demo', address: 'Avenida Paulista, São Paulo, SP' },
  'buscar_endereco': { companyId: 'demo', query: 'Avenida Paulista, São Paulo' },
  'tracar_rota': { companyId: 'demo', destination: 'Avenida Paulista, São Paulo' },
  'consultar_cep': { companyId: 'demo', cep: '01310-100' },
  'rastreio_correios': { companyId: 'demo', code: 'AA123456789BR' },

  // Gerar QR Code / Código de barras — conteúdo exemplo
  'gerar_qrcode':        { companyId: 'demo', content: 'https://www.minhai.app' },
  'gerar_codigo_barras': { companyId: 'demo', content: '7891234567890', format: 'EAN-13' },

  // Câmera / leitura
  'ler_qrcode':       { companyId: 'demo' },
  'ler_codigo_barras': { companyId: 'demo' },
  'imagem_em_texto':  { companyId: 'demo' },
  'tabela_em_texto':  { companyId: 'demo' },
  'contrato_em_texto': { companyId: 'demo' },
  'identificar_fraude': { companyId: 'demo' },
  'enviar_arquivo':   { companyId: 'demo' },

  // Imagens
  'editar_imagem':   { companyId: 'demo' },
  'remover_fundo':   { companyId: 'demo' },
  'duplicar_imagem': { companyId: 'demo' },
  'converter_arquivo': { companyId: 'demo' },
  'juntar_pdfs':     { companyId: 'demo' },
  'analisar_planilha': { companyId: 'demo' },

  // IA
  'chatgpt':         { companyId: 'demo', prompt: 'O que é o minhAi?' },
  'traduzir_texto':  { companyId: 'demo', text: 'Olá! Como posso ajudar você hoje?' },
  'transcrever_audio': { companyId: 'demo' },
  'orcamento':       { companyId: 'demo' },
  'clima_tempo':     { companyId: 'demo', city: 'São Paulo' },

  // Utilitários
  'criar_lembrete':    { companyId: 'demo' },
  'alarme':            { companyId: 'demo' },
  'temporizador':      { companyId: 'demo' },
  'cronometro':        { companyId: 'demo' },
  'relogio_mundial':   { companyId: 'demo' },
  'criar_nota':        { companyId: 'demo' },
  'lista_compras':     { companyId: 'demo' },
  'lembrete_remedios': { companyId: 'demo' },
  'segunda_via_boleto': { companyId: 'demo' },
  'procurar_produto':  { companyId: 'demo', query: 'notebook' },
  'calculadora_imc':   { companyId: 'demo' },
  'calculadora_juros': { companyId: 'demo' },
  'converter_medidas': { companyId: 'demo' },

  // Cadastro / login — abrem formulário visual sem salvar
  'minha_conta':    { companyId: 'demo' },
  'meu_cupom':      { companyId: 'demo', benefit: 'Ganhe 20 créditos grátis!' },
  'login_cliente':  { companyId: 'demo' },

  // Pesquisa e avaliação
  'responder_pesquisa': { companyId: 'demo' },
  'pre_atendimento':    { companyId: 'demo' },

  // Fila — visual sem executar
  'gerar_senha': { companyId: 'demo' },
};

// Fallback genérico para funções sem mock específico
const DEFAULT_MOCK = { companyId: 'demo' };

// ── Cache de funções do banco ─────────────────────────────────────────────────
let functionCache: Map<string, any> = new Map();

// ── Overlay de Demo ───────────────────────────────────────────────────────────
// Aparece por cima do modal real para funções bloqueadas
function DemoOverlay({ onClose, theme }: { onClose: () => void; theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center pb-24"
      onClick={onClose}
    >
      {/* Fundo semi-transparente — deixa o modal real visível por baixo */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />

      {/* Card do overlay */}
      <div
        className={`relative w-full max-w-sm mx-4 rounded-3xl p-6 shadow-2xl border ${
          isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
        }`}
        style={{ animation: 'overlayIn 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Modo demonstração
            </p>
            <p className={`text-xs leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Esta função executa uma ação real. Crie sua conta grátis para ativá-la com os dados do seu negócio.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full py-3 bg-[#A4C61E] text-white rounded-2xl font-bold text-sm text-center hover:brightness-110 transition-all"
          >
            Criar minha conta grátis →
          </Link>
          <button
            onClick={onClose}
            className={`text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Continuar explorando
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes overlayIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function LandingDemoFooter({ theme = 'dark' }: LandingDemoFooterProps) {
  const [activeModal, setActiveModal] = useState<{ type: string; data: any } | null>(null);
  const [showDemoOverlay, setShowDemoOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Ouvir evento de cache de funções emitido pelo CategoryCarousel
  useEffect(() => {
    const handleFunctionsLoaded = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) {
        functionCache = new Map(e.detail.map((fn: any) => [fn.function_key, fn]));
      }
    };
    window.addEventListener('eai:functionsLoaded', handleFunctionsLoaded as EventListener);
    return () => window.removeEventListener('eai:functionsLoaded', handleFunctionsLoaded as EventListener);
  }, []);

  const handleFunctionClick = (functionKey: string) => {
    const fn = functionCache.get(functionKey);
    const uiComponent = fn?.ui_component;

    // Se não tem componente de UI, não tem o que mostrar
    if (!uiComponent) return;

    // Monta o modal com dados mockados
    const mockData = MOCK_DATA[functionKey] ?? DEFAULT_MOCK;
    setActiveModal({ type: uiComponent, data: mockData });

    // Se é função bloqueada, mostra overlay por cima
    if (BLOCKED_FUNCTIONS.has(functionKey)) {
      // Pequeno delay para o modal abrir primeiro
      setTimeout(() => setShowDemoOverlay(true), 150);
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    setShowDemoOverlay(false);
  };

  const isDark = theme === 'dark';

  if (!mounted) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[50] flex flex-col">

        {/* Carrossel de Funções */}
        <div className={`w-full border-t backdrop-blur-xl ${
          isDark ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-slate-200'
        }`}>
          <CategoryCarousel
            companyId="demo"
            onFunctionClick={handleFunctionClick}
            theme={theme}
            autoScroll={true}
          />
        </div>

        {/* Barra inferior — só frase centralizada */}
        <div className={`h-7 border-t backdrop-blur-xl flex items-center justify-center ${
          isDark ? 'bg-slate-950/90 border-white/5' : 'bg-slate-50/90 border-slate-200'
        }`}>
          <span className={`text-[10px] font-medium tracking-wide ${
            isDark ? 'text-white/25' : 'text-slate-400'
          }`}>
            minhAi.app — Uma IA pra chamar de sua!
          </span>
        </div>
      </div>

      {/* Modal real da função com dados mockados */}
      <ActionModals
        activeModal={activeModal}
        onClose={handleClose}
        theme={theme}
        playText={async () => {}} // TTS desabilitado na demo
        onConfirmPix={() => {}}
        onCancelPix={() => {}}
      />

      {/* Overlay de demo — aparece por cima do modal para funções bloqueadas */}
      {showDemoOverlay && activeModal && (
        <DemoOverlay onClose={handleClose} theme={theme} />
      )}
    </>
  );
}
