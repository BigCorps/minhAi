'use client';

import { useEffect, useMemo, useState } from 'react';
import { brl } from '@/lib/conviteria/precos';
import { LIMITE_PRESENTES_CONVITE, pertenceFaixa, type FaixaCatalogo } from '@/lib/conviteria/catalogo';
import type { PresenteEscolhido } from '@/lib/conviteria/tipos';
import type { PropsEtapa } from '../Wizard';

type ItemCatalogo = PresenteEscolhido & { grupo?: string };
const FAIXAS: Array<{ id: FaixaCatalogo; nome: string }> = [
  { id: 'todos', nome: 'Todos' },
  { id: 'ate-100', nome: 'Até R$ 100' },
  { id: '100-250', nome: 'R$ 100 a R$ 250' },
  { id: 'acima-250', nome: 'Acima de R$ 250' },
  { id: 'livre', nome: 'Valor livre' },
];

export default function Presentes({ estado, despachar }: PropsEtapa) {
  const escolhidos = estado.cfg.presentesEscolhidos ?? [];
  const [itens, setItens] = useState<ItemCatalogo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [faixa, setFaixa] = useState<FaixaCatalogo>('todos');
  const secaoLigada = estado.cfg.secoes?.some((s) => s.tipo === 'presentes' && s.ativo);

  useEffect(() => {
    let cancelado = false;
    setItens(null); setErro(null);
    (async () => {
      try {
        const r = await fetch(`/api/conviteria/catalogo?tipo=${encodeURIComponent(estado.cfg.tipoEventoId)}`);
        const d = await r.json();
        if (cancelado) return;
        if (!r.ok) throw new Error(d?.erro ?? 'falhou');
        setItens(d.itens);
      } catch {
        if (!cancelado) setErro('Não deu para carregar o catálogo agora.');
      }
    })();
    return () => { cancelado = true; };
  }, [estado.cfg.tipoEventoId]);

  const filtrados = useMemo(() => {
    if (!itens) return [];
    const q = busca.trim().toLocaleLowerCase('pt-BR');
    return itens.filter((item) =>
      (!q || item.titulo.toLocaleLowerCase('pt-BR').includes(q)) &&
      pertenceFaixa(item.valorCentavos, !!item.permiteValorLivre, faixa)
    );
  }, [itens, busca, faixa]);

  function alternar(item: PresenteEscolhido) {
    const ja = escolhidos.some((p) => p.catalogoId === item.catalogoId);
    if (!ja && escolhidos.length >= LIMITE_PRESENTES_CONVITE) return;
    despachar({ tipo: 'alternarPresente', presente: item });
  }

  return (
    <>
      <p className="wz-intro">Escolha os presentes do convite. Seus convidados pagam por PIX e vocês acompanham tudo pelo painel. A taxa do ConviteIA é de 1%.</p>
      {!secaoLigada && <p className="wz-aviso">A seção de presentes está desligada. Ligue em “Seções” para ela aparecer no convite.</p>}
      {erro && <p className="wz-status erro">{erro}</p>}
      {!itens && !erro && <p className="wz-status">Carregando catálogo…</p>}

      {itens && <>
        <div className="wz-catalogo-topo">
          <input type="search" className="wz-input" value={busca} placeholder="Buscar presente…" onChange={(e) => setBusca(e.target.value)} />
          <div className="wz-catalogo-filtros">
            {FAIXAS.map((f) => <button key={f.id} type="button" className={faixa === f.id ? 'sel' : ''} onClick={() => setFaixa(f.id)}>{f.nome}</button>)}
          </div>
        </div>

        <div className="wz-catalogo-resumo">
          <span>{escolhidos.length === 0 ? 'Nenhum presente escolhido.' : `${escolhidos.length} presente${escolhidos.length === 1 ? '' : 's'} escolhido${escolhidos.length === 1 ? '' : 's'}.`}</span>
          <strong>{escolhidos.length}/{LIMITE_PRESENTES_CONVITE}</strong>
        </div>

        {escolhidos.length >= LIMITE_PRESENTES_CONVITE && <p className="wz-aviso wz-catalogo-limite">Você chegou ao limite de {LIMITE_PRESENTES_CONVITE} presentes.</p>}

        {filtrados.length === 0 ? <p className="wz-status">Nenhum presente encontrado com esse filtro.</p> :
        <ul className="wz-presentes">
          {filtrados.map((item) => {
            const sel = escolhidos.some((p) => p.catalogoId === item.catalogoId);
            const bloqueado = !sel && escolhidos.length >= LIMITE_PRESENTES_CONVITE;
            return <li key={item.catalogoId}>
              <button type="button" disabled={bloqueado} className={`wz-presente${sel ? ' sel' : ''}${bloqueado ? ' bloqueado' : ''}`} onClick={() => alternar(item)}>
                {item.imagemUrl ? <img src={item.imagemUrl} alt="" className="wz-presente-img" loading="lazy" /> : <span className="wz-presente-img wz-presente-vazio">🎁</span>}
                <span className="wz-presente-titulo">{item.titulo}</span>
                <span className="wz-presente-valor">{item.valorCentavos > 0 ? brl(item.valorCentavos) : 'Valor livre'}</span>
                <span className="wz-presente-estado">{sel ? 'Selecionado' : 'Adicionar'}</span>
              </button>
            </li>;
          })}
        </ul>}
      </>}
    </>
  );
}
