// app/melhoria/layout.tsx
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, melhoriaGraph, resolveSeo } from '@/lib/seo';
import BotaoPanico from '@/components/melhoria/BotaoPanico';

export const dynamic = 'force-dynamic';

// melhoria.org/ e melhoria.org/melhoria servem a MESMA página (o middleware
// reescreve a raiz). Colapsar as duas em "/" evita duplicata no canonical —
// mesma correção que o ConsultaTec precisou fazer.
function normalizarCaminho(bruto: string | null): string {
  const caminho = bruto && bruto.startsWith('/') ? bruto : '/';
  if (caminho === '/melhoria' || caminho === '/melhoria/') return '/';
  return caminho;
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  // maximumScale e userScalable NÃO são travados de propósito: o público
  // precisa conseguir dar zoom. Travar zoom é falha de acessibilidade
  // (WCAG 1.4.4).
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  if (brand === 'melhoria') {
    return buildBrandMetadata({
      host,
      path: normalizarCaminho(headersList.get('x-pathname')),
    });
  }

  return {
    ...buildBrandMetadata({ host, path: '/', noindex: true }),
    alternates: { canonical: 'https://melhoria.org' },
  };
}

export default async function MelhoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { brand } = resolveSeo(host);

  return (
    <>
      {/*
        FUNDO BRANCO NO DESKTOP.

        As telas da MelhorIA são uma coluna de 640px centralizada. O
        `background` do <main> pinta só essa coluna — no desktop as laterais
        mostram o <body>, que na minhAi é escuro, e o resultado é a coluna
        branca cercada de preto.

        O `html` e o `body` vêm do layout raiz, que é compartilhado com as
        outras marcas e não pode ser alterado. Este <style> escopado resolve
        sem tocar em nada: enquanto uma página /melhoria estiver montada, o
        fundo é branco; ao sair, volta ao normal.

        `color-scheme: light` impede que o modo escuro do sistema operacional
        force cores próprias em campos e barras de rolagem — outro caminho
        pelo qual o preto reaparece.
      */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background: #FFFFFF !important;
              color: #0F172A;
              color-scheme: light;
            }
            body::before, body::after { display: none !important; }
          `,
        }}
      />

      {brand === 'melhoria' && <JsonLd data={melhoriaGraph()} />}

      {children}

      {/*
        Botão de emergência. Usa createPortal para o document.body, então basta
        montar uma vez aqui e ele aparece fixo em todas as telas.

        Fica fora do <main> de propósito: se ficasse dentro, herdaria o
        maxWidth de 640px e no desktop apareceria no meio da tela, longe do
        polegar.
      */}
      <BotaoPanico />
    </>
  );
}
