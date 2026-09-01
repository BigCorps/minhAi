'use client';

// components/conviteria/ContextoAudio.tsx
//
// Existe para resolver um bug concreto: havia DOIS elementos <audio> no
// convite. O ConvitePublico criava um e dava play no clique da capa; a secao
// Musica criava outro e o botao de pausa agia nesse segundo, que nunca tinha
// tocado. Resultado: a musica comecava e nao parava mais.
//
// Agora existe um unico <audio>, dono no ConvitePublico, e quem precisa
// controlar pega a referencia daqui.

import { createContext, useContext } from 'react';

export interface Audio {
  ref: React.RefObject<HTMLAudioElement | null>;
  /** Play/pause do audio de arquivo. Sem efeito quando a origem e YouTube. */
  alternar: () => void;
}

const Ctx = createContext<Audio | null>(null);

export const ProvedorAudio = Ctx.Provider;

/**
 * Devolve null fora do provedor — e o caso da previa do wizard, que renderiza
 * o Convite sem o ConvitePublico em volta. A secao Musica trata esse null
 * mostrando os controles desabilitados em vez de quebrar.
 */
export function useAudio() {
  return useContext(Ctx);
}
