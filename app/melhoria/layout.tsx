// app/melhoria/layout.tsx
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import JsonLd from '@/components/JsonLd';
import { buildBrandMetadata, melhoriaGraph, resolveSeo } from '@/lib/seo';
import EscalaTexto from '@/components/melhoria/EscalaTexto';

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

            /* ── TUDO CENTRALIZADO ────────────────────────────────────────
               Regra do produto: nenhum texto alinhado à esquerda.
               Aplicada aqui, num lugar só, em vez de espalhada por dezenas
               de estilos em linha — assim não escapa nada e não volta a
               escapar quando alguém criar uma tela nova.                    */
            .mel-centro { text-align: center; }

            /* Listas centralizadas precisam do marcador junto do texto,
               senão a bolinha fica pendurada longe, à esquerda.             */
            .mel-centro ul, .mel-centro ol {
              list-style-position: inside;
              padding-left: 0;
            }

            /* DUAS EXCEÇÕES, e ambas são acessibilidade, não estética:

               1. Campo de digitação. Com o texto centralizado, o cursor
                  "pula" para o meio a cada caractere e a pessoa perde o
                  ponto onde estava — problema sério para quem digita
                  devagar, que é o caso aqui.

               2. Texto legal longo. Parágrafo comprido centralizado obriga
                  o olho a procurar onde a linha começa a cada quebra. Em
                  duas frases não pesa; num aviso de privacidade de várias
                  telas, atrapalha bastante. Se preferir centralizar também,
                  é só apagar este bloco.                                    */
            .mel-centro input,
            .mel-centro textarea,
            .mel-centro select { text-align: left; }

            .mel-legal, .mel-legal p, .mel-legal li { text-align: left; }

            /* ── Cabeçalho em tela estreita ───────────────────────────────
               O rótulo do botão de ajuda ("Configurar" / "AJUDA") sai e fica
               só o ícone, que continua com aria-label.

               O limiar é 420px e não 360px por causa do zoom: no tamanho
               gigante (fator 1.16) uma tela de 360px vira 310px de viewport
               CSS, e a media query enxerga esse valor menor. Medido num
               Chromium: com 360px, o botão ultrapassava a borda em 2px.     */
            @media (max-width: 420px) {
              .mel-rotulo-ajuda { display: none; }
            }
          `,
        }}
      />

      {brand === 'melhoria' && <JsonLd data={melhoriaGraph()} />}

      {/*
        O tamanho de letra escolhido pela pessoa vale para TODAS as telas.
        Precisa envolver o conteúdo aqui, e não em cada página, senão a
        configuração só valeria onde alguém lembrasse de aplicá-la — que é
        exatamente o que acontecia antes.
      */}
      <EscalaTexto>{children}</EscalaTexto>

      {/*
        O botão de ajuda NÃO fica mais aqui.

        Ele passou para dentro do <Cabecalho>, por três razões:
          · não deve aparecer na tela de login, onde não há a quem avisar;
          · só faz sentido quando existe contato de emergência cadastrado —
            botão de socorro que não avisa ninguém cria confiança falsa;
          · flutuando sobre o conteúdo, tapava o último item das listas.
      */}
    </>
  );
}
