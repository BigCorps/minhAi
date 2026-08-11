'use client';

import { useRef, useState } from 'react';
import Convite from './Convite';
import Capa from './Capa';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export default function ConvitePublico({ cfg }: { cfg: ConviteConfig }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [aberto, setAberto] = useState(false);
  const musica = cfg.midia?.musica;
  const arquivo =
    musica?.origem === 'upload' ? musica.arquivoUrl ?? musica.fallbackUrl : undefined;

  function abrir() {
    setAberto(true);
    document.body.classList.remove('cv-travado');
    // Dentro do clique: e assim que o navegador libera o autoplay.
    void audioRef.current?.play().catch(() => undefined);
  }

  return (
    <>
      {/* Sem metadados de Media Session: o titulo apareceria na tela de
          bloqueio do celular de quem abre. */}
      {arquivo && <audio ref={audioRef} src={arquivo} loop preload="auto" />}
      {!aberto && (
        <Capa
          fotoUrl={cfg.midia?.fotoCapa ?? cfg.midia?.fotoPrincipal}
          lacrePath={cfg.lacrePath}
          aoAbrir={abrir}
        />
      )}
      <Convite cfg={cfg} />
    </>
  );
}
