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
  pixStateRef: React.MutableRefObject<any>;
  setQrCodeData: (data: any) => void;
  setPixConfirmationData: (data: any) => void;
  activeFunctionContextRef: React.MutableRefObject<any>;
}

// ── Verbos de ação que indicam intenção de comando ────────────
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

// ── Keywords que indicam função específica ────────────────────
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

// ── Frases de conversa geral — pular tudo ─────────────────────
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

// ── Mapeamento local rápido — zero latência, zero custo ───────
const QUICK_TRIGGERS: [RegExp, string][] = [
  [/imprim|impressora/, 'imprimir documento'],
  [/pizza|lanche|hamburguer|hambúrguer|recomenda.*comer|quero.*comer|pedir comida/, 'ver produtos'],
  [/musiqu|ouvir.*music|escutar.*music|toca.*music|coloca.*music/, 'tocar musica'],
  [/video|vídeo|assistir/, 'tocar video'],
  [/dólar|dolar|euro|bitcoin|câmbio|cambio|cotação|cotacao|libra/, 'cotação dólar'],
  [/wifi|wi-fi|senha.*rede|rede.*senha|senha.*internet/, 'wifi'],
  [/cardap|cardápio/, 'cardápio'],
  [/onde fica|onde vocês|localiz|como chegar|mapa|google maps/, 'endereço'],
  [/qr.*code|qrcode/, 'gerar qr code'],
  [/cep|código postal|codigo postal/, 'consultar cep'],
  [/cnpj|empresa.*receita|receita.*federal/, 'dados da empresa'],
  [/cpf.*dado|dado.*cpf|pessoa.*física|pessoa.*fisica/, 'consultar cpf'],
  [/placa|veiculo|veículo|detran/, 'consultar placa'],
  [/vai chover|previsão.*tempo|previsao.*tempo|temperatura.*cidade/, 'clima'],
  [/criar.*lembrete|me lembra|me lembre|novo lembrete/, 'criar lembrete'],
  [/criar.*alarme|me acorda|definir.*alarme/, 'criar alarme'],
  [/iniciar.*cronometro|comecar.*cronometro|ligar.*cronometro/, 'cronometro'],
  [/timer|temporizador|contagem regressiva/, 'temporizador'],
  [/cadastrar.*cliente|novo.*cadastro|quero.*cadastrar/, 'fazer cadastro'],
  [/gerar.*cupom|quero.*cupom|meu cupom/, 'gerar cupom'],
  [/fraude|boleto suspeito|golpe|site suspeito|link suspeito/, 'identificar fraude'],
  [/estoque.*de|quantos.*tem|quanto.*tem.*produto/, 'estoque de'],
  [/quero.*comprar|fazer.*pedido|adicionar.*carrinho/, 'quero comprar'],
  [/ver.*agenda|minha.*agenda|compromissos.*hoje/, 'ver agenda'],
  [/enviar.*email|mandar.*email|mande.*email/, 'enviar email'],
  [/código.*barras|gerar.*barcode/, 'gerar codigo de barras'],
  [/restrição.*cpf|restricao.*cpf|score.*cpf|serasa.*cpf|spc.*cpf/, 'restrições cpf'],
  [/feriados|calendário.*feriado/, 'feriados'],
  [/qual.*ddd|ddd.*de/, 'consultar ddd'],
  [/protesto.*cpf|cpf.*protesto|cartório/, 'consultar protestos'],
  [/tocar.*playlist|minha.*playlist/, 'playlist'],
  [/ligar.*luz|apagar.*luz|ligar.*ar|desligar.*ar|aparelhos.*smart/, 'aparelhos smart'],
];

function quickMatch(transcript: string): string | null {
  const lower = transcript.toLowerCase();
  for (const [regex, trigger] of QUICK_TRIGGERS) {
    if (regex.test(lower)) return trigger;
  }
  return null;
}

function shouldCallGroq(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (GENERAL_CONVERSATION.some(p => lower.startsWith(p) || lower.includes(p))) return false;
  if (ACTION_VERBS.some(v => lower.startsWith(v) || lower.includes(` ${v} `) || lower.includes(` ${v}`))) return true;
  if (KNOWN_KEYWORDS.some(k => lower.includes(k))) return true;
  if (lower.split(' ').length <= 3) return false;
  return true;
}

// ── Cache de triggers por empresa ────────────────────────────
const triggersCache: Record<string, { key: string; triggers: string[]; examples: string[] }[]> = {};

async function getFunctionTriggers(companyId: string) {
  if (triggersCache[companyId]) return triggersCache[companyId];

  const combined: Record<string, { triggers: string[]; examples: string[] }> = {};

  for (const fn of getAllFunctions()) {
    if (fn.voiceTriggers?.length) {
      combined[fn.functionKey] = {
        triggers: fn.voiceTriggers.slice(0, 4),
        examples: (fn.examplePhrases ?? []).slice(0, 2),
      };
    }
  }

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

async function runWithTrigger(
  trigger: string,
  deps: ClassifierDeps
): Promise<boolean> {
  const { detectVoiceCommand } = await import(
    '@/components/VoiceAssistant/handlers/voiceCommandDetector'
  );
  
  // Executa o detector com fromGroq=true (evita loop)
  await detectVoiceCommand(trigger, {
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
    fromGroq: true,
  });

  // ✅ Sempre retorna true — o detector já falou com o usuário
  // (seja abrindo modal, seja dizendo "não configurado")
  // Não importa o resultado: o fluxo está encerrado aqui.
  return true;
}

// ── Exportação principal ──────────────────────────────────────
export async function classifyIntentWithGroq(
  transcript: string,
  deps: ClassifierDeps
): Promise<boolean> {
  try {
    // 1. Conversa geral → GPT direto
    if (!shouldCallGroq(transcript)) {
      console.log('💬 GROQ pulado: conversa geral');
      return false;
    }

    // 2. Quick match local — zero latência
    const quickTrigger = quickMatch(transcript);
    if (quickTrigger) {
      console.log(`⚡ Quick match: "${transcript}" → "${quickTrigger}"`);
      return await runWithTrigger(quickTrigger, deps);
    }

    // 3. GROQ — para frases que passaram nos filtros mas não tiveram quick match
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

    console.log(`🤖 GROQ trigger: "${transcript}" → "${trigger}"`);
    return await runWithTrigger(trigger, deps);

  } catch (err) {
    console.error('❌ Erro no GROQ classifier:', err);
    return false;
  }
}
