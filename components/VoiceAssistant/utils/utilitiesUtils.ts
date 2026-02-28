// ============================================================
// utilitiesUtils.ts
// Caminho: components/assistant/VoiceAssistant/utils/utilitiesUtils.ts
//
// Funções utilitárias para extração de tempo, duração e título
// usadas pelas 5 funções de utilities (lembrete, cronômetro,
// temporizador, alarme). Separadas para import dinâmico no
// functions-registry.ts.
// ============================================================

/**
 * Extrai uma duração em milissegundos de um transcript.
 * Ex: "5 minutos" → { ms: 300000, label: "5 minutos" }
 * Ex: "1 hora e 30 minutos" → { ms: 5400000, label: "1 hora e 30 minutos" }
 */
export function extractDurationMs(transcript: string): { ms: number; label: string } | null {
  const lower = transcript.toLowerCase();

  let totalMs = 0;
  const labelParts: string[] = [];

  const horaMatch = lower.match(/(\d+)\s*hora/);
  if (horaMatch) {
    const h = parseInt(horaMatch[1]);
    totalMs += h * 3600000;
    labelParts.push(`${h} hora${h !== 1 ? 's' : ''}`);
  }

  const minMatch = lower.match(/(\d+)\s*minuto/);
  if (minMatch) {
    const m = parseInt(minMatch[1]);
    totalMs += m * 60000;
    labelParts.push(`${m} minuto${m !== 1 ? 's' : ''}`);
  }

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
 * Ex: "às 7h da manhã" → { isoTime: ISO, label: "07h" }
 * Ex: "às 14h30" → { isoTime: ISO, label: "14h30" }
 * Ex: "às 6 e meia" → { isoTime: ISO, label: "06h30" }
 */
export function extractTargetTime(transcript: string): {
  isoTime: string;
  label: string;
} | null {
  const lower = transcript.toLowerCase();

  let hour = -1;
  let minute = 0;

  // Formato HH:MM ou HHhMM
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

  // Número seguido de "hora" ou "horas"
  if (hour === -1) {
    const numHoraMatch = lower.match(/(\d{1,2})\s*hora/);
    if (numHoraMatch) hour = parseInt(numHoraMatch[1]);
  }

  // "às X" ou "as X" — horário sem sufixo h
  if (hour === -1) {
    const asXMatch = lower.match(/(?:às|as)\s+(\d{1,2})(?:\s|$)/);
    if (asXMatch) hour = parseInt(asXMatch[1]);
  }

  if (hour === -1) return null;

  // "e meia" → :30
  if (lower.includes('e meia')) minute = 30;

  // Período do dia
  if ((lower.includes('tarde') || lower.includes('noite')) && hour < 12) {
    hour += 12;
  }
  if (lower.includes('meia noite') || lower.includes('meia-noite')) {
    hour = 0; minute = 0;
  }
  if (lower.includes('meio dia') || lower.includes('meio-dia')) {
    hour = 12; minute = 0;
  }

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
 * Extrai o título/conteúdo de um lembrete do transcript.
 * Ex: "me lembra de ligar para o João" → "Ligar para o João"
 */
export function extractLembreteTitle(transcript: string): string {
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
