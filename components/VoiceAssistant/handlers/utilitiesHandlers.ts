// ============================================================
// utilitiesHandlers.ts
// Caminho: components/assistant/VoiceAssistant/handlers/utilitiesHandlers.ts
//
// Handlers das 5 funções de utilidades:
// - handleCriarLembrete
// - handleCronometro
// - handleTemporizador
// - handleRelogioMundial
// - handleAlarme
// ============================================================

import { ActiveModal } from '../types';

interface HandlerDeps {
  companyId: string;
  setIsProcessing: (v: boolean) => void;
  setActiveModal: (modal: ActiveModal | null) => void;
  playText: (text: string) => Promise<void>;
  transcript?: string;
}

// ── Helpers de extração de tempo ──────────────────────────────────────────────

/**
 * Extrai uma duração em milissegundos de um transcript.
 * Ex: "5 minutos" → 300000, "1 hora e 30 minutos" → 5400000
 */
export function extractDurationMs(transcript: string): { ms: number; label: string } | null {
  const lower = transcript.toLowerCase();

  let totalMs = 0;
  let labelParts: string[] = [];

  // Horas
  const horaMatch = lower.match(/(\d+)\s*hora/);
  if (horaMatch) {
    const h = parseInt(horaMatch[1]);
    totalMs += h * 3600000;
    labelParts.push(`${h} hora${h !== 1 ? 's' : ''}`);
  }

  // Minutos
  const minMatch = lower.match(/(\d+)\s*minuto/);
  if (minMatch) {
    const m = parseInt(minMatch[1]);
    totalMs += m * 60000;
    labelParts.push(`${m} minuto${m !== 1 ? 's' : ''}`);
  }

  // Segundos
  const secMatch = lower.match(/(\d+)\s*segundo/);
  if (secMatch) {
    const s = parseInt(secMatch[1]);
    totalMs += s * 1000;
    labelParts.push(`${s} segundo${s !== 1 ? 's' : ''}`);
  }

  if (totalMs === 0) return null;

  return { ms: totalMs, label: labelParts.join(' e ') };
}

/**
 * Extrai hora alvo de um transcript para alarme/lembrete.
 * Ex: "às 7h da manhã" → "07:00"
 * Ex: "às 14h30" → "14:30"
 * Ex: "às 6 e meia" → "06:30"
 */
export function extractTargetTime(transcript: string): {
  isoTime: string;
  label: string;
} | null {
  const lower = transcript.toLowerCase();

  let hour = -1;
  let minute = 0;

  // Formato HH:MM
  const hhmmMatch = lower.match(/(\d{1,2})[h:](\d{2})/);
  if (hhmmMatch) {
    hour = parseInt(hhmmMatch[1]);
    minute = parseInt(hhmmMatch[2]);
  }

  // Formato "Xh" sem minutos
  if (hour === -1) {
    const hMatch = lower.match(/(\d{1,2})\s*h(?:\b|ora)/);
    if (hMatch) hour = parseInt(hMatch[1]);
  }

  // "X e meia" → :30
  if (lower.includes('e meia')) minute = 30;

  // "X da manhã / da tarde / da noite"
  if (hour !== -1) {
    if ((lower.includes('tarde') || lower.includes('noite')) && hour < 12) {
      hour += 12;
    }
    if (lower.includes('meia noite') || lower.includes('meia-noite')) {
      hour = 0; minute = 0;
    }
    if (lower.includes('meio dia') || lower.includes('meio-dia')) {
      hour = 12; minute = 0;
    }
  }

  if (hour === -1) return null;

  const now = new Date();
  const target = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0
  );

  // Se já passou, agenda para amanhã
  if (target <= now) target.setDate(target.getDate() + 1);

  const hStr = String(hour).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  const label = `${hStr}h${mStr !== '00' ? mStr : ''}`;

  return { isoTime: target.toISOString(), label };
}

/**
 * Extrai texto do lembrete (título) do transcript.
 * Ex: "me lembra de ligar para o João" → "Ligar para o João"
 */
export function extractLembreteTitle(transcript: string): string {
  const lower = transcript.toLowerCase();

  // Remove gatilhos e extrai o conteúdo
  const patterns = [
    /(?:me\s+)?lem(?:bra|bre)\s+(?:de\s+)?(.+?)(?:\s+às|\s+as|\s+para\s+as|\s+no\s+dia|$)/i,
    /criar?\s+(?:um\s+)?lembrete\s+(?:de\s+|para\s+)?(.+?)(?:\s+às|\s+as|$)/i,
    /não\s+me\s+(?:deixa?\s+)?esquecer\s+(?:de\s+)?(.+?)(?:\s+às|\s+as|$)/i,
    /lembrar?\s+(?:de\s+)?(.+?)(?:\s+às|\s+as|$)/i,
    /adicionar?\s+lembrete\s+(?:de\s+|para\s+)?(.+?)(?:\s+às|\s+as|$)/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match?.[1]) {
      const title = match[1].trim();
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  return 'Lembrete';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Criar Lembrete
 * Extrai título e horário do transcript.
 * Abre CriarLembreteDisplay com dados pré-preenchidos ou formulário vazio.
 */
export async function handleCriarLembrete({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
  transcript = '',
}: HandlerDeps): Promise<void> {
  setIsProcessing(true);

  try {
    const titulo = extractLembreteTitle(transcript);
    const timeData = extractTargetTime(transcript);

    if (timeData) {
      await playText(
        `Lembrete criado! Vou te avisar sobre "${titulo}" às ${timeData.label}.`
      );
    } else {
      await playText(
        'Vou criar um lembrete. Preencha o horário no formulário.'
      );
    }

    setActiveModal({
      type: 'CriarLembreteDisplay',
      data: {
        companyId,
        titulo,
        dateTime: timeData?.isoTime ?? undefined,
      },
    });
  } catch (error) {
    console.error('❌ [CRIAR LEMBRETE] ERRO:', error);
    await playText('Desculpe, não consegui criar o lembrete.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Cronômetro
 * Inicia o cronômetro. Para apenas quando o usuário pedir "finalizar cronômetro".
 */
export async function handleCronometro({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: HandlerDeps): Promise<void> {
  setIsProcessing(true);

  try {
    await playText('Cronômetro iniciado! Diga "finalizar cronômetro" quando quiser parar.');

    setActiveModal({
      type: 'CronometroDisplay',
      data: { companyId },
    });
  } catch (error) {
    console.error('❌ [CRONÔMETRO] ERRO:', error);
    await playText('Desculpe, não consegui iniciar o cronômetro.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Temporizador
 * Extrai a duração do transcript e inicia contagem regressiva.
 */
export async function handleTemporizador({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
  transcript = '',
}: HandlerDeps): Promise<void> {
  setIsProcessing(true);

  try {
    const duration = extractDurationMs(transcript);

    if (!duration) {
      await playText(
        'Por favor, informe o tempo. Por exemplo: temporizador de 5 minutos, ou timer de 30 segundos.'
      );
      setIsProcessing(false);
      return;
    }

    await playText(`Temporizador de ${duration.label} iniciado!`);

    setActiveModal({
      type: 'TemporizadorDisplay',
      data: {
        companyId,
        durationMs: duration.ms,
        label: duration.label,
      },
    });
  } catch (error) {
    console.error('❌ [TEMPORIZADOR] ERRO:', error);
    await playText('Desculpe, não consegui iniciar o temporizador.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Relógio Mundial
 * Abre o modal com as 8 principais horas mundiais.
 */
export async function handleRelogioMundial({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
}: HandlerDeps): Promise<void> {
  setIsProcessing(true);

  try {
    setActiveModal({
      type: 'RelogioMundialDisplay',
      data: { companyId },
    });

    // A voz "Essas são as principais horas..." é falada dentro do próprio componente
    // Para não duplicar, apenas abrimos o modal sem playText aqui.
    // O componente cuida do próprio áudio.
  } catch (error) {
    console.error('❌ [RELÓGIO MUNDIAL] ERRO:', error);
    await playText('Desculpe, não consegui abrir o relógio mundial.');
  } finally {
    setIsProcessing(false);
  }
}

/**
 * Alarme
 * Extrai o horário do transcript e cria o alarme.
 */
export async function handleAlarme({
  companyId,
  setIsProcessing,
  setActiveModal,
  playText,
  transcript = '',
}: HandlerDeps): Promise<void> {
  setIsProcessing(true);

  try {
    const timeData = extractTargetTime(transcript);

    if (timeData) {
      await playText(`Alarme criado para as ${timeData.label}!`);

      setActiveModal({
        type: 'AlarmeDisplay',
        data: {
          companyId,
          targetTime: timeData.isoTime,
          label: `Alarme para ${timeData.label}`,
        },
      });
    } else {
      await playText(
        'Para criar um alarme, me diga o horário. Por exemplo: criar alarme para as 7 da manhã.'
      );

      // Abre o modal com formulário vazio
      setActiveModal({
        type: 'AlarmeDisplay',
        data: { companyId },
      });
    }
  } catch (error) {
    console.error('❌ [ALARME] ERRO:', error);
    await playText('Desculpe, não consegui criar o alarme.');
  } finally {
    setIsProcessing(false);
  }
}
