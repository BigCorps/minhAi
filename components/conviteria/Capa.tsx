'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lacre from './Lacre';
import { ArranjoCanto, PadraoGravado } from './Ornamentos';

/**
 * O clique aqui e o gesto do usuario que libera o autoplay do audio.
 * Por isso a capa e overlay na MESMA pagina: se houvesse navegacao, o novo
 * carregamento derrubaria o gesto e a musica exigiria um segundo clique.
 */
export default function Capa({
  fotoUrl, lacrePath, aoAbrir,
}: {
  fotoUrl?: string;
  lacrePath?: string;
  aoAbrir: () => void;
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [oculto, setOculto] = useState(false);

  function abrir() {
    if (abrindo) return;
    setAbrindo(true);
    aoAbrir();
    window.setTimeout(() => setOculto(true), 1300);
  }

  if (oculto) return null;

  return (
    <div
      className={`cv-capa${abrindo ? ' abrindo' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Abrir o convite"
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
      }}
    >
      {fotoUrl && (
        <div className="cv-capa-foto">
          <Image src={fotoUrl} alt="" fill priority sizes="100vw"
                 style={{ objectFit: 'cover' }} />
          <div className="cv-capa-veu" />
        </div>
      )}
      {/* Aba do envelope: gravacao de folhagem por baixo, vinco por cima. O
          vinco e so um retangulo recuado 5px com o mesmo recorte — e ele que
          da a leitura de papel dobrado em vez de triangulo chapado. */}
      <div className="cv-capa-aba">
        <PadraoGravado />
        <div className="cv-capa-vinco" />
      </div>

      <div className="cv-capa-centro">
        {/* Os arranjos ficam FORA do fluxo, ancorados ao centro, para
            emoldurar o lacre sem empurrar a etiqueta para baixo. */}
        <ArranjoCanto className="cv-capa-flor esquerda" />
        <ArranjoCanto className="cv-capa-flor direita" />

        <div className="cv-capa-lacre">
          <Lacre path={lacrePath ?? ''} tamanho={116} />
        </div>
        <span className="cv-capa-etiqueta">Clique para abrir</span>
      </div>
    </div>
  );
}
