'use client';

import { useEffect, useState } from 'react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';
import ModalRecado from '../ModalRecado';

type Recado = { id: string; nome: string; mensagem: string; createdAt: string };

export default function Recados({ cfg, secao, modo }: PropsSecao) {
  const [aberto, setAberto] = useState(false);
  const [recados, setRecados] = useState<Recado[]>([]);
  const c = secao.config ?? {};

  useEffect(() => {
    if (!modo.eventoId || modo.previa) return;
    fetch(`/api/conviteria/recado?evento=${encodeURIComponent(modo.eventoId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setRecados(d?.recados ?? []))
      .catch(() => undefined);
  }, [modo.eventoId, modo.previa]);

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Recados'}</h2>
      <p className="cv-texto">
        {c.texto ?? 'Queremos guardar suas palavras. Deixe um recado no nosso mural.'}
      </p>

      <button
        type="button"
        className="cv-botao"
        disabled={modo.previa || !modo.eventoId}
        onClick={() => setAberto(true)}
      >
        {c.rotuloBotao ?? 'Deixar um recado'}
      </button>

      {recados.length > 0 && (
        <div style={{
          display:'grid', gap:10, maxWidth:340, margin:'22px auto 0',
          textAlign:'left'
        }}>
          {recados.slice(0, 6).map(r => (
            <blockquote key={r.id} style={{
              margin:0, padding:'13px 15px', borderRadius:12,
              border:'1px solid color-mix(in srgb, var(--cv-acento) 22%, transparent)',
              background:'color-mix(in srgb, var(--cv-papel) 90%, var(--cv-acento) 10%)'
            }}>
              <p style={{ margin:0, fontSize:'.86rem', lineHeight:1.55, color:'var(--cv-tinta-suave)' }}>
                “{r.mensagem}”
              </p>
              <cite style={{
                display:'block', marginTop:7, fontStyle:'normal', fontSize:'.72rem',
                fontWeight:600, color:'var(--cv-acento-texto)'
              }}>
                {r.nome}
              </cite>
            </blockquote>
          ))}
        </div>
      )}

      {aberto && modo.eventoId && (
        <ModalRecado
          eventoId={modo.eventoId}
          temaId={cfg.temaId}
          fonteId={cfg.fonteId}
          aoFechar={() => setAberto(false)}
        />
      )}
    </section>
  );
}
