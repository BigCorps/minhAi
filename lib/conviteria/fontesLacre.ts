// lib/conviteria/fontesLacre.ts
//
// SEM 'use client': este modulo precisa ser importavel pelo SERVIDOR.
//
// A tabela vivia em components/conviteria/LacreArte.tsx, que e 'use client'.
// Quando um server component importa de um modulo cliente, o React entrega
// uma referencia de cliente em vez da funcao — e chama-la no servidor derruba
// a pagina inteira. Era o que acontecia em app/convite/[slug]/page.tsx.
//
// Regra geral: dado puro consumido pelos dois lados mora em lib/, nunca em
// components/.

export const FONTES_LACRE = [
  { id: 'pinyon', nome: 'Pinyon', familia: "'Pinyon Script', cursive" },
  { id: 'greatvibes', nome: 'Great Vibes', familia: "'Great Vibes', cursive" },
  { id: 'cormorant', nome: 'Cormorant', familia: "'Cormorant Garamond', serif" },
  { id: 'playfair', nome: 'Playfair', familia: "'Playfair Display', serif" },
  { id: 'jost', nome: 'Jost', familia: "'Jost', sans-serif" },
  { id: 'archivo', nome: 'Archivo', familia: "'Archivo', sans-serif" },
] as const;

export type FonteLacreId = (typeof FONTES_LACRE)[number]['id'];
export const FONTE_LACRE_PADRAO: FonteLacreId = 'pinyon';

export const FAMILIAS_LACRE = [
  'Pinyon Script', 'Great Vibes', 'Cormorant Garamond',
  'Playfair Display', 'Jost', 'Archivo',
];

export function familiaLacre(id?: string) {
  return (FONTES_LACRE.find((f) => f.id === id) ?? FONTES_LACRE[0]).familia;
}
