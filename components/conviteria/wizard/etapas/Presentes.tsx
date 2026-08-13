'use client';

import { useEffect, useState } from 'react';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { brl } from '@/lib/conviteria/precos';
import type { PresenteEscolhido } from '@/lib/conviteria/tipos';
import type { PropsEtapa } from '../Wizard';

export default function Presentes({ estado, despachar }: PropsEtapa) {
  const grupo = acharTipo(estado.cfg.tipoEventoId).grupo;
  const escolhidos = estado.cfg.presentesEscolhidos ?? [];

  const [itens, setItens] = useState<PresenteEscolhido[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // A secao so aparece no convite se estiver ligada na etapa "Seções". Sem
  // este aviso a pessoa escolhe 12 presentes e nao entende por que nada
  // aparece na previa.
  const secaoLigada = estado.cfg.secoes?.some((s) => s.tipo === 'presentes' && s.ativo);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const r = await fetch(`/api/conviteria/catalogo?grupo=${encodeURIComponent(grupo)}`);
        const d = await r.json();
        if (cancelado) return;
        if (!r.ok) throw new Error(d?.erro ?? 'falhou');
        setItens(d.itens);
      } catch {
        if (!cancelado) setErro('Não deu para carregar o catálogo agora.');
      }
    })();

    return () => { cancelado = true; };
  }, [grupo]);

  return (
    <>
      <p className="wz-intro">
        Escolha o que seus convidados podem presentear. Cada item vira um PIX
        que cai direto para vocês, com taxa de 1%.
      </p>

      {!secaoLigada && (
        <p className="wz-aviso">
          A seção de presentes está desligada. Ligue em “Seções” para ela
          aparecer no convite.
        </p>
      )}

      {erro && <p className="wz-status erro">{erro}</p>}
      {!itens && !erro && <p className="wz-status">Carregando catálogo…</p>}

      {itens && (
        <>
          <p className="wz-status">
            {escolhidos.length === 0
              ? 'Nenhum presente escolhido ainda.'
              : `${escolhidos.length} de ${itens.length} escolhidos.`}
          </p>

          <ul className="wz-presentes">
            {itens.map((item) => {
              const sel = escolhidos.some((p) => p.catalogoId === item.catalogoId);
              return (
                <li key={item.catalogoId}>
                  <button
                    type="button"
                    className={`wz-presente${sel ? ' sel' : ''}`}
                    aria-pressed={sel}
                    onClick={() => despachar({ tipo: 'alternarPresente', presente: item })}
                  >
                    {/* Catalogo ainda sem arte: o cartao tem estado proprio
                        para item sem imagem, em vez de <img> quebrada. */}
                    {item.imagemUrl ? (
                      <img src={item.imagemUrl} alt="" className="wz-presente-img" />
                    ) : (
                      <span className="wz-presente-img wz-presente-vazio" aria-hidden="true">
                        🎁
                      </span>
                    )}
                    <span className="wz-presente-titulo">{item.titulo}</span>
                    <span className="wz-presente-valor">
                      {item.valorCentavos > 0 ? brl(item.valorCentavos) : 'Valor livre'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
