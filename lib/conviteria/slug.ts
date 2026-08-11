/** Normaliza para subdominio: minusculo, sem acento, sem espaco. */
export function normalizarSlug(entrada: string): string {
  return entrada
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/** Sugere a partir dos nomes: "Miriam e Ithiel" -> "miriam-e-ithiel". */
export function sugerirSlug(nomes: string): string {
  return normalizarSlug(nomes);
}

// Lista curta e estatica. A longa (palavroes, marcas de terceiros) vive em
// conviteria.slugs_reservados, para bloquear sem deploy.
export const RESERVADOS = new Set([
  'www', 'app', 'api', 'admin', 'painel', 'dashboard', 'login', 'cadastro',
  'conta', 'suporte', 'ajuda', 'status', 'cdn', 'assets', 'static', 'files',
  'blog', 'noticias', 'termos', 'privacidade', 'seguranca', 'abuse',
  'postmaster', 'webmaster', 'noreply', 'no-reply', 'root', 'test', 'teste',
  'demo', 'staging', 'dev', 'beta', 'null', 'undefined', 'me', 'eu',
  'minhai', 'artefinal', 'consultatec', 'pix', 'minia', 'bigcorps',
  'convite', 'convites', 'conviteia', 'convite-ia', 'ai', 'ia',
]);

export type ErroSlug = 'curto' | 'longo' | 'formato' | 'reservado';

export function validarSlug(slug: string): ErroSlug | null {
  if (slug.length < 3) return 'curto';
  if (slug.length > 30) return 'longo';
  // Precisa comecar e terminar com alfanumerico: hifen na ponta quebra DNS.
  if (!/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/.test(slug)) return 'formato';
  if (RESERVADOS.has(slug)) return 'reservado';
  return null;
}

export const MENSAGEM_ERRO: Record<ErroSlug, string> = {
  curto: 'Use pelo menos 3 caracteres.',
  longo: 'Use no máximo 30 caracteres.',
  formato: 'Use apenas letras, números e hífen, sem hífen no começo ou no fim.',
  reservado: 'Esse endereço é reservado. Escolha outro.',
};
