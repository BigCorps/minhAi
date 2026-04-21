// ============================================================
// handlers/voiceCommandDetector.ts
// Caminho: components/assistant/VoiceAssistant/handlers/voiceCommandDetector.ts
// ============================================================

import { FunctionSettings, PixConfirmationData, QRCodeData, ActiveModal } from '../types';
import { convertWordsToNumbers, correctTranscriptionErrors } from '../utils/textUtils';
import { checkIfFunctionIsEnabled, registerFunctionUsage } from './functionUsage';
import { handleQRCodeCommand } from './qrcodeHandlers';
import { handlePixCommand, handleConfirmPix, handleCancelPix } from './pixHandlers';
import {
  handleNossaMarcaCommand,
  handleEnderecoCommand,
  handleLerQRCode,
  handleLerCodigoBarras,
  handleValidarCupom,
  handleImagemEmTexto,
  handleTabelaEmTexto,
  handleContratoEmTexto,
} from './companyHandlers';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { getFunctionByKey } from '@/lib/functions-registry';
import { handleCriarLembrete, handleCronometro, handleTemporizador, handleRelogioMundial, handleAlarme } from './utilitiesHandlers';
import { handleWifiQRCode, handleCardapio, handleCanalYoutube, handleCadastro, handleNossoQRCode } from './companyHandlers';
import { getContextualRoute } from '@/lib/routing-utils';

// ── Interface de dependências ─────────────────────────────────
interface DetectorDeps {
  companyId: string;
  slug?: string;               // ← ADICIONADO para roteamento contextual
  functionSettings: FunctionSettings;
  setIsProcessing: (v: boolean) => void;
  setQrCodeData: (data: QRCodeData | null) => void;
  setPixConfirmationData: (data: PixConfirmationData | null) => void;
  playText: (text: string) => Promise<void>;
  sessionId: string | null;
  groqContextRef: React.MutableRefObject<string>;
  commandProcessor: VoiceCommandProcessor | null;
  pixStateRef: React.MutableRefObject<{ qrCodeData: any; pixConfirmationData: any } | null>;
  setActiveModal: (modal: ActiveModal | null) => void;
  activeFunctionContextRef: React.MutableRefObject<any>;
  fromGroq?: boolean;
}

// ── Helper: parsear view/data do transcript de agenda ────────
function parseAgendaRequest(transcript: string): {
  view: 'month' | 'week' | 'day';
  date?: string;
} {
  const t = transcript.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const MESES: Record<string, number> = {
    janeiro: 0, fevereiro: 1, marco: 2, abril: 3,
    maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8,
    outubro: 9, novembro: 10, dezembro: 11,
  };
  const SEMANAS = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta'];

  let view: 'month' | 'week' | 'day' = 'month';
  let date = new Date();

  if (t.includes('semana')) view = 'week';
  if (t.includes('dia') || t.includes('hoje') || t.includes('amanha')) view = 'day';

  for (const [nome, idx] of Object.entries(MESES)) {
    if (t.includes(nome)) { date.setMonth(idx); break; }
  }

  const diaMatch = t.match(/\bdia\s+(\d{1,2})\b/);
  if (diaMatch) { date.setDate(parseInt(diaMatch[1])); view = 'day'; }

  if (t.includes('hoje')) { date = new Date(); view = 'day'; }

  if (t.includes('amanha')) {
    date = new Date();
    date.setDate(date.getDate() + 1);
    view = 'day';
  }

  for (let i = 0; i < SEMANAS.length; i++) {
    if (t.includes(SEMANAS[i]) && t.includes('semana')) {
      date.setDate(1 + i * 7);
      view = 'week';
      break;
    }
  }

  return { view, date: date.toISOString().split('T')[0] };
}

export async function detectVoiceCommand(
  transcript: string,
  deps: DetectorDeps
): Promise<boolean> {
  console.log(`🔍 detectVoiceCommand — fromGroq: ${deps.fromGroq}, transcript: "${transcript}"`);

  const {
    companyId,
    slug,
    functionSettings,
    setIsProcessing,
    setQrCodeData,
    setPixConfirmationData,
    playText,
    sessionId,
    commandProcessor,
    pixStateRef,
    setActiveModal,
    activeFunctionContextRef,
    fromGroq,
  } = deps;

  const correctedTranscript = correctTranscriptionErrors(transcript);
  const lowerTranscript = correctedTranscript.toLowerCase().trim();
  const transcriptWithNumbers = convertWordsToNumbers(lowerTranscript);

  // ── Cadastro ──────────────────────────────────────────────
  const cadastroTriggers = [
    'fazer cadastro', 'fazer o cadastro', 'novo cadastro',
    'cadastrar', 'cadastrar cliente', 'cadastrar funcionario',
    'cadastrar funcionário', 'cadastrar morador', 'cadastrar empresa',
    'iniciar cadastro', 'quero me cadastrar',
  ];
  if (cadastroTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'cadastro');
    if (!isEnabled) { await playText('A função de cadastro está desativada.'); return true; }
    await handleCadastro({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'cadastro', 1);
    return true;
  }

  // ── Vendas — navega para a página de vendas ───────────────
  const modoVendaTriggers = [
    'modo venda', 'modo de venda', 'abrir loja', 'abrir modo venda',
    'quero comprar', 'comprar agora', 'escolher produtos', 'fazer pedido',
  ];
  if (modoVendaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'modo_venda');
    if (!isEnabled) { await playText('A função de vendas está desativada.'); return true; }
    const vendaUrl = getContextualRoute('vendas', slug);
    window.location.href = vendaUrl;
    playText('Abrindo modo vendas!').catch(() => {});
    await registerFunctionUsage(companyId, 'modo_venda', 0);
    return true;
  }

  // ── Ver Produtos — navega para vendas com busca ───────────
  const verProdutosTriggers = [
    'ver produtos', 'mostrar produtos', 'ver o cardápio', 'ver o catalogo',
    'o que vocês vendem', 'o que voces vendem', 'tem', 'você tem', 'voce tem',
  ];
  const verProdutosMatch =
    verProdutosTriggers.slice(0, 5).some(t => lowerTranscript.includes(t)) ||
    (lowerTranscript.startsWith('tem ') && lowerTranscript.length > 6) ||
    (lowerTranscript.includes('você tem ') || lowerTranscript.includes('voce tem '));

  if (verProdutosMatch) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'ver_produtos');
    if (!isEnabled) { await playText('A função de produtos está desativada.'); return true; }
    const termoBusca = lowerTranscript
      .replace(/tem |você tem |voce tem |ver produtos?|mostrar produtos?/gi, '')
      .trim();
    const vendaUrl = getContextualRoute('vendas', slug);
    const url = termoBusca ? `${vendaUrl}?busca=${encodeURIComponent(termoBusca)}` : vendaUrl;
    window.location.href = url;
    playText(termoBusca ? `Buscando ${termoBusca}...` : 'Abrindo catálogo de produtos.').catch(() => {});
    await registerFunctionUsage(companyId, 'ver_produtos', 0);
    return true;
  }

  // ── Consultar Estoque ─────────────────────────────────────
  const consultarEstoqueTriggers = [
    'estoque de', 'quantos tem', 'quanto tem', 'verificar estoque', 'consultar estoque',
    'quantos restam', 'quanto resta', 'tem em estoque',
  ];
  if (consultarEstoqueTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'consultar_estoque');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    const fn = (await import('@/lib/functions-registry')).getFunctionByKey('consultar_estoque');
    if (fn?.handler) {
      await fn.handler({
        transcript: lowerTranscript,
        companyId,
        functionSettings,
        playText,
        setIsProcessing,
        sessionId,
        setActiveModal,
      });
    }
    await registerFunctionUsage(companyId, 'consultar_estoque', 0);
    return true;
  }

  // ── QR Codes ──────────────────────────────────────────────
  const qrcodeTypes: Array<{ triggers: string[]; key: string }> = [
    { triggers: ['whatsapp', 'whats', 'zap', 'número', 'contato'], key: 'qrcode_whatsapp' },
    { triggers: ['instagram', 'insta', 'arroba', 'perfil'], key: 'qrcode_instagram' },
    { triggers: ['site', 'website', 'nosso site', 'página', 'pagina', 'url'], key: 'qrcode_website' },
    { triggers: ['facebook', 'face', 'fb'], key: 'qrcode_facebook' },
    { triggers: ['qual o email', 'qual o e-mail'], key: 'qrcode_email' },
    { triggers: ['linkedin', 'linked in'], key: 'qrcode_linkedin' },
    { triggers: ['tiktok', 'tik tok'], key: 'qrcode_tiktok' },
    { triggers: ['twitter', 'nosso x'], key: 'qrcode_twitter' },
    { triggers: ['telefone fixo', 'nosso telefone', 'número de telefone'], key: 'qrcode_telefone' },
  ];

  for (const { triggers, key } of qrcodeTypes) {
    if (triggers.some(t => lowerTranscript.includes(t))) {
      const isEnabled = await checkIfFunctionIsEnabled(companyId, key);
      if (!isEnabled) { await playText('A função está desativada no momento.'); return true; }
      const qrType = key.replace('qrcode_', '');
      await handleQRCodeCommand(qrType, { companyId, setIsProcessing, setQrCodeData, playText });
      await registerFunctionUsage(companyId, key, functionSettings[key]?.creditsPerUse ?? 0);
      return true;
    }
  }

  // ── Criar Lembrete ────────────────────────────────────────
  const criarLembreteTriggers = [
    'criar lembrete', 'me lembra', 'me lembre', 'lembrar de',
    'não me deixa esquecer', 'novo lembrete', 'quero um lembrete',
  ];
  if (criarLembreteTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'criar_lembrete');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleCriarLembrete({ companyId, setIsProcessing, setActiveModal, playText, transcript: correctedTranscript });
    await registerFunctionUsage(companyId, 'criar_lembrete', functionSettings['criar_lembrete']?.creditsPerUse ?? 1);
    return true;
  }

  // ── Wi-Fi QR Code ─────────────────────────────────────────
  const wifiTriggers = [
    'wifi', 'wi-fi', 'senha do wifi', 'senha do wi-fi',
    'conectar wifi', 'conectar wi-fi', 'rede wifi', 'rede wi-fi',
  ];
  if (wifiTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'wifi_qrcode');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleWifiQRCode({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'wifi_qrcode', 1);
    return true;
  }

  // ── Cardápio ──────────────────────────────────────────────
  const cardapioTriggers = [
    'cardapio', 'cardápio', 'menu', 'ver cardapio', 'ver cardápio',
    'mostrar cardapio', 'abrir cardapio', 'cardapio digital',
  ];
  if (cardapioTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'cardapio');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleCardapio({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'cardapio', 1);
    return true;
  }

  // ── Canal do YouTube ──────────────────────────────────────
  const canalYoutubeTriggers = [
    'youtube', 'canal do youtube', 'canal youtube', 'nosso canal',
    'ver canal', 'abrir youtube', 'inscrever', 'se inscreva', 'se inscrever',
  ];
  if (canalYoutubeTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'canal_youtube');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleCanalYoutube({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'canal_youtube', 1);
    return true;
  }

  // ── Nosso QR Code ─────────────────────────────────────────
  const qrcodeTriggers = [
    'nosso qr code', 'nosso qrcode', 'meu qr code',
    'meu qrcode', 'mostrar qr code', 'mostrar qrcode',
  ];
  if (qrcodeTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'nosso_qrcode');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleNossoQRCode({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'nosso_qrcode', 1);
    return true;
  }

  // ── Ler QR Code ───────────────────────────────────────────
  const qrTriggers = [
    'ler qr code', 'ler qr', 'escanear qr',
    'escanear qrcode', 'ler codigo qr', 'ler qrcode',
  ];
  if (qrTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'ler_qrcode');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleLerQRCode({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'ler_qrcode', 1);
    return true;
  }

  // ── Ler Código de Barras ──────────────────────────────────
  const barcodeTriggers = [
    'ler codigo de barras', 'ler código de barras',
    'escanear codigo de barras', 'escanear código de barras', 'ler barcode',
  ];
  if (barcodeTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'ler_codigo_barras');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleLerCodigoBarras({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'ler_codigo_barras', 1);
    return true;
  }

  // ── Parar Música ──────────────────────────────────────────
  const pararMusicaTriggers = [
    'parar musica', 'parar música', 'pausa musica', 'pausa música',
    'para musica', 'para música', 'silencio', 'silêncio',
    'fechar musica', 'fechar música',
  ];
  if (pararMusicaTriggers.some(t => lowerTranscript.includes(t))) {
    setActiveModal(null);
    await playText('Música pausada.');
    return true;
  }

  // ── Tocar Música ──────────────────────────────────────────
  const tocarMusicaTriggers = [
    'tocar musica', 'tocar música', 'ouvir musica', 'ouvir música',
    'reproduzir musica', 'reproduzir música', 'quero ouvir', 'quero escutar',
    'coloca uma musica', 'coloca uma música', 'toca uma musica', 'toca uma música',
  ];
  if (tocarMusicaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'tocar_musica');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    const queryMatch = lowerTranscript.match(
      /(?:tocar|reproduzir|ouvir|escutar|coloca|toca)\s+(?:uma\s+)?(?:musica|música)\s+(?:de|do|da|sobre)?\s*(.+)/i
    ) || lowerTranscript.match(/(?:quero ouvir|quero escutar)\s+(.+)/i);
    const query = queryMatch ? queryMatch[1].trim() : '';
    setActiveModal({ type: 'TocarMusicaDisplay', data: { companyId, query } });
    playText(query ? 'Buscando música...' : 'Qual música você quer ouvir?').catch(() => {});
    await registerFunctionUsage(companyId, 'tocar_musica', 1);
    return true;
  }

  // ── Validar Cupom ─────────────────────────────────────────
  const cupomTriggers = [
    'validar cupom', 'valida cupom', 'validar voucher',
    'verifica cupom', 'verificar cupom',
  ];
  if (cupomTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'validar_cupom');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleValidarCupom({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'validar_cupom', 2);
    return true;
  }

  // ── Imagem em Texto ───────────────────────────────────────
  const ocrTriggers = [
    'imagem em texto', 'extrair texto', 'digitalizar imagem',
    'texto da imagem', 'extraia texto',
  ];
  if (ocrTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'imagem_em_texto');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleImagemEmTexto({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'imagem_em_texto', 3);
    return true;
  }

  // ── Tabela em Texto ───────────────────────────────────────
  const tabelaTriggers = [
    'tabela em texto', 'converter tabela', 'digitalizar tabela',
    'tabela para csv', 'extrair tabela',
  ];
  if (tabelaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'tabela_em_texto');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleTabelaEmTexto({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'tabela_em_texto', 3);
    return true;
  }

  // ── Contrato em Texto ─────────────────────────────────────
  const contratoTriggers = [
    'contrato em texto', 'digitalizar contrato', 'digitaliza contrato',
    'extrair contrato', 'ler contrato',
  ];
  if (contratoTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'contrato_em_texto');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    await handleContratoEmTexto({ companyId, setIsProcessing, setActiveModal: deps.setActiveModal, playText });
    await registerFunctionUsage(companyId, 'contrato_em_texto', 5);
    return true;
  }

  // ── Finalizar Cronômetro ──────────────────────────────────
  const finalizarCronometroTriggers = [
    'finalizar cronômetro', 'parar cronômetro',
    'parar contagem', 'finalizar contagem', 'stop cronômetro',
  ];
  if (finalizarCronometroTriggers.some(t => lowerTranscript.includes(t))) {
    window.dispatchEvent(new Event('eai:cronometro:stop'));
    return true;
  }

  // ── Cronômetro (iniciar) ──────────────────────────────────
  const cronometroTriggers = [
    'iniciar cronômetro', 'começar cronômetro', 'comecar cronometro',
    'ligar cronômetro', 'iniciar contagem', 'começar contagem',
  ];
  if (cronometroTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'cronometro');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleCronometro({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'cronometro', functionSettings['cronometro']?.creditsPerUse ?? 1);
    return true;
  }

  // ── Temporizador ──────────────────────────────────────────
  const temporizadorTriggers = ['temporizador', 'contagem regressiva', 'colocar timer'];
  const hasTimerContext = lowerTranscript.includes('timer') &&
    (lowerTranscript.includes('minuto') || lowerTranscript.includes('segundo') || lowerTranscript.includes('hora'));
  if (temporizadorTriggers.some(t => lowerTranscript.includes(t)) || hasTimerContext) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'temporizador');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleTemporizador({ companyId, setIsProcessing, setActiveModal, playText, transcript: correctedTranscript });
    await registerFunctionUsage(companyId, 'temporizador', functionSettings['temporizador']?.creditsPerUse ?? 1);
    return true;
  }

  // ── Relógio Mundial ───────────────────────────────────────
  const relogioMundialTriggers = [
    'relógio mundial', 'relogio mundial', 'horas no mundo', 'horário mundial',
    'horas internacionais', 'fuso horário', 'fusos horários',
    'horário em outros países', 'que horas são no mundo',
  ];
  if (relogioMundialTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'relogio_mundial');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleRelogioMundial({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'relogio_mundial', functionSettings['relogio_mundial']?.creditsPerUse ?? 1);
    return true;
  }

  // ── Alarme ────────────────────────────────────────────────
  const alarmeTriggers = [
    'criar alarme', 'definir alarme', 'colocar alarme',
    'setar alarme', 'me acorda', 'acordar às', 'acordar as',
  ];
  if (
    alarmeTriggers.some(t => lowerTranscript.includes(t)) ||
    (lowerTranscript.includes('alarme') &&
      (lowerTranscript.includes('para as') || lowerTranscript.includes('às') || lowerTranscript.includes('as ')))
  ) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'alarme');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleAlarme({ companyId, setIsProcessing, setActiveModal, playText, transcript: correctedTranscript });
    await registerFunctionUsage(companyId, 'alarme', functionSettings['alarme']?.creditsPerUse ?? 1);
    return true;
  }

  // ── Ver Agenda ────────────────────────────────────────────
  const verAgendaTriggers = [
    'ver agenda', 'abrir agenda', 'minha agenda',
    'ver calendario', 'ver calendário', 'abrir calendario',
  ];
  if (verAgendaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'ver_agenda');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    const { view, date } = parseAgendaRequest(lowerTranscript);
    setActiveModal({
      type: 'ViewAgendaModal',
      data: { companyId, initialView: view, initialDate: date },
    });
    playText(`Abrindo ${view === 'month' ? 'o mês' : view === 'week' ? 'a semana' : 'o dia'} na agenda.`).catch(() => {});
    await registerFunctionUsage(companyId, 'ver_agenda', functionSettings['ver_agenda']?.creditsPerUse ?? 0);
    return true;
  }

  // ── AGENDA: Confirmar evento ──────────────────────────────
  const confirmarEventoTriggers = [
    'confirmar marcação', 'confirmar agenda', 'confirmar evento', 'confirmar compromisso',
    'confirmar reunião', 'confirma reunião', 'confirma evento', 'confirma marcação',
    'está correto', 'tá correto', 'está certo', 'tá certo', 'confirma', 'confirmar',
    'pode marcar', 'marcar esse', 'marque esse', 'agendar esse', 'agende',
    'pode agendar', 'sim confirmar', 'sim pode marcar', 'correto pode marcar',
    'ok marcar', 'ok confirmar',
  ];
  if (confirmarEventoTriggers.some(t => lowerTranscript.includes(t))) {
    const createEventModal =
      document.querySelector('[data-modal-type="create-event"]') ||
      document.querySelector('[data-modal="create-event"]');
    if (createEventModal) {
      window.dispatchEvent(new CustomEvent('confirmCreateEvent', {
        detail: { trigger: 'voice', transcript: lowerTranscript },
      }));
      await playText('Confirmado! Criando o evento no calendário...');
      return true;
    }
  }

  // ── EMAIL: Confirmar envio ────────────────────────────────
  const confirmarEmailTriggers = [
    'confirmar envio', 'confirmar email', 'confirma email', 'enviar agora',
    'pode enviar', 'pode mandar', 'envia', 'manda', 'enviar esse', 'mandar esse',
    'sim enviar', 'sim pode enviar', 'ok enviar', 'ok mandar',
    'confirma envio', 'confirmar esse email',
  ];
  if (confirmarEmailTriggers.some(t => lowerTranscript.includes(t))) {
    const emailModal =
      document.querySelector('[data-modal-type="send-email"]') ||
      document.querySelector('[data-modal="send-email"]');
    if (emailModal) {
      window.dispatchEvent(new CustomEvent('confirmSendEmail', {
        detail: { trigger: 'voice', transcript: lowerTranscript },
      }));
      await playText('Enviando email...');
      return true;
    }
  }

  // ── Nossa Marca ───────────────────────────────────────────
  const nossaMarcaTriggers = [
    'nossa marca', 'sobre nós', 'sobre nos', 'quem somos', 'nossa empresa',
  ];
  if (nossaMarcaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'nossa_marca');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleNossaMarcaCommand({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'nossa_marca', functionSettings['nossa_marca']?.creditsPerUse ?? 0);
    return true;
  }

  // ── Endereço ──────────────────────────────────────────────
  const enderecoTriggers = [
    'qual o endereço', 'endereço de vocês', 'onde fica',
    'localização', 'localizacao', 'como chegar',
  ];
  if (enderecoTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'endereco');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleEnderecoCommand({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'endereco', functionSettings['endereco']?.creditsPerUse ?? 0);
    return true;
  }

  // ── Meu Sistema ───────────────────────────────────────────
  const meuSistemaTriggers = ['meu sistema', 'sobre o sistema', 'como funciona'];
  if (meuSistemaTriggers.some(t => lowerTranscript.includes(t))) {
    setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
    playText('Sou min I A, uma IA pra chamar de sua! Um funcionário de Voz e texto com Inteligência Artificial. Escaneie o QR Code para saber mais. minhai.app').catch(() => {});
    return true;
  }

  // ── Clima e Tempo ─────────────────────────────────────────
  const climaTriggers = [
    'clima', 'tempo', 'temperatura', 'previsao do tempo', 'previsão do tempo',
    'vai chover', 'vai fazer sol', 'como esta o tempo', 'como está o tempo',
    'que tempo faz', 'tempo em', 'clima em',
  ];
  if (climaTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'clima_tempo');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    const cityMatch = lowerTranscript.match(
      /(?:tempo em|clima em|temperatura em|previsao em|previsão em)\s+([a-záéíóúãõâêîôûç\s]+)/i
    );
    const city = cityMatch ? cityMatch[1].trim() : null;
    setActiveModal({ type: 'ClimaTempoDisplay', data: { companyId, city } });
    playText(city ? `Consultando o clima em ${city}...` : 'Consultando o clima agora...').catch(() => {});
    await registerFunctionUsage(companyId, 'clima_tempo', 0);
    return true;
  }

  // ── Tocar Vídeo ───────────────────────────────────────────
  const tocarVideoTriggers = [
    'tocar video', 'tocar vídeo', 'assistir video', 'assistir vídeo',
    'reproduzir video', 'reproduzir vídeo', 'buscar video', 'buscar vídeo',
    'me mostra um video', 'me mostra um vídeo', 'quero ver um video', 'quero ver um vídeo',
  ];
  if (tocarVideoTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'tocar_video');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    const queryMatch = lowerTranscript.match(
      /(?:tocar|assistir|reproduzir|buscar|ver|mostra|quero ver)\s+(?:video|vídeo)\s+(?:de|do|da|sobre)?\s*(.+)/i
    ) || lowerTranscript.match(
      /(?:me mostra|quero ver)\s+(?:um\s+)?(?:video|vídeo)\s+(?:de|do|da|sobre)?\s*(.+)/i
    );
    const query = queryMatch ? queryMatch[1].trim() : '';
    setActiveModal({ type: 'TocarVideoDisplay', data: { companyId, query } });
    playText(query ? `Buscando vídeo sobre ${query}...` : 'Qual vídeo você quer assistir? Me diga o assunto.').catch(() => {});
    await registerFunctionUsage(companyId, 'tocar_video', 1);
    return true;
  }

  // ── Playlist ──────────────────────────────────────────────
  const playlistTriggers = [
    'playlist', 'tocar playlist', 'minha playlist',
    'abrir playlist', 'lista de videos', 'lista de músicas', 'lista de musicas',
  ];
  if (playlistTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'playlist');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    setActiveModal({ type: 'PlaylistDisplay', data: { companyId } });
    playText('Abrindo playlist...').catch(() => {});
    await registerFunctionUsage(companyId, 'playlist', 1);
    return true;
  }

  // ── Porta Retrato ─────────────────────────────────────────
  const portaRetratoTriggers = [
    'porta retrato', 'mostrar fotos', 'album de fotos', 'álbum de fotos',
    'slideshow', 'mostrar álbum', 'mostrar album', 'exibir fotos',
  ];
  if (portaRetratoTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'porta_retrato');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    setActiveModal({ type: 'PortaRetratoDisplay', data: { companyId } });
    playText('Abrindo porta retrato...').catch(() => {});
    await registerFunctionUsage(companyId, 'porta_retrato', 1);
    return true;
  }

  // ── Painel de Ofertas ─────────────────────────────────────
  const painelOfertasTriggers = [
    'painel de ofertas', 'mostrar ofertas', 'promoções', 'promocoes',
    'ver ofertas', 'mostrar promoções', 'mostrar promocoes', 'painel ofertas',
  ];
  if (painelOfertasTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'painel_ofertas');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    setActiveModal({ type: 'PainelOfertasDisplay', data: { companyId } });
    playText('Abrindo painel de ofertas...').catch(() => {});
    await registerFunctionUsage(companyId, 'painel_ofertas', 1);
    return true;
  }

  // ── Aparelhos Smart ───────────────────────────────────────
  const smartTriggers = [
    'aparelhos smart', 'smart home', 'dispositivos smart', 'ligar luz', 'apagar luz',
    'ligar ar', 'desligar ar', 'controlar dispositivos', 'meus aparelhos',
    'aparelhos inteligentes', 'ligar televisão', 'ligar televisao',
    'desligar televisão', 'desligar televisao',
  ];
  if (smartTriggers.some(t => lowerTranscript.includes(t))) {
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'aparelhos_smart');
    if (!isEnabled) { await playText('Esta função está desativada.'); return true; }
    setActiveModal({ type: 'AparelhosSmartDisplay', data: { companyId, transcript: correctedTranscript } });
    playText('Abrindo controle de dispositivos...').catch(() => {});
    await registerFunctionUsage(companyId, 'aparelhos_smart', 1);
    return true;
  }

  // ── PIX: Confirmar ────────────────────────────────────────
  const confirmTriggers = ['confirmar', 'confirmado', 'paguei', 'já paguei', 'pagamento confirmado'];
  if (confirmTriggers.some(t => lowerTranscript.includes(t))) {
    const currentPixState = pixStateRef.current;
    if (currentPixState?.pixConfirmationData || currentPixState?.qrCodeData) {
      await handleConfirmPix(currentPixState.pixConfirmationData, {
        companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
      });
    } else {
      await playText('Não há nenhum PIX aberto para confirmar');
    }
    return true;
  }

  // ── PIX: Cancelar ─────────────────────────────────────────
  const cancelTriggers = ['cancelar', 'cancela', 'desistir', 'não quero', 'fechar'];
  if (cancelTriggers.some(t => lowerTranscript.includes(t)) && lowerTranscript.includes('pix')) {
    const currentPixState = pixStateRef.current;
    if (currentPixState?.pixConfirmationData || currentPixState?.qrCodeData) {
      await handleCancelPix(currentPixState.pixConfirmationData, {
        companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
      });
    } else {
      await playText('Não há nenhum PIX aberto');
    }
    return true;
  }

  // ── PIX: Gerar ────────────────────────────────────────────
  const pixPatterns = [
    /(?:gerar|gera|criar|cria|fazer|faz|faça|quero)\s*(?:um\s*|uma\s*)?(pix|cobrança|cobranca)\s*(?:de|com|no valor de)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    /(pix|cobrança|cobranca)\s*(?:de|com|no valor de)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    /(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?\s*(?:no|via|pelo|por)?\s*pix/i,
  ];

  for (const pattern of pixPatterns) {
    const match = transcriptWithNumbers.match(pattern);
    if (match) {
      let amountStr = match[2] || match[1];
      if (!amountStr) continue;
      amountStr = amountStr.replace(/[^\d,.]/, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      if (amount > 0 && amount < 100000) {
        const isEnabled = await checkIfFunctionIsEnabled(companyId, 'pix_generate');
        if (!isEnabled) { await playText('A função PIX está desativada no momento.'); return true; }
        await handlePixCommand(amount, {
          companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings,
        });
        await registerFunctionUsage(companyId, 'pix_generate', functionSettings['pix_generate']?.creditsPerUse ?? 0);
        return true;
      }
    }
  }

  if (lowerTranscript.includes('pix')) {
    await playText('Qual o valor do PIX que você deseja gerar?');
    return true;
  }

  // ── VoiceCommandProcessor ─────────────────────────────────
  if (commandProcessor) {
    const result = await commandProcessor.processCommand(transcript);

    if (result?.success || (fromGroq && result?.functionKey)) {
      const funcKey = result.functionKey || '';
      const registryFunc = getFunctionByKey(funcKey);

      if (registryFunc?.handler) {
        await registryFunc.handler({
          transcript: lowerTranscript,
          companyId,
          functionSettings,
          playText,
          setIsProcessing,
          sessionId,
          setActiveModal,
        });
      } else {
        if (result.speechText) await playText(result.speechText);
        if (result.modalData && result.modalType) {
          setActiveModal({ type: result.modalType, data: result.modalData });
        }
      }

      if (funcKey) {
        activeFunctionContextRef.current = {
          functionKey: funcKey,
          activatedAt: Date.now(),
          expiresIn: 5 * 60 * 1000,
        };
        await commandProcessor.registerUsage(funcKey);
      }

      return true;
    }
  }

  // ── GROQ: classificador de intenção como último recurso ───
  if (!fromGroq) {
    console.log('🤖 Consultando GROQ para classificação de intenção...');
    const { classifyIntentWithGroq } = await import('@/lib/groq-intent-classifier');
    const groqHandled = await classifyIntentWithGroq(transcript, {
      companyId,
      sessionId,
      functionSettings,
      playText,
      setIsProcessing,
      setActiveModal,
      sessionId,
      groqContextRef: deps.groqContextRef,
      commandProcessor,
      pixStateRef,
      setQrCodeData,
      setPixConfirmationData,
      activeFunctionContextRef,
    });
    if (groqHandled) return true;
  }

  console.log('❌ GROQ: intenção geral → GPT');

  if (commandProcessor) {
    commandProcessor.saveUnrecognizedHint(transcript);
  }

  return false;
}
