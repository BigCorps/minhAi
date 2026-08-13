'use client';

import { useState } from 'react';
import Image from 'next/image';
import LacreArte from './LacreArte';
import type { AjusteLacre } from './LacreArte';
import { PadraoGravado } from './Ornamentos';
import { OrnamentoCanto } from './OrnamentoVisual';
import './visual.css';

export default function Capa({
  fotoUrl, lacreId, iniciais, logoLacreUrl, lacreAjuste, envelopeId = 'classico',
  ornamentoId = 'floral', aoAbrir,
}: {
  fotoUrl?: string;
  lacreId?: string;
  iniciais?: string;
  logoLacreUrl?: string | null;
  lacreAjuste?: AjusteLacre;
  envelopeId?: string;
  ornamentoId?: string;
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
      className={`cv-capa envelope-${envelopeId}${abrindo ? ' abrindo' : ''}`}
      role="button" tabIndex={0} aria-label="Abrir o convite"
      onClick={abrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }}
    >
      {fotoUrl && <div className="cv-capa-foto"><Image src={fotoUrl} alt="" fill priority sizes="100vw" style={{ objectFit:'cover' }}/><div className="cv-capa-veu"/></div>}
      <div className="cv-capa-aba"><PadraoGravado/><div className="cv-capa-vinco"/></div>
      <div className="cv-capa-centro">
        <OrnamentoCanto id={ornamentoId} className="cv-capa-flor esquerda"/>
        <OrnamentoCanto id={ornamentoId} className="cv-capa-flor direita"/>
        <div className="cv-capa-lacre"><LacreArte lacreId={lacreId} iniciais={iniciais} logoUrl={logoLacreUrl} ajuste={lacreAjuste} tamanho={116}/></div>
        <span className="cv-capa-etiqueta">Clique para abrir</span>
      </div>
    </div>
  );
}
