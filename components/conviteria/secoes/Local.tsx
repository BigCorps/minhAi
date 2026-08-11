'use client';

import type { PropsSecao } from '@/lib/conviteria/tipos';
import { Broto } from '../Ornamentos';

export default function Local({ cfg, secao, modo }: PropsSecao) {
  const l = cfg.local;
  if (!l) return null;
  const c = secao.config ?? {};

  return (
    <section className="cv-secao">
      <Broto className="cv-broto" />
      <h2 className="cv-titulo">{c.titulo ?? 'Localização'}</h2>
      {c.texto && <p className="cv-texto">{c.texto}</p>}

      {l.nome && <p className="cv-local-nome">{l.nome}</p>}
      <p className="cv-local-endereco">
        {l.logradouro}
        {l.bairro && <><br />{l.bairro}</>}
        {l.cidade && <><br />{l.cidade}</>}
        {l.cep && <><br />CEP {l.cep}</>}
      </p>

      {/* Embed vem do google-maps-proxy, para nao expor a key no cliente.
          Sem embed, o convite ainda funciona: fica so o botao. */}
      {l.mapEmbedUrl && !modo.previa && (
        <div className="cv-mapa">
          <iframe
            src={l.mapEmbedUrl}
            title={`Mapa de ${l.nome ?? l.logradouro ?? 'local do evento'}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {l.mapsUrl && (
        <a
          className="cv-botao"
          href={modo.previa ? undefined : l.mapsUrl}
          onClick={modo.previa ? (e) => e.preventDefault() : undefined}
          target={modo.previa ? undefined : '_blank'}
          rel="noopener noreferrer"
        >
          {c.rotuloBotao ?? 'Ver localização'}
        </a>
      )}
    </section>
  );
}
