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
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Informações importantes'}</h2>
      {c.texto && <p className="cv-texto">{c.texto}</p>}
      <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        {itens.map((item) => {
          const Icone = ICONES[item.tipo] ?? Info;
          return (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 12, alignItems: 'start', padding: '14px', borderRadius: 14, background: 'color-mix(in srgb, var(--cv-acento) 8%, transparent)', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center', color: 'var(--cv-acento-texto)', background: 'color-mix(in srgb, var(--cv-acento) 14%, transparent)' }}><Icone size={18} /></div>
              <div>
                <strong style={{ color: 'var(--cv-tinta)', fontFamily: 'var(--cv-corpo)' }}>{item.titulo}</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--cv-tinta-suave)', fontFamily: 'var(--cv-corpo)', lineHeight: 1.5 }}>{item.texto}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
