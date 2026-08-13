export const ORNAMENTOS_ASSETS = [
  { id: 'floral', nome: 'Floral', preview: '/brands/convite/ornamentos/floral.svg' },
  { id: 'classico', nome: 'Clássico', preview: '/brands/convite/ornamentos/classico.svg' },
  { id: 'geometrico', nome: 'Geométrico', preview: '/brands/convite/ornamentos/geometrico.svg' },
  { id: 'minimal', nome: 'Minimalista', preview: '/brands/convite/ornamentos/minimal.svg' },
  { id: 'festivo', nome: 'Festivo', preview: '/brands/convite/ornamentos/festivo.svg' },
  { id: 'rustico', nome: 'Rústico', preview: '/brands/convite/ornamentos/rustico.svg' },
] as const;

export function assetOrnamento(id?: string) {
  return ORNAMENTOS_ASSETS.find((o) => o.id === id) ?? ORNAMENTOS_ASSETS[0];
}
