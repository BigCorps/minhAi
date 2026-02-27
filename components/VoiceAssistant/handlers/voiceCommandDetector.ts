// ============================================================
// handlers/voiceCommandDetector.ts
// Caminho: components/assistant/VoiceAssistant/handlers/voiceCommandDetector.ts
//
// CORREÇÃO: DetectorDeps usa setActiveModal (state unificado)
// ao invés de setMeuSistemaModalOpen / setNossaMarcaData / setEnderecoModalData.
// Novas funções: adicionar bloco de triggers ANTES do if (commandProcessor).
// ============================================================

import { FunctionSettings, PixConfirmationData, QRCodeData, ActiveModal } from '../types';
import { convertWordsToNumbers, correctTranscriptionErrors } from '../utils/textUtils';
import { checkIfFunctionIsEnabled, registerFunctionUsage } from './functionUsage';
import { handleQRCodeCommand } from './qrcodeHandlers';
import { handlePixCommand, handleConfirmPix, handleCancelPix } from './pixHandlers';
import { handleNossaMarcaCommand, handleEnderecoCommand } from './companyHandlers';
import { VoiceCommandProcessor } from '@/lib/voice-command-processor';
import { getFunctionByKey } from '@/lib/functions-registry';

// ── Interface de dependências ─────────────────────────────────
// IMPORTANTE: setActiveModal é o único setter de modal necessário.
// Não adicione setores individuais (setNossaMarcaData, etc.) aqui.
// Para novas funções, apenas passe setActiveModal com o type correto.
interface DetectorDeps {
  companyId: string;
  functionSettings: Record<string, FunctionSettings>;
  setIsProcessing: (v: boolean) => void;
  setQrCodeData: (data: QRCodeData | null) => void;
  setPixConfirmationData: (data: PixConfirmationData | null) => void;
  playText: (text: string) => Promise<void>;
  sessionId: string | null;
  commandProcessor: VoiceCommandProcessor | null;
  pixStateRef: React.MutableRefObject<{ qrCodeData: any; pixConfirmationData: any } | null>;
  setActiveModal: (modal: ActiveModal | null) => void;
  activeFunctionContextRef: React.MutableRefObject<any>;
}

export async function detectVoiceCommand(
  transcript: string,
  deps: DetectorDeps
): Promise<boolean> {
  const {
    companyId,
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
  } = deps;

  const correctedTranscript = correctTranscriptionErrors(transcript);
  const lowerTranscript = correctedTranscript.toLowerCase().trim();
  const transcriptWithNumbers = convertWordsToNumbers(lowerTranscript);

  // 1. PRIMEIRO: Verificar se é um comando de ABERTURA de função (via Registry)
  // Isso evita que comandos como "enviar email" caiam na confirmação antes do modal abrir.
  if (commandProcessor) {
    const result = await commandProcessor.processCommand(transcript);

    if (result?.success) {
      console.log('✅ Nova função detectada pelo registry:', result.functionKey);
      const registryFunc = getFunctionByKey(result.functionKey || '');

      if (registryFunc?.handler) {
        const handlerSuccess = await registryFunc.handler({
          transcript: lowerTranscript,
          companyId,
          functionSettings,
          playText,
          setIsProcessing,
          sessionId,
          setActiveModal,
        });

        if (handlerSuccess) {
          activeFunctionContextRef.current = {
            functionKey: registryFunc.functionKey,
            activatedAt: Date.now(),
            expiresIn: 5 * 60 * 1000,
          };
          return true;
        }
      } else {
        if (result.speechText) await playText(result.speechText);
        if (result.modalData && result.modalType) {
          setActiveModal({
            type: result.modalType,
            data: result.modalData,
          });
        }
      }

      if (result.functionKey) {
        await commandProcessor.registerUsage(result.functionKey);
      }
      return true;
    }
  }

  // 2. SEGUNDO: Comandos Legados e QR Codes
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

  // 3. TERCEIRO: Comandos de CONFIRMAÇÃO (só rodam se nenhum comando de abertura foi detectado)
  
  // ── AGENDA: Confirmar evento
  const confirmarEventoTriggers = ['confirmar marcação', 'confirmar agenda', 'confirmar evento', 'confirmar compromisso', 'confirmar reunião', 'confirma reunião', 'confirma evento', 'confirma marcação', 'está correto', 'tá correto', 'está certo', 'tá certo', 'confirma', 'confirmar', 'pode marcar', 'marcar esse', 'marque esse', 'agendar esse', 'agende', 'pode agendar', 'sim confirmar', 'sim pode marcar', 'correto pode marcar', 'ok marcar', 'ok confirmar'];
  if (confirmarEventoTriggers.some(t => lowerTranscript.includes(t))) {
    const createEventModal = document.querySelector('[data-modal-type="create-event"]') || document.querySelector('[data-modal="create-event"]');
    if (createEventModal) {
      window.dispatchEvent(new CustomEvent('confirmCreateEvent', { detail: { trigger: 'voice', transcript: lowerTranscript } }));
      await playText('Confirmado! Criando o evento no calendário...');
      return true;
    }
  }

  // ── EMAIL: Confirmar envio
  const confirmarEmailTriggers = ['confirmar envio', 'confirmar email', 'confirma email', 'enviar agora', 'pode enviar', 'pode mandar', 'envia', 'manda', 'enviar esse', 'mandar esse', 'sim enviar', 'sim pode enviar', 'ok enviar', 'ok mandar', 'confirma envio', 'confirmar esse email'];
  if (confirmarEmailTriggers.some(t => lowerTranscript.includes(t))) {
    const emailModal = document.querySelector('[data-modal-type="send-email"]') || document.querySelector('[data-modal="send-email"]');
    if (emailModal) {
      window.dispatchEvent(new CustomEvent('confirmSendEmail', { detail: { trigger: 'voice', transcript: lowerTranscript } }));
      await playText('Enviando email...');
      return true;
    }
  }

  // ── Nossa Marca ───────────────────────────────────────────
  const nossaMarcaTriggers = ['nossa marca', 'sobre nós', 'sobre nos', 'quem somos', 'nossa empresa'];
  if (nossaMarcaTriggers.some(t => lowerTranscript.includes(t))) {
    console.log('🏢 Comando Nossa Marca detectado!');
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'nossa_marca');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleNossaMarcaCommand({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'nossa_marca', functionSettings['nossa_marca']?.creditsPerUse ?? 0);
    return true;
  }

  // ── Endereço ──────────────────────────────────────────────
  const enderecoTriggers = ['endereço', 'endereco', 'onde fica', 'localização', 'localizacao', 'como chegar'];
  if (enderecoTriggers.some(t => lowerTranscript.includes(t))) {
    console.log('📍 Comando Endereço detectado!');
    const isEnabled = await checkIfFunctionIsEnabled(companyId, 'endereco');
    if (!isEnabled) { await playText('Função desativada.'); return true; }
    await handleEnderecoCommand({ companyId, setIsProcessing, setActiveModal, playText });
    await registerFunctionUsage(companyId, 'endereco', functionSettings['endereco']?.creditsPerUse ?? 0);
    return true;
  }

  // ── Meu Sistema ───────────────────────────────────────────
  const meuSistemaTriggers = ['meu sistema', 'sobre o sistema', 'como funciona', 'eai'];
  if (meuSistemaTriggers.some(t => lowerTranscript.includes(t))) {
    console.log('💡 Comando Meu Sistema detectado!');
    // ✅ Usa setActiveModal com type 'MeuSistemaDisplay'
    setActiveModal({ type: 'MeuSistemaDisplay', data: { companyId } });
    playText('E A I, sou um funcionário de Voz com Inteligência Artificial. Escaneie o QR Code para saber mais. eai.app.br').catch(() => {});
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
    /(?:cobrar|cobra)\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i,
    /(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)\s*(?:reais?)?\s*(?:no|via|pelo|por)?\s*pix/i,
    /(?:valor|no valor)\s*(?:de|com)?\s*(?:r\$)?\s*([\d]+(?:[,.]?\d{1,2})?)/i,
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
        if (!isEnabled) {
          await playText('A função PIX está desativada no momento.');
          return true;
        }
        await handlePixCommand(amount, { companyId, setIsProcessing, setPixConfirmationData, playText, functionSettings });
        await registerFunctionUsage(companyId, 'pix_generate', functionSettings['pix_generate']?.creditsPerUse ?? 0);
        return true;
      }
    }
  }

  if (lowerTranscript.includes('pix')) {
    await playText('Qual o valor do PIX que você deseja gerar?');
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // ✅ PARA ADICIONAR NOVA FUNÇÃO — modelo de bloco:
  //
  // const minhaFuncaoTriggers = ['palavra chave', 'outra frase'];
  // if (minhaFuncaoTriggers.some(t => lowerTranscript.includes(t))) {
  //   const isEnabled = await checkIfFunctionIsEnabled(companyId, 'minha_nova_funcao');
  //   if (!isEnabled) { await playText('Função desativada.'); return true; }
  //   await handleMinhaNovaFuncao({ companyId, setIsProcessing, setActiveModal, playText });
  //   await registerFunctionUsage(companyId, 'minha_nova_funcao', functionSettings['minha_nova_funcao']?.creditsPerUse ?? 1);
  //   return true;
  // }
  // ──────────────────────────────────────────────────────────

  // ── Sistema híbrido (FUNCTIONS_REGISTRY via VoiceCommandProcessor) ──
  if (commandProcessor) {
    const result = await commandProcessor.processCommand(transcript);

    if (result?.success) {
      console.log('✅ Nova função detectada pelo registry:', result.functionKey);

      const registryFunc = getFunctionByKey(result.functionKey || '');

      if (registryFunc?.handler) {
        const handlerSuccess = await registryFunc.handler({
          transcript: lowerTranscript,
          companyId,
          functionSettings,
          playText,
          setIsProcessing,
          sessionId,
          // ✅ setActiveModal unificado — usado pelo registry para abrir modais
          setActiveModal,
        });

        if (handlerSuccess) {
          activeFunctionContextRef.current = {
            functionKey: registryFunc.functionKey,
            activatedAt: Date.now(),
            expiresIn: 5 * 60 * 1000,
          };
          console.log(`🎯 Contexto de ${registryFunc.functionKey} ativado por 5 minutos`);
        }
      } else {
        // Função sem handler customizado: usa speechText e modalData do resultado
        if (result.speechText) await playText(result.speechText);

        if (result.modalData && result.modalType) {
          // ✅ Usa setActiveModal com o type do resultado
          setActiveModal({
            type: result.modalType,
            data: result.modalData,
          });
        }
      }

      if (result.functionKey) {
        await commandProcessor.registerUsage(result.functionKey);
      }

      return true;
    }
  }

  console.log('❌ Nenhum comando detectado');
  return false;
}