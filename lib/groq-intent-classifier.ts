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
  'me mostra', 'me passa', 'me diz', 'precisando', 'precisando de',
];

const KNOWN_KEYWORDS = [
  'pix', 'qr', 'wifi', 'wi-fi', 'musica', 'música', 'video', 'vídeo',
  'cep', 'cnpj', 'cpf', 'placa', 'cambio', 'câmbio', 'dolar', 'dólar',
  'bitcoin', 'clima', 'temperatura', 'agenda', 'calendario', 'calendário',
  'lembrete', 'alarme', 'cronometro', 'cronômetro', 'temporizador',
  'imprimir', 'impressao', 'impressão', 'impressora', 'imprima', 'imprime',
  'recibo', 'cupom', 'nota fiscal', 'printnode',
  'cardapio', 'cardápio', 'endereco', 'endereço',
  'instagram', 'whatsapp', 'youtube', 'cadastro', 'fraude', 'boleto',
  'estoque', 'produto', 'camera', 'câmera', 'foto', 'pdf',
  'orcamento', 'orçamento', 'linkedin', 'tiktok', 'twitter', 'facebook',
  'telefone', 'alarme', 'lembrete', 'cronometro', 'temporizador',
  'qrcode', 'código de barras', 'codigo de barras', 'barcode',
  'cambio', 'câmbio', 'cotação', 'cotacao', 'moeda', 'euro', 'libra',
  'feriado', 'ddd', 'protesto', 'score', 'serasa', 'spc',
  'playlist', 'slideshow', 'smart', 'aparelho',
];

const GENERAL_CONVERSATION = [
  'tudo bem', 'tudo certo', 'obrigado', 'obrigada', 'valeu', 'tchau',
  'boa tarde', 'bom dia', 'boa noite', 'olá ', 'oi ',
  'não entendi', 'nao entendi', 'pode repetir', 'fala de novo',
  'você é', 'voce e ', 'que sistema',
  // Perguntas sobre capacidades
  'o que mais você', 'o que mais voce', 'o que você faz', 'o que voce faz',
  'o que mais faz', 'o que mais consegue', 'o que você consegue',
  'quais são suas', 'quais sao suas', 'o que sabe fazer',
  'me conta mais', 'me fala mais', 'o que tem de', 'e aí',
  'além disso', 'alem disso', 'e também', 'e tambem',
  'quais funções', 'quais funcoes', 'que funções', 'que funcoes',
  'o que você pode', 'o que voce pode', 'o que mais pode',
];

function shouldCallGroq(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();

  // Conversa geral → bloqueia
  if (GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower.includes(p))) return false;

  // Verbo de ação → passa
  if (ACTION_VERBS.some(v => lower.startsWith(v) || lower.includes(` ${v} `) || lower.includes(` ${v}`))) return true;

  // Keyword de função → passa
  if (KNOWN_KEYWORDS.some(k => lower.includes(k))) return true;

  // Muito curto sem keyword → bloqueia
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
          combined[row.function_key] = (row.voice_triggers as string[]).slice(0, 5);
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
    // Filtro local rápido — zero latência
    if (!shouldCallGroq(transcript)) {
      console.log('💬 GROQ pulado: vai direto ao GPT');
      return false;
    }

    // Monta lista combinando registry + banco
    const functionTriggers = await getFunctionTriggers(deps.companyId);
    if (!functionTriggers.length) return false;

    const response = await fetch('/api/groq/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, functionTriggers }),
    });

    if (!response.ok) return false;

    const { normalizedTranscript, confidence } = await response.json();

    if (!normalizedTranscript || confidence < 0.65) {
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
