'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { brl, PLANOS } from '@/lib/conviteria/precos';
import { normalizarSlug, sugerirSlug } from '@/lib/conviteria/slug';
import { SUFIXO_SLUG } from '@/lib/conviteria/marca';
import { Campo } from '../Campos';
import type { PropsEtapa } from '../Wizard';

type Estado = 'ocioso' | 'checando' | 'livre' | 'ocupado';

export default function Publicar({ estado: wz, despachar }: PropsEtapa) {
  const sugestao = useMemo(
    () => sugerirSlug(wz.cfg.anfitrioes.exibicao || 'meu-convite'),
    [wz.cfg.anfitrioes.exibicao]
  );
  const [slug, setSlug] = useState(sugestao);
  const [situacao, setSituacao] = useState<Estado>('ocioso');
  const [motivo, setMotivo] = useState('');
  const [plano, setPlano] = useState<'avulso' | 'mensal'>('avulso');
  const requisicao = useRef(0);

  // Debounce + numero de sequencia: sem ele, uma resposta lenta de uma
  // digitacao antiga sobrescreve o resultado da digitacao atual.
  useEffect(() => {
    if (!slug) { setSituacao('ocioso'); return; }
    setSituacao('checando');
    const meu = ++requisicao.current;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/conviteria/slug?slug=${encodeURIComponent(slug)}`);
        const j = (await r.json()) as { livre: boolean; motivo?: string };
        if (meu !== requisicao.current) return;
        setSituacao(j.livre ? 'livre' : 'ocupado');
        setMotivo(j.motivo ?? '');
      } catch {
        if (meu === requisicao.current) { setSituacao('ocioso'); setMotivo(''); }
      }
    }, 450);
    return () => clearTimeout(id);
  }, [slug]);

  useEffect(() => {
    despachar({ tipo: 'campo', caminho: 'publicacao.slug', valor: slug });
    despachar({ tipo: 'campo', caminho: 'publicacao.planoId', valor: plano });
  }, [slug, plano, despachar]);

  return (
    <>
      <Campo
        rotulo="Endereço do convite"
        dica="É o link que você vai enviar. Escolha com calma: mudar depois quebra os links já compartilhados."
      >
        <div className="wz-slug">
          <input
            type="text"
            className="wz-input"
            value={slug}
            maxLength={30}
            onChange={(e) => setSlug(normalizarSlug(e.target.value))}
            aria-describedby="wz-slug-situacao"
          />
          <span className="wz-slug-dominio">{SUFIXO_SLUG}</span>
        </div>
      </Campo>

      <p id="wz-slug-situacao" className={`wz-slug-situacao ${situacao}`} role="status">
        {situacao === 'checando' && 'Verificando…'}
        {situacao === 'livre' && `Disponível: ${slug}${SUFIXO_SLUG}`}
        {situacao === 'ocupado' && motivo}
      </p>

      <fieldset className="wz-grupo">
        <legend>Plano</legend>
        {PLANOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`wz-plano${plano === p.id ? ' sel' : ''}`}
            aria-pressed={plano === p.id}
            onClick={() => setPlano(p.id)}
          >
            <span className="wz-plano-topo">
              <span className="wz-plano-nome">{p.nome}</span>
              <span className="wz-plano-preco">
                {brl(p.centavos)}
                {p.periodo && <small> {p.periodo}</small>}
              </span>
            </span>
            <span className="wz-plano-desc">{p.descricao}</span>
            <ul className="wz-plano-lista">
              {p.destaques.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </button>
        ))}
      </fieldset>

      <p className="wz-aviso">
        Presentes recebidos por PIX têm taxa de 1%. O valor fica disponível
        para saque pelos anfitriões, mediante CPF.
      </p>
      <p className="wz-aviso">
        Convite publicado continua no ar mesmo se o plano mensal for
        cancelado. O plano libera a criação de convites novos.
      </p>
    </>
  );
}
