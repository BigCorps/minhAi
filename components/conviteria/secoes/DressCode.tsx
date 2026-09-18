'use client';

import Image from 'next/image';
import { Shirt } from 'lucide-react';
import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

const TEXTO_PADRAO = 'Para tornar este momento ainda mais especial, sugerimos trajes elegantes e confortáveis para aproveitar toda a celebração.';

export default function DressCode({ cfg, secao }: PropsSecao) {
  const d = cfg.dressCode ?? {};
  const imagens = Array.from(new Set(d.imagens ?? [])).slice(0, 5);
  const texto = d.texto?.trim() || TEXTO_PADRAO;

  return (
    <section className="cv-secao" style={{ textAlign: 'center' }}>
      <Broto className="cv-broto" />
      <div
        aria-hidden="true"
        style={{
          margin: '0 auto 10px',
          width: 44,
          height: 44,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--cv-acento-texto)',
          background: 'color-mix(in srgb, var(--cv-acento) 12%, transparent)',
        }}
      >
        <Shirt size={20} strokeWidth={1.6} />
      </div>

      <h2 className="cv-titulo">{d.titulo?.trim() || secao.config?.titulo || 'Traje'}</h2>
      {d.subtitulo?.trim() && (
        <p
          style={{
            margin: '8px auto 0',
            maxWidth: 540,
            color: 'var(--cv-tinta-suave)',
            fontFamily: 'var(--cv-corpo)',
            lineHeight: 1.6,
          }}
        >
          {d.subtitulo}
        </p>
      )}

      {imagens.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 620,
            margin: '24px auto 0',
            display: 'grid',
            gridTemplateColumns: imagens.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {imagens.map((src, i) => (
            <div
              key={src}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 16,
                minHeight: imagens.length === 1 ? 360 : 190,
                gridColumn: imagens.length > 2 && i === 0 ? '1 / -1' : undefined,
              }}
            >
              <Image
                src={src}
                alt={`Referência de traje ${i + 1}`}
                fill
                sizes="(max-width: 480px) 88vw, 560px"
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>
      )}

      {d.tipo?.trim() && (
        <p
          style={{
            margin: '24px auto 0',
            color: 'var(--cv-acento-texto)',
            fontFamily: 'var(--cv-display)',
            fontSize: 'clamp(22px, 6vw, 34px)',
            fontWeight: 'var(--cv-display-peso)',
            lineHeight: 1.2,
          }}
        >
          {d.tipo}
        </p>
      )}

      <p
        className="cv-texto"
        style={{ marginLeft: 'auto', marginRight: 'auto', maxWidth: 600, textAlign: 'center' }}
      >
        {texto}
      </p>

      {d.evitar?.trim() && (
        <div
          style={{
            margin: '20px auto 0',
            maxWidth: 590,
            padding: '14px 16px',
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--cv-acento) 9%, transparent)',
          }}
        >
          <span
            style={{
              display: 'block',
              marginBottom: 5,
              color: 'var(--cv-acento-texto)',
              fontFamily: 'var(--cv-corpo)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Orientação
          </span>
          <p
            style={{
              margin: 0,
              color: 'var(--cv-tinta)',
              fontFamily: 'var(--cv-corpo)',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            {d.evitar}
          </p>
        </div>
      )}
    </section>
  );
}
