export const MEMORIAS_NOME_MAX = 80;

export function normalizarNomeConvidado(valor: unknown) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, MEMORIAS_NOME_MAX);
}

export function nomeConvidadoValido(valor: unknown) {
  const nome = normalizarNomeConvidado(valor);
  if (!nome) return false;

  const partes = nome.split(' ').filter(Boolean);
  if (partes.length < 2) return false;
  if ((partes[0]?.length ?? 0) < 2 || (partes.at(-1)?.length ?? 0) < 2) return false;

  // Letras Unicode, acentos, hífen e apóstrofo. Ex.: Ana Souza, João D'Ávila,
  // Maria de Fátima Costa, Jean-Pierre Silva.
  return /^[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*)+$/u.test(nome);
}

export const MEMORIAS_NOME_ERRO = 'Informe seu nome e sobrenome para continuar.';
