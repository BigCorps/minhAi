'use client';

import { useState } from 'react';
import Image from 'next/image';
import LacreArte from './LacreArte';
import type { AjusteLacre } from './LacreArte';
import { PadraoGravado } from './Ornamentos';
import { OrnamentoCanto } from './OrnamentoVisual';
import EtiquetaCurva from './EtiquetaCurva';
import RecortesEnvelope from './RecortesEnvelope';
import './visual.css';

export default function Capa({
  fotoUrl, lacreId, lacreCor, iniciais, logoLacreUrl, lacreAjuste, logoLacreAjuste, envelopeId = 'classico',
  ornamentoId = 'floral', etiquetaId = 'caixa', textoEtiqueta, aoAbrir,
}: {
  fotoUrl?: string;
  lacreId?: string;
  lacreCor?: string;
  iniciais?: string;
  logoLacreUrl?: string | null;
  lacreAjuste?: AjusteLacre;
  logoLacreAjuste?: import('./LacreArte').AjusteLogoLacre;
  envelopeId?: string;
  ornamentoId?: string;
  etiquetaId?: string;
  textoEtiqueta?: string;
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
      <RecortesEnvelope />

      {/* Corpo do envelope: abas lateral esquerda, direita e base.
          Cada uma com um tom levemente diferente do papel, porque e a
          diferenca de tom entre os paineis — e a sombra na juncao — que faz o
          olho ler "envelope de papel dobrado" em vez de "triangulo sobre um
          retangulo". Ficam ATRAS da aba de cima, que e a unica que se move na
          abertura. */}
      <div className="cv-env-corpo" aria-hidden="true">
        <div className="cv-env-lado esquerda" />
        <div className="cv-env-lado direita" />
        <div className="cv-env-base" />
      </div>

      {/* IRMAO da aba, nao filho: elemento dentro de um `clip-path` e cortado
          pelo mesmo recorte, e a sombra projetada seria eliminada exatamente
          na borda onde precisa aparecer. Aqui fora ela some do recorte e
          sobra. Usa o mesmo clip-path da aba via classe compartilhada. */}
      <div className="cv-capa-aba cv-capa-aba-sombra" aria-hidden="true" />

      <div className="cv-capa-aba">
        <PadraoGravado/>
        <div className="cv-capa-vinco"/>
      </div>
      <div className="cv-capa-centro">
        <OrnamentoCanto id={ornamentoId} className="cv-capa-flor esquerda"/>
        <OrnamentoCanto id={ornamentoId} className="cv-capa-flor direita"/>
        <div className="cv-capa-lacre"><LacreArte lacreId={lacreId} lacreCor={lacreCor} iniciais={iniciais} logoUrl={logoLacreUrl} ajuste={lacreAjuste} logoAjuste={logoLacreAjuste} tamanho={116}/></div>
        {/* Curvada acompanha a borda do lacre, como nas pecas de papelaria
            fina. Caixinha e o retangulo reto que ja existia. */}
        {etiquetaId === 'curva' && (
          <EtiquetaCurva texto={textoEtiqueta ?? 'clique para abrir'} tamanho={190} />
        )}
        {etiquetaId === 'caixa' && (
          <span className="cv-capa-etiqueta">{textoEtiqueta ?? 'Clique para abrir'}</span>
        )}
      </div>
    </div>
  );
}
