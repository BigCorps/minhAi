'use client';

import { Baby, BusFront, Camera, CarFront, Hotel, Shirt, Info } from 'lucide-react';
import type { InformacaoItem, PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

const ICONES: Record<InformacaoItem['tipo'], typeof Info> = {
  traje: Shirt,
  criancas: Baby,
  estacionamento: CarFront,
  transporte: BusFront,
  hospedagem: Hotel,
  fotos: Camera,
  outro: Info,
};

export default function Informacoes({ cfg, secao }: PropsSecao) {
  const itens = (cfg.informacoes ?? []).filter((x) => x.titulo?.trim() && x.texto?.trim());
  if (!itens.length) return null;
  const c = secao.config ?? {};

  return (
    <section className="cv-secao" style={{ textAlign: 'center' }}>
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Informações importantes'}</h2>
      {c.texto && <p className="cv-texto" style={{ textAlign: 'center' }}>{c.texto}</p>}

      <div style={{ display: 'grid', gap: 14, margin: '20px auto 0', maxWidth: 640 }}>
        {itens.map((item) => {
          const Icone = ICONES[item.tipo] ?? Info;
          return (
            <div
              key={item.id}
              style={{
                padding: '18px 16px',
                borderRadius: 16,
                background: 'color-mix(in srgb, var(--cv-acento) 8%, transparent)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  margin: '0 auto 9px',
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--cv-acento-texto)',
                  background: 'color-mix(in srgb, var(--cv-acento) 14%, transparent)',
                }}
              >
                <Icone size={18} />
              </div>

              <strong style={{ color: 'var(--cv-tinta)', fontFamily: 'var(--cv-corpo)' }}>
                {item.titulo}
              </strong>
              <p
                style={{
                  margin: '5px auto 0',
                  maxWidth: 560,
                  color: 'var(--cv-tinta-suave)',
                  fontFamily: 'var(--cv-corpo)',
                  lineHeight: 1.6,
                  textAlign: 'center',
                }}
              >
                {item.texto}
              </p>

              {item.imagemUrl && (
                <img
                  src={item.imagemUrl}
                  alt={`Referência: ${item.titulo}`}
                  loading="lazy"
                  style={{
                    display: 'block',
                    width: '100%',
                    maxWidth: 520,
                    maxHeight: 360,
                    objectFit: 'cover',
                    margin: '14px auto 0',
                    borderRadius: 14,
                    border: '1px solid color-mix(in srgb, var(--cv-acento) 18%, transparent)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
