'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Convite from './Convite';
import Capa from './Capa';
import { ProvedorAudio } from './ContextoAudio';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import type { ConviteConfig } from '@/lib/conviteria/tipos';

export default function ConvitePublico({
  cfg,
  eventoId,
  modoTeste = false,
}: {
  cfg: ConviteConfig;
  eventoId?: string;
  modoTeste?: boolean;
}) {
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

  const audio = useMemo(() => ({ ref: audioRef, alternar }), [alternar]);

  function abrir() {
    setAberto(true);
    document.body.classList.remove('cv-travado');
    void audioRef.current?.play().catch(() => undefined);
  }

  return (
    <ProvedorAudio value={audio}>
    <div style={tokensDoConvite(cfg.temaId, cfg.fonteId)}>
      {arquivo && <audio ref={audioRef} src={arquivo} loop preload="auto" />}
      {!aberto && (
        <Capa
          fotoUrl={cfg.midia?.fotoCapa ?? cfg.midia?.fotoPrincipal}
          lacreId={cfg.lacreId}
          lacreCor={cfg.lacreCor}
          iniciais={cfg.anfitrioes?.iniciais}
          logoLacreUrl={cfg.logoLacreUrl}
          lacreAjuste={cfg.lacreAjuste}
          logoLacreAjuste={cfg.logoLacreAjuste}
          envelopeId={cfg.envelopeId}
          ornamentoId={cfg.ornamentoId}
          etiquetaId={cfg.etiquetaId}
          textoEtiqueta={cfg.textoEtiqueta}
          texturaId={cfg.texturaId}
          temaId={cfg.temaId}
          aoAbrir={abrir}
        />
      )}
      <Convite
        cfg={cfg}
        revelando={aberto}
        modo={{ eventoId, iniciarMidia: aberto, teste: modoTeste }}
      />
    </div>
    </ProvedorAudio>
  );
}
