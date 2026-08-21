'use client';

// components/melhoria/EscalaTexto.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Aplica o tamanho de letra escolhido a TODAS as telas.
//
// ── POR QUE A CONFIGURAÇÃO NÃO MUDAVA NADA ──────────────────────────────────
// A escala só era usada em `px(fonte.x, escala)` na tela "Meu dia". Todas as
// outras telas têm tamanhos fixos em pixel, então escolher "Gigante" não
// mudava absolutamente nada fora dali — e como cada tela lia o valor do banco
// por conta própria, a impressão era de que a opção não pegava.
//
// ── POR QUE `zoom` E NÃO `font-size` ────────────────────────────────────────
// Aumentar só a fonte quebra layout: o texto cresce, o botão não, e a palavra
// vaza para fora. `zoom` escala o bloco inteiro — texto, botões, ícones,
// espaçamento — proporcionalmente. Para este público isso é o comportamento
// certo: quem escolhe "Gigante" quer TUDO maior, não só a letra.
//
// A compensação de largura (`width: calc(100% / z)`) evita a rolagem
// horizontal que o zoom causaria no celular.
//
// ── POR QUE localStorage ────────────────────────────────────────────────────
// A preferência precisa valer no primeiro frame, antes de qualquer consulta ao
// banco. Ler do Supabase primeiro faria a tela abrir num tamanho e pular para
// outro — desorientador justamente para quem depende do ajuste. O banco
// continua sendo a fonte da verdade entre aparelhos; o localStorage é só o
// cache que evita o pulo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { TamanhoFonte } from '@/lib/melhoria/tema';

export const CHAVE_ESCALA = 'melhoria_tamanho_fonte';

// 'grande' é 1.0 de propósito: é o padrão e corresponde ao que já está no ar
// hoje. Assim quem nunca mexeu não vê nada mudar.
export const FATOR: Record<TamanhoFonte, number> = {
  normal:  0.88,
  grande:  1.00,
  gigante: 1.16,
};

/** Lê a preferência salva. Fora do navegador, devolve o padrão. */
export function lerEscala(): TamanhoFonte {
  if (typeof window === 'undefined') return 'grande';
  const v = window.localStorage.getItem(CHAVE_ESCALA);
  return v === 'normal' || v === 'gigante' || v === 'grande' ? v : 'grande';
}

/**
 * Grava e aplica na hora, em todas as abas abertas.
 *
 * O evento próprio é necessário porque o `storage` nativo do navegador só
 * dispara em OUTRAS abas — nunca na que fez a alteração. Sem ele, a pessoa
 * mudaria o tamanho e não veria efeito até recarregar, que é exatamente o
 * sintoma relatado.
 */
export function aplicarEscala(valor: TamanhoFonte) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHAVE_ESCALA, valor);
  window.dispatchEvent(new CustomEvent('melhoria:escala', { detail: valor }));
}

export default function EscalaTexto({ children }: { children: React.ReactNode }) {
  const [escala, setEscala] = useState<TamanhoFonte>('grande');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setEscala(lerEscala());
    setPronto(true);

    const aoMudar = (e: Event) => {
      const v = (e as CustomEvent).detail as TamanhoFonte;
      if (v) setEscala(v);
    };
    const aoMudarOutraAba = (e: StorageEvent) => {
      if (e.key === CHAVE_ESCALA) setEscala(lerEscala());
    };

    window.addEventListener('melhoria:escala', aoMudar);
    window.addEventListener('storage', aoMudarOutraAba);
    return () => {
      window.removeEventListener('melhoria:escala', aoMudar);
      window.removeEventListener('storage', aoMudarOutraAba);
    };
  }, []);

  const z = FATOR[escala];

  return (
    <div
      // Antes de hidratar usamos 1.0 para não haver salto visível; depois o
      // valor real entra. Como 'grande' (o padrão) já é 1.0, na prática só
      // quem escolheu outro tamanho vê qualquer transição.
      style={
        pronto && z !== 1
          ? {
              zoom: z,
              // Sem a compensação de largura, o zoom faz o conteúdo transbordar
              // e aparece rolagem lateral no celular.
              width: `calc(100% / ${z})`,
              // E sem o auto nas laterais o bloco estreitado encosta na
              // esquerda — era o "fica tudo pra esquerda" no tamanho gigante.
              marginLeft: 'auto',
              marginRight: 'auto',
            }
          : { width: '100%', marginLeft: 'auto', marginRight: 'auto' }
      }
    >
      {children}
    </div>
  );
}
