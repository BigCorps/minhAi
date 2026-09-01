// lib/parse-horario-natural.ts
//
// Parser de MELHOR ESFORÇO (decisão confirmada) para extrair uma
// data/hora aproximada a partir do texto livre que o GPT extrai na
// function marcar_horario (ex: "amanhã às 17h", "sexta de manhã",
// "hoje à tarde"). Usado apenas para desenhar o calendário PASSIVO
// no LeadMockCheckoutModal — nunca para lógica de negócio real.
//
// Não é (e não pretende ser) um parser de NLP robusto. Cobre os
// padrões mais comuns em português coloquial; quando não reconhece
// nada, retorna null e o caller deve usar um fallback genérico
// (mostrar só o texto livre, sem calendário).

export interface HorarioParseado {
  data: Date;
  /** true se conseguiu extrair um horário específico (HH:MM); false se foi só período do dia ou nenhum horário. */
  temHoraExata: boolean;
  /** Rótulo do período do dia, quando não há hora exata (manhã/tarde/noite). */
  periodoDia?: 'manha' | 'tarde' | 'noite';
}

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  'segunda-feira': 1,
  terca: 2,
  'terça': 2,
  'terça-feira': 2,
  'terca-feira': 2,
  quarta: 3,
  'quarta-feira': 3,
  quinta: 4,
  'quinta-feira': 4,
  sexta: 5,
  'sexta-feira': 5,
  sabado: 6,
  'sábado': 6,
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos para matching mais simples
}

/**
 * Tenta extrair uma data/hora aproximada de um texto livre em
 * português. Retorna null se não conseguir reconhecer nenhum padrão
 * de data (mesmo sem hora) — nesse caso, o caller deve usar fallback.
 */
export function parseHorarioNatural(texto: string, agora: Date = new Date()): HorarioParseado | null {
  const norm = normalizar(texto);
  let data: Date | null = null;

  // ── Dia ──────────────────────────────────────────────────────────
  // Importante: "depois de amanhã" precisa ser checado ANTES de
  // "amanhã" isolado, porque o regex de "amanhã" também casaria
  // dentro dessa frase (bug real encontrado em teste).
  if (/\bhoje\b/.test(norm)) {
    data = new Date(agora);
  } else if (/depois de amanha/.test(norm)) {
    data = new Date(agora);
    data.setDate(data.getDate() + 2);
  } else if (/\bamanha\b/.test(norm)) {
    data = new Date(agora);
    data.setDate(data.getDate() + 1);
  } else {
    // Dia da semana (ex: "sexta", "sexta-feira"). Melhor esforço:
    // assume a PRÓXIMA ocorrência desse dia (inclusive se for hoje
    // mesmo, assume a semana seguinte — ambíguo por natureza, mas é
    // a interpretação mais comum em fala coloquial: "te vejo sexta"
    // quase nunca significa "hoje", a menos que hoje já seja sexta
    // explicitamente combinado com "hoje").
    for (const [nomeDia, indiceDia] of Object.entries(DIAS_SEMANA)) {
      if (norm.includes(nomeDia)) {
        const diaAtual = agora.getDay();
        let diff = indiceDia - diaAtual;
        if (diff <= 0) diff += 7;
        data = new Date(agora);
        data.setDate(data.getDate() + diff);
        break;
      }
    }
  }

  // Padrão "dia 15", "dia 3" — assume o próximo mês se já passou.
  if (!data) {
    const diaMatch = norm.match(/dia\s+(\d{1,2})/);
    if (diaMatch) {
      const diaNum = parseInt(diaMatch[1], 10);
      if (diaNum >= 1 && diaNum <= 31) {
        data = new Date(agora);
        data.setDate(diaNum);
        if (data < agora) data.setMonth(data.getMonth() + 1);
      }
    }
  }

  if (!data) {
    // Nenhum padrão de dia reconhecido — melhor esforço esgotado.
    return null;
  }

  // ── Hora ─────────────────────────────────────────────────────────
  // Padrões: "17h", "17:30", "às 17", "17h30"
  const horaMatch = norm.match(/(?:as\s*)?(\d{1,2})[:h](\d{2})?/);
  if (horaMatch) {
    const h = parseInt(horaMatch[1], 10);
    const m = horaMatch[2] ? parseInt(horaMatch[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      data.setHours(h, m, 0, 0);
      return { data, temHoraExata: true };
    }
  }

  // Sem hora exata — período do dia, como aproximação visual.
  let periodoDia: 'manha' | 'tarde' | 'noite' | undefined;
  if (/manha/.test(norm)) {
    periodoDia = 'manha';
    data.setHours(9, 0, 0, 0);
  } else if (/tarde/.test(norm)) {
    periodoDia = 'tarde';
    data.setHours(14, 0, 0, 0);
  } else if (/noite/.test(norm)) {
    periodoDia = 'noite';
    data.setHours(19, 0, 0, 0);
  } else {
    // Dia reconhecido, mas nenhum período/hora — usa meio-dia como
    // placeholder neutro só para ter algo a exibir.
    data.setHours(12, 0, 0, 0);
  }

  return { data, temHoraExata: false, periodoDia };
}