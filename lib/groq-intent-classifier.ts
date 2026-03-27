// lib/groq-intent-classifier.ts
import { getAllFunctions } from '@/lib/functions-registry';
import { registerFunctionUsage } from '@/components/VoiceAssistant/handlers/functionUsage';
import { createClient } from '@/lib/supabase-browser';

interface ClassifierDeps {
  companyId: string;
  functionSettings: Record<string, any>;
  playText: (text: string) => Promise<void>;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (modal: any) => void;
  sessionId: string | null;
  commandProcessor: any;
  activeFunctionContextRef: React.MutableRefObject<any>;
}

const ACTION_VERBS = [
  'gerar', 'gera', 'criar', 'cria', 'abrir', 'abre', 'mostrar', 'mostra',
  'tocar', 'toca', 'ouvir', 'escutar', 'consultar', 'consulta',
  'buscar', 'busca', 'verificar', 'verifica', 'enviar', 'envia', 'mandar',
  'imprimir', 'imprime', 'ligar', 'liga', 'desligar', 'cadastrar',
  'agendar', 'agenda', 'marcar', 'marca', 'cancelar', 'cancela',
  'pagar', 'cobrar', 'cobra', 'confirmar', 'validar', 'escanear', 'ler',
  'iniciar', 'inicia', 'começar', 'começa', 'parar', 'quero', 'preciso',
  'me mostra', 'me passa', 'me diz',
];

const KNOWN_KEYWORDS = [
  'pix', 'qr', 'wifi', 'wi-fi', 'música', 'musica', 'vídeo', 'video',
  'cep', 'cnpj', 'cpf', 'placa', 'câmbio', 'cambio', 'dólar', 'dolar',
  'bitcoin', 'clima', 'temperatura', 'agenda', 'calendário',
  'lembrete', 'alarme', 'cronômetro', 'temporizador', 'impressão',
  'cardápio', 'cardapio', 'endereço', 'endereco', 'instagram', 'whatsapp',
  'youtube', 'cadastro', 'cupom', 'fraude', 'boleto', 'estoque', 'produto',
  'câmera', 'camera', 'foto', 'pdf', 'recibo', 'nota', 'orçamento',
  'linkedin', 'tiktok', 'twitter', 'facebook', 'telefone',
];

const GENERAL_CONVERSATION = [
  'tudo bem', 'tudo certo', 'obrigado', 'obrigada', 'valeu', 'tchau',
  'boa tarde', 'bom dia', 'boa noite', 'olá ', 'oi ',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
  'você é', 'voce e ', 'que sistema',
];

function shouldCallGroq(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower === p.trim())) return false;
  if (ACTION_VERBS.some(v => lower.startsWith(v) || lower.includes(` ${v} `))) return true;
  if (KNOWN_KEYWORDS.some(k => lower.includes(k))) return true;
  if (lower.split(' ').length <= 3) return false;
  return true;
}

// Cache em memória por companyId — dura enquanto a página estiver aberta
const triggersCache: Record<string, { key: string; triggers: string[] }[]> = {};

async function getFunctionTriggers(companyId: string) {
  if (triggersCache[companyId]) return triggersCache[companyId];

  const combined: Record<string, string[]> = {};

  // 1. Registry (funções novas)
  for (const fn of getAllFunctions()) {
    if (fn.voiceTriggers?.length) {
      combined[fn.functionKey] = fn.voiceTriggers.slice(0, 5);
    }
  }

  // 2. Banco (funções legadas — voice_triggers é JSONB array)
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('assistant_functions')
      .select('function_key, voice_triggers')
      .eq('is_active', true)
      .not('voice_triggers', 'is', null);

    if (data) {
      for (const row of data) {
        // Não sobrescreve se já está no registry
        if (!combined[row.function_key] && Array.isArray(row.voice_triggers)) {
          combined[row.function_key] = row.voice_triggers.slice(0, 5);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ GROQ: falha ao buscar triggers do banco, usando só registry');
  }

  const result = Object.entries(combined).map(([key, triggers]) => ({ key, triggers }));
  triggersCache[companyId] = result;
  return result;
}

export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    if (!shouldCallGroq(transcript)) {
      console.log('💬 GROQ pulado: vai direto ao GPT');
      return false;
    }

    const functionTriggers = await getFunctionTriggers(deps.companyId);
    if (!functionTriggers.length) return false;

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, functionTriggers }),
    });

    if (!response.ok) return false;

    const { normalizedTranscript, confidence } = await response.json();

    if (!normalizedTranscript || confidence < 0.7) {
      console.log('💬 GROQ: intenção vaga → GPT');
      return false;
    }

    console.log(`🤖 GROQ normalizou: "${transcript}" → "${normalizedTranscript}"`);

    // Reprocessa o transcript normalizado pelo detector normal
    const { detectVoiceCommand } = await import(
      '@/components/VoiceAssistant/handlers/voiceCommandDetector'
    );

    const handled = await detectVoiceCommand(normalizedTranscript, {
      companyId: deps.companyId,
      functionSettings: deps.functionSettings,
      playText: deps.playText,
      setIsProcessing: deps.setIsProcessing,
      setQrCodeData: () => {},
      setPixConfirmationData: () => {},
      sessionId: deps.sessionId,
      commandProcessor: deps.commandProcessor,
      pixStateRef: { current: null },
      setActiveModal: deps.setActiveModal,
      activeFunctionContextRef: deps.activeFunctionContextRef,
    });

    return handled;
  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
