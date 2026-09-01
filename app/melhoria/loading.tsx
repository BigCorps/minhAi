// app/melhoria/loading.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tela de transição entre páginas da MelhorIA.
//
// ⚠️ POR QUE ELA EXISTE
// O layout raiz do projeto usa:
//
//     <ThemeProvider attribute="class" defaultTheme="dark" enableSystem ...>
//
// ou seja, o tema PADRÃO da minhAi é escuro. Sem um `loading.tsx` próprio, a
// troca de rota mostra a casca do layout raiz — e o resultado é o flash preto
// que aparecia ao navegar entre as telas.
//
// Este arquivo é um Server Component sem estado: o Next o exibe automaticamente
// enquanto a próxima rota carrega, e ele já vem branco, com a marca certa.
//
// Não converter para 'use client' e não adicionar lógica: quanto mais leve,
// menos tempo ele fica na tela.
// ─────────────────────────────────────────────────────────────────────────────

export default function CarregandoMelhorIA() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* <img> puro em vez de next/image: este componente aparece por frações
          de segundo, e o otimizador só atrasaria a exibição. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brands/melhoria/logo.png"
        alt=""
        width={84}
        height={84}
        style={{ borderRadius: 18, display: 'block' }}
      />

      <p style={{
        fontSize: 22, fontWeight: 700, color: '#115E59',
        margin: 0, textAlign: 'center',
      }}>
        MelhorIA
      </p>

      {/* Barra indeterminada em CSS puro: sem JavaScript, sem dependência, e
          já anima no primeiro frame. */}
      <div style={{
        width: 200, height: 8, borderRadius: 999,
        background: '#CCFBF1', overflow: 'hidden',
      }}>
        <div
          style={{
            width: '40%', height: '100%', borderRadius: 999,
            background: '#0F766E',
            animation: 'melhoria-carregando 1.1s ease-in-out infinite',
          }}
        />
      </div>

      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes melhoria-carregando {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
            @media (prefers-reduced-motion: reduce) {
              [style*="melhoria-carregando"] { animation: none !important; }
            }
          `,
        }}
      />
    </div>
  );
}
