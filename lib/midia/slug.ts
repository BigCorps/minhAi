import { MIDIA_RESERVED_SLUGS } from './constants';

export function normalizeMidiaSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function validateMidiaSlug(value: string): string | null {
  if (value.length < 3) return 'Use pelo menos 3 caracteres.';
  if (value.length > 40) return 'Use no máximo 40 caracteres.';
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) {
    return 'Use apenas letras minúsculas, números e hífen.';
  }
  if ((MIDIA_RESERVED_SLUGS as readonly string[]).includes(value)) {
    return 'Este endereço é reservado pela Midia.Pro.';
  }
  return null;
}
