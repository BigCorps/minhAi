'use client';

import type { PropsEtapa } from '../Wizard';
import { ORNAMENTOS, ENVELOPES } from '@/lib/conviteria/visual';
import { OrnamentoCanto } from '../../OrnamentoVisual';

export default function Visual({ estado, despachar }: PropsEtapa) {
  return (
    <>
      <p className="wz-intro">Escolha o ornamento. As cores acompanham automaticamente a paleta do convite.</p>
      <div className="wz-visual-grid">
        {ORNAMENTOS.map(o => {
          const sel = (estado.cfg.ornamentoId ?? 'floral') === o.id;
          return <button key={o.id} type="button" className={`wz-visual-card${sel?' sel':''}`}
            onClick={() => despachar({ tipo:'campo', caminho:'ornamentoId', valor:o.id })}>
            <OrnamentoCanto id={o.id}/><span>{o.nome}</span>
          </button>;
        })}
      </div>

      <p className="wz-intro" style={{marginTop:'1.25rem'}}>Formato da aba do envelope.</p>
      <div className="wz-visual-grid">
        {ENVELOPES.map(e => {
          const sel = (estado.cfg.envelopeId ?? 'classico') === e.id;
          return <button key={e.id} type="button" className={`wz-visual-card${sel?' sel':''}`}
            onClick={() => despachar({ tipo:'campo', caminho:'envelopeId', valor:e.id })}>
            <span style={{display:'block',height:52,position:'relative',overflow:'hidden',marginBottom:6}}>
              <span className={`cv-capa envelope-${e.id}`} style={{position:'absolute',inset:0,minHeight:52,height:52,pointerEvents:'none'}}>
                <span className="cv-capa-aba" style={{height:52}} />
              </span>
            </span>
            <span>{e.nome}</span>
          </button>;
        })}
      </div>
    </>
  );
}
