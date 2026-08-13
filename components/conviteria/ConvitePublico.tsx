'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Convite from './Convite';
import Capa from './Capa';
import { ProvedorAudio } from './ContextoAudio';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export default function ConvitePublico({ cfg }: { cfg: ConviteConfig }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [aberto, setAberto] = useState(false);
  const musica = cfg.midia?.musica;
  const arquivo =
    musica?.origem === 'upload' ? musica.arquivoUrl ?? musica.fallbackUrl : undefined;

  const alternar = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }, []);

  // useMemo para o valor do contexto nao trocar de identidade a cada render e
  // rerenderizar a secao Musica sem motivo.
  const audio = useMemo(() => ({ ref: audioRef, alternar }), [alternar]);

  function abrir() {
    setAberto(true);
    document.body.classList.remove('cv-travado');
    // Dentro do clique: e assim que o navegador libera o autoplay.
    void audioRef.current?.play().catch(() => undefined);
  }

  return (
    // As variaveis do tema precisam envolver a Capa TAMBEM. O <Convite> aplica
    // as suas na propria raiz, mas a Capa fica fora dele — e o lacre usa
    // `fill="var(--cv-petala-clara)"`. Variavel indefinida torna a declaracao
    // invalida em tempo de computacao, e `fill` cai para o valor inicial:
    // preto. Era por isso que o lacre saia como um borrao escuro.
    <ProvedorAudio value={audio}>
    <div style={tokensDoConvite(cfg.temaId, cfg.fonteId)}>
      {/* Sem metadados de Media Session: o titulo apareceria na tela de
          bloqueio do celular de quem abre. */}
      {arquivo && <audio ref={audioRef} src={arquivo} loop preload="auto" />}
      {!aberto && (
        <Capa
          fotoUrl={cfg.midia?.fotoCapa ?? cfg.midia?.fotoPrincipal}
          lacreId={cfg.lacreId}
          iniciais={cfg.anfitrioes?.iniciais}
          logoLacreUrl={cfg.logoLacreUrl}
          aoAbrir={abrir}
        />
      )}
      <Convite cfg={cfg} />
    </div>
    </ProvedorAudio>
  );
}
