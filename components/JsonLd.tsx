// components/JsonLd.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Injeta um grafo schema.org na página.
//
// Sem 'use client' de propósito: assim funciona tanto em Server Component
// (layouts de marca) quanto dentro de um Client Component (a landing da
// minhAi é 'use client'). O que importa para o crawler é que o <script>
// saia no HTML do servidor — e sai, porque Client Component também é
// renderizado no servidor no primeiro request.
//
// Não use isto para dados que dependem de sessão: o JSON-LD precisa
// descrever o que qualquer visitante (e qualquer robô) enxerga.
// ─────────────────────────────────────────────────────────────────────────────

export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // O JSON.stringify já escapa aspas; o replace fecha o único vetor que
      // sobra em bloco <script>: uma string do grafo contendo "</script>".
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
