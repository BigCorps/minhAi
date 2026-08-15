'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

/** Piso e teto por item. O mesmo intervalo é validado no servidor, em
    `app/api/conviteria/presente` — aqui é só para avisar antes. */
const MIN_CENTAVOS = 500;
const MAX_CENTAVOS = 500_000;

/** "132,38" ou "132.38" ou "13238" -> centavos. */
function paraCentavos(v: string) {
  const limpo = v.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function paraTexto(centavos: number) {
  return centavos > 0 ? (centavos / 100).toFixed(2).replace('.', ',') : '';
}

interface Rascunho {
  titulo: string;
  valor: string;
  valorLivre: boolean;
  imagemUrl: string | null;
}

/** Os mesmos textos que `secoes/Presentes.tsx` usa quando o config esta vazio.
    Se mudar la, mude aqui — senao o campo mostra um valor que nao corresponde
    ao que aparece no convite. */
const TEXTO_PADRAO = {
  titulo: 'Lista de presentes',
  texto:
    'O maior presente é dividir esse dia com você. Mas, se quiser nos presentear, escolha uma cota.',
  botao: 'Ver lista de presentes',
} as const;

export default function Presentes({ estado, despachar, aoEnviarArquivo }: PropsEtapa) {
  const escolhidos = estado.cfg.presentesEscolhidos ?? [];
  const secaoPresentes = estado.cfg.secoes?.find((s) => s.tipo === 'presentes');
  const [itens, setItens] = useState<ItemCatalogo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [faixa, setFaixa] = useState<FaixaCatalogo>('todos');
  const secaoLigada = estado.cfg.secoes?.some((s) => s.tipo === 'presentes' && s.ativo);

  // `null` = nenhum painel aberto. 'novo' = criando. Qualquer outra string =
  // editando o item com aquele catalogoId.
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>({
    titulo: '', valor: '', valorLivre: false, imagemUrl: null,
  });
  const [enviando, setEnviando] = useState(false);
  const [erroPainel, setErroPainel] = useState('');
  const inputFoto = useRef<HTMLInputElement>(null);

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

  const noLimite = escolhidos.length >= LIMITE_PRESENTES_CONVITE;

  function alternar(item: PresenteEscolhido) {
    const ja = escolhidos.some((p) => p.catalogoId === item.catalogoId);
    if (!ja && noLimite) return;
    despachar({ tipo: 'alternarPresente', presente: item });
  }

  function abrirNovo() {
    setEditando('novo');
    setRascunho({ titulo: '', valor: '', valorLivre: false, imagemUrl: null });
    setErroPainel('');
  }

  function abrirEdicao(p: PresenteEscolhido) {
    setEditando(p.catalogoId);
    setRascunho({
      titulo: p.titulo,
      valor: paraTexto(p.valorCentavos),
      valorLivre: !!p.permiteValorLivre,
      imagemUrl: p.imagemUrl ?? null,
    });
    setErroPainel('');
  }

  async function escolherFoto(arquivo: File) {
    if (!aoEnviarArquivo) return;
    setEnviando(true);
    setErroPainel('');
    try {
      const url = await aoEnviarArquivo('presente', arquivo);
      setRascunho((r) => ({ ...r, imagemUrl: url }));
    } catch {
      setErroPainel('Não deu para enviar a foto. Tente outra, ou salve sem foto.');
    } finally {
      setEnviando(false);
      if (inputFoto.current) inputFoto.current.value = '';
    }
  }

  function salvar() {
    const titulo = rascunho.titulo.trim();
    if (!titulo) { setErroPainel('Dê um nome ao presente.'); return; }

    const centavos = rascunho.valorLivre ? 0 : paraCentavos(rascunho.valor);
    if (!rascunho.valorLivre && (centavos < MIN_CENTAVOS || centavos > MAX_CENTAVOS)) {
      setErroPainel(`O valor precisa ficar entre ${brl(MIN_CENTAVOS)} e ${brl(MAX_CENTAVOS)}.`);
      return;
    }

    if (editando === 'novo') {
      if (noLimite) { setErroPainel(`Você chegou ao limite de ${LIMITE_PRESENTES_CONVITE} presentes.`); return; }
      despachar({
        tipo: 'alternarPresente',
        presente: {
          // Prefixo `custom:` distingue do id do catálogo sem precisar de
          // outra tabela. O sufixo aleatório evita colisão entre dois itens
          // criados no mesmo milissegundo.
          catalogoId: `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          titulo,
          valorCentavos: centavos,
          permiteValorLivre: rascunho.valorLivre,
          imagemUrl: rascunho.imagemUrl,
          personalizado: true,
        },
      });
    } else if (editando) {
      despachar({
        tipo: 'editarPresente',
        catalogoId: editando,
        campos: {
          titulo,
          valorCentavos: centavos,
          permiteValorLivre: rascunho.valorLivre,
          imagemUrl: rascunho.imagemUrl,
        },
      });
    }
    setEditando(null);
  }

  function restaurar(p: PresenteEscolhido) {
    despachar({
      tipo: 'editarPresente',
      catalogoId: p.catalogoId,
      campos: {
        titulo: p.tituloOriginal ?? p.titulo,
        valorCentavos: p.valorOriginalCentavos ?? p.valorCentavos,
        imagemUrl: p.imagemOriginalUrl ?? p.imagemUrl,
      },
    });
    setEditando(null);
  }

  const painel = (
    <div className="wz-presente-editor">
      <label className="wz-campo">
        <span className="wz-campo-rotulo">Nome do presente</span>
        <input
          type="text"
          className="wz-input"
          value={rascunho.titulo}
          maxLength={90}
          placeholder="Jogo de panelas"
          onChange={(e) => setRascunho((r) => ({ ...r, titulo: e.target.value }))}
        />
      </label>

      <label className="wz-campo">
        <span className="wz-campo-rotulo">Valor</span>
        <div className="wz-valor">
          <span>R$</span>
          <input
            type="text"
            inputMode="decimal"
            className="wz-input"
            value={rascunho.valor}
            disabled={rascunho.valorLivre}
            placeholder="132,38"
            onChange={(e) => setRascunho((r) => ({ ...r, valor: e.target.value }))}
          />
        </div>
        <span className="wz-campo-dica">
          Entre {brl(MIN_CENTAVOS)} e {brl(MAX_CENTAVOS)}.
        </span>
      </label>

      <label className="wz-switch wz-switch-solto">
        <input
          type="checkbox"
          checked={rascunho.valorLivre}
          onChange={(e) => setRascunho((r) => ({ ...r, valorLivre: e.target.checked }))}
        />
        <span>Deixar o convidado escolher o valor</span>
      </label>

      <div className="wz-campo">
        <span className="wz-campo-rotulo">Foto</span>
        <div className="wz-presente-foto">
          {rascunho.imagemUrl
            ? <img src={rascunho.imagemUrl} alt="" loading="lazy" />
            : <span className="wz-presente-vazio">🎁</span>}
          <div className="wz-presente-foto-acoes">
            <button
              type="button"
              className="wz-btn-mini"
              disabled={enviando}
              onClick={() => inputFoto.current?.click()}
            >
              {enviando ? 'Enviando…' : rascunho.imagemUrl ? 'Trocar foto' : 'Escolher foto'}
            </button>
            {rascunho.imagemUrl && (
              <button
                type="button"
                className="wz-btn-mini"
                onClick={() => setRascunho((r) => ({ ...r, imagemUrl: null }))}
              >
                Remover
              </button>
            )}
          </div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void escolherFoto(f);
            }}
          />
        </div>
        <span className="wz-campo-dica">JPG, PNG ou WebP. Máximo 2 MB.</span>
      </div>

      {erroPainel && <p className="wz-status erro">{erroPainel}</p>}

      <div className="wz-presente-editor-acoes">
        <button type="button" className="wz-btn wz-btn-fantasma" onClick={() => setEditando(null)}>
          Cancelar
        </button>
        <button type="button" className="wz-btn wz-btn-principal" onClick={salvar} disabled={enviando}>
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <p className="wz-intro">
        Escolha os presentes do convite. Seus convidados pagam por PIX e vocês
        acompanham tudo pelo painel. A taxa do ConviteIA é de 1%.
      </p>
      {!secaoLigada && (
        <p className="wz-aviso">
          A seção de presentes está desligada. Ligue em “Seções” para ela aparecer no convite.
        </p>
      )}

      {/* Mesmo padrão da etapa "Interações", que já deixa editar os textos de
          RSVP e recados. O valor exibido é o do config OU o padrão — nunca
          string vazia, para o convite não mostrar título em branco. */}
      <details className="wz-textos-secao">
        <summary>Textos desta seção no convite</summary>

        <label className="wz-campo">
          <span className="wz-campo-rotulo">Título</span>
          <input
            type="text"
            className="wz-input"
            maxLength={80}
            value={String(secaoPresentes?.config?.titulo ?? TEXTO_PADRAO.titulo)}
            onChange={(e) =>
              despachar({ tipo: 'configSecao', secao: 'presentes', chave: 'titulo', valor: e.target.value })
            }
          />
        </label>

        <label className="wz-campo">
          <span className="wz-campo-rotulo">Frase</span>
          <textarea
            className="wz-input wz-area"
            rows={3}
            maxLength={300}
            value={String(secaoPresentes?.config?.texto ?? TEXTO_PADRAO.texto)}
            onChange={(e) =>
              despachar({ tipo: 'configSecao', secao: 'presentes', chave: 'texto', valor: e.target.value })
            }
          />
        </label>

        <label className="wz-campo">
          <span className="wz-campo-rotulo">Texto do botão</span>
          <input
            type="text"
            className="wz-input"
            maxLength={60}
            value={String(secaoPresentes?.config?.rotuloBotao ?? TEXTO_PADRAO.botao)}
            onChange={(e) =>
              despachar({ tipo: 'configSecao', secao: 'presentes', chave: 'rotuloBotao', valor: e.target.value })
            }
          />
        </label>
      </details>

      {/* Os escolhidos vêm primeiro e em lista própria, não misturados à
          grade: item criado pelo usuário não existe no catálogo e não teria
          onde aparecer. E é aqui que ficam os botões de editar. */}
      <div className="wz-catalogo-resumo">
        <span>
          {escolhidos.length === 0
            ? 'Nenhum presente escolhido.'
            : `${escolhidos.length} presente${escolhidos.length === 1 ? '' : 's'} escolhido${escolhidos.length === 1 ? '' : 's'}.`}
        </span>
        <strong>{escolhidos.length}/{LIMITE_PRESENTES_CONVITE}</strong>
      </div>

      {escolhidos.length > 0 && (
        <ul className="wz-escolhidos">
          {escolhidos.map((p) => {
            const alterado =
              p.tituloOriginal !== undefined ||
              p.valorOriginalCentavos !== undefined ||
              p.imagemOriginalUrl !== undefined;

            return (
              <li key={p.catalogoId}>
                <div className="wz-escolhido">
                  {p.imagemUrl
                    ? <img src={p.imagemUrl} alt="" className="wz-escolhido-img" loading="lazy" />
                    : <span className="wz-escolhido-img wz-presente-vazio">🎁</span>}
                  <div className="wz-escolhido-info">
                    <strong>{p.titulo}</strong>
                    <span>{p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Valor livre'}</span>
                    {p.personalizado && <em className="wz-etiqueta">Criado por você</em>}
                    {!p.personalizado && alterado && <em className="wz-etiqueta">Editado</em>}
                  </div>
                  <div className="wz-escolhido-acoes">
                    <button type="button" className="wz-btn-mini" onClick={() => abrirEdicao(p)}>
                      Editar
                    </button>
                    {!p.personalizado && alterado && (
                      <button type="button" className="wz-btn-mini" onClick={() => restaurar(p)}>
                        Restaurar
                      </button>
                    )}
                    <button
                      type="button"
                      className="wz-btn-mini"
                      onClick={() => despachar({ tipo: 'removerPresente', catalogoId: p.catalogoId })}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                {editando === p.catalogoId && painel}
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="wz-btn wz-btn-novo-presente"
        onClick={abrirNovo}
        disabled={noLimite || editando === 'novo'}
      >
        + Criar presente do zero
      </button>
      {editando === 'novo' && painel}

      {noLimite && (
        <p className="wz-aviso wz-catalogo-limite">
          Você chegou ao limite de {LIMITE_PRESENTES_CONVITE} presentes.
        </p>
      )}

      {erro && <p className="wz-status erro">{erro}</p>}
      {!itens && !erro && <p className="wz-status">Carregando catálogo…</p>}

      {itens && (
        <>
          <h3 className="wz-subtitulo">Sugestões</h3>
          <div className="wz-catalogo-topo">
            <input
              type="search"
              className="wz-input"
              value={busca}
              placeholder="Buscar presente…"
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="wz-catalogo-filtros">
              {FAIXAS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={faixa === f.id ? 'sel' : ''}
                  onClick={() => setFaixa(f.id)}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="wz-status">Nenhum presente encontrado com esse filtro.</p>
          ) : (
            <ul className="wz-presentes">
              {filtrados.map((item) => {
                const sel = escolhidos.some((p) => p.catalogoId === item.catalogoId);
                const bloqueado = !sel && noLimite;
                return (
                  <li key={item.catalogoId}>
                    <button
                      type="button"
                      disabled={bloqueado}
                      className={`wz-presente${sel ? ' sel' : ''}${bloqueado ? ' bloqueado' : ''}`}
                      onClick={() => alternar(item)}
                    >
                      {item.imagemUrl
                        ? <img src={item.imagemUrl} alt="" className="wz-presente-img" loading="lazy" />
                        : <span className="wz-presente-img wz-presente-vazio">🎁</span>}
                      <span className="wz-presente-titulo">{item.titulo}</span>
                      <span className="wz-presente-valor">
                        {item.valorCentavos > 0 ? brl(item.valorCentavos) : 'Valor livre'}
                      </span>
                      <span className="wz-presente-estado">{sel ? 'Selecionado' : 'Adicionar'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
