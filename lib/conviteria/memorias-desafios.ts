export const MEMORIAS_DESAFIOS_TITULO_PADRAO = 'Desafio';

export const MEMORIAS_DESAFIOS_SUGERIDOS = [
  { id: 'selfie-anfitrioes', texto: 'Uma selfie sorrindo com os anfitriões' },
  { id: 'detalhe-lugar', texto: 'Foto do detalhe mais bonito do lugar' },
  { id: 'nova-amizade', texto: 'Uma foto com alguém que você acabou de conhecer' },
  { id: 'geracoes', texto: 'Foto com três gerações juntas' },
  { id: 'abraco', texto: 'Foto de um abraço inesperado' },
  { id: 'animado', texto: 'Registre o momento mais animado da festa' },
  { id: 'engracada', texto: 'Faça a foto mais engraçada da noite' },
  { id: 'brinde', texto: 'Registre o brinde da sua mesa' },
  { id: 'favorito', texto: 'Registre o que mais gostou na festa' },
] as const;

export const MEMORIAS_DESAFIOS_MAX = MEMORIAS_DESAFIOS_SUGERIDOS.length;
export const MEMORIAS_DESAFIO_TITULO_MAX = 40;

export type MemoriasDesafioId = (typeof MEMORIAS_DESAFIOS_SUGERIDOS)[number]['id'];

export type MemoriasDesafiosConfig = {
  ativo: boolean;
  titulo: string;
  ids: string[];
};

const IDS_VALIDOS = new Set<string>(MEMORIAS_DESAFIOS_SUGERIDOS.map((d) => d.id));

export function sanitizarDesafiosIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const ids = valor
    .filter((id): id is string => typeof id === 'string' && IDS_VALIDOS.has(id))
    .slice(0, MEMORIAS_DESAFIOS_MAX);
  return [...new Set(ids)];
}

export function sanitizarTituloDesafios(valor: unknown): string {
  if (typeof valor !== 'string') return MEMORIAS_DESAFIOS_TITULO_PADRAO;
  const titulo = valor.trim().replace(/\s+/g, ' ').slice(0, MEMORIAS_DESAFIO_TITULO_MAX);
  return titulo || MEMORIAS_DESAFIOS_TITULO_PADRAO;
}

export function textosDosDesafios(ids: unknown): string[] {
  const validos = new Set(sanitizarDesafiosIds(ids));
  return MEMORIAS_DESAFIOS_SUGERIDOS
    .filter((d) => validos.has(d.id))
    .map((d) => d.texto);
}

export function configDesafiosPublica(input: {
  desafios_ativos?: unknown;
  desafios_titulo?: unknown;
  desafios_ids?: unknown;
} | null | undefined): MemoriasDesafiosConfig {
  const ids = sanitizarDesafiosIds(input?.desafios_ids);
  return {
    ativo: Boolean(input?.desafios_ativos) && ids.length > 0,
    titulo: sanitizarTituloDesafios(input?.desafios_titulo),
    ids,
  };
}
