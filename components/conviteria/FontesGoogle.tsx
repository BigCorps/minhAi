'use client';

// components/conviteria/FontesGoogle.tsx
//
// Carrega as familias do Google que o wizard precisa mostrar.
//
// Existe porque a previa e a etapa "Fontes" renderizavam tudo com a fonte do
// sistema: so app/convite/[slug]/page.tsx carregava as familias, e o wizard
// nao. A pessoa escolhia entre 10 opcoes visualmente identicas e so descobria
// a fonte de verdade depois de publicar.
//
// Carrega o grupo inteiro, e nao so o par selecionado, porque a etapa "Fontes"
// mostra todas as alternativas lado a lado — carregar sob demanda faria cada
// cartao trocar de aparencia enquanto a pessoa olha.
//
// React 19 iça <link rel="stylesheet"> para o <head> e deduplica por href,
// mesmo declarado dentro de client component. Nao precisa de next/head.

import { urlGoogleFonts } from '@/lib/conviteria/tokens';

export default function FontesGoogle({ familias }: { familias: string[] }) {
  if (familias.length === 0) return null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={urlGoogleFonts(familias)} />
    </>
  );
}
