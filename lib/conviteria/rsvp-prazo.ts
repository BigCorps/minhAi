const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function partesSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function normalizarDataRsvp(valor: unknown) {
  const texto = String(valor ?? '').trim();
  if (!DATA_RE.test(texto)) return null;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  if (
    data.getUTCFullYear() !== ano
    || data.getUTCMonth() !== mes - 1
    || data.getUTCDate() !== dia
  ) return null;
  return texto;
}

export function dataCalendarioSaoPaulo(valor: string | Date | null | undefined) {
  if (!valor) return null;
  if (typeof valor === 'string') {
    const direta = normalizarDataRsvp(valor.slice(0, 10));
    if (direta && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return direta;
  }
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return partesSaoPaulo(data);
}

export function prazoRsvpEncerrado(prazo: string | null | undefined, agora = new Date()) {
  const normalizado = normalizarDataRsvp(prazo);
  if (!normalizado) return false;
  return partesSaoPaulo(agora) > normalizado;
}

export function prazoRsvpPorExtenso(prazo: string | null | undefined) {
  const normalizado = normalizarDataRsvp(prazo);
  if (!normalizado) return null;
  const [ano, mes, dia] = normalizado.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia, 15, 0, 0));
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(data);
}

export function agendamentoDepoisDoPrazo(
  programadoEm: string | null | undefined,
  prazo: string | null | undefined,
) {
  const limite = normalizarDataRsvp(prazo);
  const diaProgramado = dataCalendarioSaoPaulo(programadoEm);
  if (!limite || !diaProgramado) return false;
  return diaProgramado > limite;
}

export function mensagemPrazoEncerrado(prazo: string | null | undefined) {
  const extenso = prazoRsvpPorExtenso(prazo);
  return extenso
    ? `O prazo de confirmação deste evento foi encerrado em ${extenso}. Em caso de dúvida, entre em contato com os anfitriões.`
    : 'O prazo de confirmação deste evento foi encerrado. Em caso de dúvida, entre em contato com os anfitriões.';
}
