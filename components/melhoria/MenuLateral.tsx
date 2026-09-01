'use client';

// components/melhoria/MenuLateral.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Painel de navegação que abre ao tocar no logo.
//
// ── UMA RESSALVA HONESTA ────────────────────────────────────────────────────
// Navegação escondida atrás de um ícone é conhecidamente ruim para este
// público: o que não está à vista, para muita gente, não existe. Por isso o
// menu é um ATALHO A MAIS, e não o caminho principal — a tela "Meu dia"
// continua com todos os botões visíveis, escritos por extenso.
//
// Duas decisões que vêm dessa preocupação:
//   · o logo ganha um traço de menu ao lado, para ler como botão e não como
//     enfeite. Logo isolado não convida ao toque;
//   · cada item tem ícone E texto, em 72px de altura. Nada de lista compacta.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  X, Home, Pill, CalendarDays, ShoppingCart, ShieldCheck, Sparkles,
  Users, UserCog, Coins, PhoneCall, LogOut,
} from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { R } from '@/lib/melhoria/rotas';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

interface Item {
  rotulo: string;
  destino: string;
  Icone: typeof Home;
}

const SECOES: Item[][] = [
  [
    { rotulo: 'Meu dia',              destino: R.app(),        Icone: Home },
    { rotulo: 'Meus remédios',        destino: R.remedios(),   Icone: Pill },
    { rotulo: 'Consultas e exames',   destino: R.agenda(),     Icone: CalendarDays },
    { rotulo: 'Lista de compras',     destino: R.compras(),    Icone: ShoppingCart },
  ],
  [
    { rotulo: 'Verificar boleto ou link', destino: R.verificar(), Icone: ShieldCheck },
    { rotulo: 'Conversar com a MelhorIA', destino: R.conversa(),  Icone: Sparkles },
  ],
  [
    { rotulo: 'Quem avisar se eu precisar de ajuda', destino: R.emergencia(), Icone: PhoneCall },
    { rotulo: 'Minha família',  destino: R.familia(),  Icone: Users },
    { rotulo: 'Meus dados',     destino: R.perfil(),   Icone: UserCog },
    { rotulo: 'Créditos',       destino: R.creditos(), Icone: Coins },
  ],
];

export default function MenuLateral({
  aberto, aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const router   = useRouter();
  const caminho  = usePathname();
  const supabase = melhoriaAuth();

  // Esc fecha, e o fundo para de rolar enquanto o painel está aberto — sem
  // isso o dedo arrasta a página atrás do menu e a pessoa perde o lugar.
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    const overflowAntes = document.body.style.overflow;

    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAntes;
    };
  }, [aberto, aoFechar]);

  if (!aberto || typeof document === 'undefined') return null;

  function ir(destino: string) {
    aoFechar();
    router.push(destino);
  }

  async function sair() {
    aoFechar();
    await supabase.auth.signOut();
    router.replace(R.landing());
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onClick={aoFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
      }}
    >
      <nav
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cor.fundo,
          width: '88%', maxWidth: 380,
          height: '100%', overflowY: 'auto',
          boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          textAlign: 'left',
        }}
      >
        {/* Cabeçalho do painel */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: espaco.sm, padding: espaco.md,
          borderBottom: `2px solid ${cor.borda}`,
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: cor.tinta }}>
            MelhorIA
          </span>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            style={{
              minWidth: toque.min, minHeight: toque.min,
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: cor.fundo, color: cor.tinta, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
            }}
          >
            <X size={30} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ flex: 1, padding: `${espaco.sm}px ${espaco.sm}px` }}>
          {SECOES.map((secao, i) => (
            <div
              key={i}
              style={{
                paddingTop: i === 0 ? 0 : espaco.sm,
                marginTop: i === 0 ? 0 : espaco.sm,
                borderTop: i === 0 ? undefined : `2px solid ${cor.borda}`,
              }}
            >
              {secao.map(({ rotulo, destino, Icone }) => {
                // Marca onde a pessoa está. Sem isso, um menu com dez itens
                // não dá nenhuma pista de onde ela se encontra.
                const atual =
                  caminho === destino ||
                  caminho === `/melhoria${destino}` ||
                  (destino !== R.app() && caminho.startsWith(destino));

                return (
                  <button
                    key={destino}
                    type="button"
                    onClick={() => ir(destino)}
                    aria-current={atual ? 'page' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: espaco.sm,
                      width: '100%', minHeight: toque.confortavel,
                      padding: `${espaco.xs}px ${espaco.sm}px`,
                      marginBottom: 4,
                      borderRadius: raio.botao,
                      border: `2px solid ${atual ? cor.destaque : 'transparent'}`,
                      background: atual ? cor.destaqueSuave : 'transparent',
                      color: atual ? cor.destaqueTexto : cor.tinta,
                      fontSize: 20, fontWeight: 700,
                      textAlign: 'left', cursor: 'pointer', lineHeight: 1.3,
                    }}
                  >
                    <Icone
                      size={30}
                      style={{ color: cor.destaque, flexShrink: 0 }}
                      aria-hidden="true"
                    />
                    <span>{rotulo}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sair fica no rodapé, longe dos itens de navegação, para ninguém
            tocar por engano ao procurar uma seção. */}
        <div style={{ borderTop: `2px solid ${cor.borda}`, padding: espaco.md }}>
          <button
            type="button"
            onClick={sair}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: espaco.xs, width: '100%', minHeight: toque.confortavel,
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: cor.fundo, color: cor.perigoTexto,
              fontSize: 20, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <LogOut size={28} aria-hidden="true" />
            Sair da minha conta
          </button>
        </div>
      </nav>
    </div>,
    document.body,
  );
}
