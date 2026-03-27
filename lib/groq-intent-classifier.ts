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
  pixStateRef: React.MutableRefObject<any>;
  setQrCodeData: (data: any) => void;
  setPixConfirmationData: (data: any) => void;
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
  'me mostra', 'me passa', 'precisando',
];

const KNOWN_KEYWORDS = [
  'pix', 'qr', 'wifi', 'wi-fi', 'musica', 'música', 'video', 'vídeo',
  'cep', 'cnpj', 'cpf', 'placa', 'cambio', 'câmbio', 'dolar', 'dólar',
  'bitcoin', 'clima', 'temperatura', 'agenda', 'calendario', 'calendário',
  'lembrete', 'alarme', 'cronometro', 'cronômetro', 'temporizador',
  'imprimir', 'impressao', 'impressão', 'impressora', 'imprime',
  'recibo', 'cupom', 'nota fiscal',
  'cardapio', 'cardápio', 'endereco', 'endereço',
  'instagram', 'whatsapp', 'youtube', 'cadastro', 'fraude', 'boleto',
  'estoque', 'produto', 'camera', 'câmera', 'foto', 'pdf',
  'orcamento', 'orçamento', 'linkedin', 'tiktok', 'twitter', 'facebook',
  'telefone', 'qrcode', 'barcode', 'codigo de barras',
  'cotação', 'cotacao', 'moeda', 'euro', 'libra',
  'feriado', 'ddd', 'protesto', 'score', 'serasa', 'spc',
  'playlist', 'slideshow', 'smart', 'aparelho',
];

const GENERAL_CONVERSATION = [
  'tudo bem', 'tudo certo', 'obrigado', 'obrigada', 'valeu', 'tchau',
  'boa tarde', 'bom dia', 'boa noite', 'olá ', 'oi ',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
  'você é', 'voce e ', 'que sistema',
  'o que mais você', 'o que mais voce', 'o que você faz', 'o que voce faz',
  'o que mais faz', 'o que mais consegue',
  'quais são suas', 'quais sao suas', 'o que sabe fazer',
  'e aí', 'e ai ', 'além disso', 'alem disso', 'e também', 'e tambem',
  'quais funções', 'quais funcoes', 'o que você pode', 'o que voce pode',
];

function shouldCallGroq(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower.includes(p))) return false;
  if (ACTION_VERBS.some(v => lower.startsWith(v) || lower.includes(` ${v} `) || lower.includes(` ${v}`))) return true;
  if (KNOWN_KEYWORDS.some(k => lower.includes(k))) return true;
  if (lower.split(' ').length <= 3) return false;
  return true;
}

// Cache em memória por companyId
const triggersCache: Record<string, { key: string; triggers: string[]; examples: string[] }[]> = {};

async function getFunctionTriggers(companyId: string) {
  if (triggersCache[companyId]) return triggersCache[companyId];

  const combined: Record<string, { triggers: string[]; examples: string[] }> = {};

  // 1. Registry (funções novas) — tem voiceTriggers e examplePhrases
  for (const fn of getAllFunctions()) {
    if (fn.voiceTriggers?.length) {
      combined[fn.functionKey] = {
        triggers: fn.voiceTriggers.slice(0, 4),
        examples: (fn.examplePhrases ?? []).slice(0, 2),
      };
    }
  }

  // 2. Banco (funções legadas)
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('assistant_functions')
      .select('function_key, voice_triggers, example_phrases')
      .eq('is_active', true)
      .not('voice_triggers', 'is', null);

    if (data) {
      for (const row of data) {
        if (!combined[row.function_key] && Array.isArray(row.voice_triggers)) {
          combined[row.function_key] = {
            triggers: (row.voice_triggers as string[]).slice(0, 4),
            examples: Array.isArray(row.example_phrases)
              ? (row.example_phrases as string[]).slice(0, 2)
              : [],
          };
        }
      }
    }
  } catch {
    console.warn('⚠️ GROQ: falha ao buscar triggers do banco');
  }

  const result = Object.entries(combined).map(([key, v]) => ({
    key,
    triggers: v.triggers,
    examples: v.examples,
  }));

  triggersCache[companyId] = result;
  return result;
}

export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    if (!shouldCallGroq(transcript)) {
      console.log('💬 GROQ pulado: conversa geral');
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

    const { trigger } = await response.json();

    if (!trigger) {
      console.log('💬 GROQ: sem match → GPT');
      return false;
    }

    console.log(`🤖 GROQ identificou trigger: "${transcript}" → "${trigger}"`);

    // ✅ Chama detectVoiceCommand com o trigger exato + flag fromGroq = true
    // para evitar loop (detectVoiceCommand não chama GROQ quando fromGroq=true)
    const { detectVoiceCommand } = await import(
      '@/components/VoiceAssistant/handlers/voiceCommandDetector'
    );

    const handled = await detectVoiceCommand(trigger, {
      companyId: deps.companyId,
      functionSettings: deps.functionSettings,
      playText: deps.playText,
      setIsProcessing: deps.setIsProcessing,
      setQrCodeData: deps.setQrCodeData,
      setPixConfirmationData: deps.setPixConfirmationData,
      sessionId: deps.sessionId,
      commandProcessor: deps.commandProcessor,
      pixStateRef: deps.pixStateRef,
      setActiveModal: deps.setActiveModal,
      activeFunctionContextRef: deps.activeFunctionContextRef,
      fromGroq: true, // ← flag anti-loop
    });

    return handled;
  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
