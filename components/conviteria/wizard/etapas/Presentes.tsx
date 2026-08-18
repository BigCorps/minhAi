'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { brl } from '@/lib/conviteria/precos';
import {
  LIMITE_PRESENTES_CONVITE,
  MAX_VALOR_PRESENTE_CENTAVOS,
  MIN_VALOR_PRESENTE_CENTAVOS,
  pertenceFaixa,
  type FaixaCatalogo,
} from '@/lib/conviteria/catalogo';
import type { PresenteEscolhido } from '@/lib/conviteria/tipos';
import { parecidos, usaFotoDoCatalogo } from '@/lib/conviteria/duplicados';
import type { PropsEtapa } from '../Wizard';
import '../pagamentos-presentes.css';

type ItemCatalogo = PresenteEscolhido & { grupo?: string };

const FAIXAS: Array<{ id: FaixaCatalogo; nome: string }> = [
  { id: 'todos', nome: 'Todos' },
  { id: 'ate-100', nome: 'Até R$ 100' },
  { id: '100-250', nome: 'R$ 100 a R$ 250' },
  { id: 'acima-250', nome: 'Acima de R$ 250' },
  { id: 'livre', nome: 'Valor livre' },
];

const TAXAS_CARTAO = [
  ['1x', '4,99%'],
  ['2x', '7,09%'],
  ['3x', '8,01%'],
  ['4x', '8,91%'],
  ['5x', '9,80%'],
  ['6x', '10,67%'],
] as const;

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

  const cartaoAtivo =
    String(secaoPresentes?.config?.cartaoAtivo ?? 'sim') !== 'nao';

  const taxaCartaoResponsavel =
    String(secaoPresentes?.config?.taxaCartaoResponsavel ?? 'anfitriao') === 'convidado'
      ? 'convidado'
      : 'anfitriao';

  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>({
    titulo: '', valor: '', valorLivre: false, imagemUrl: null,
  });
  const [enviando, setEnviando] = useState(false);
  const [erroPainel, setErroPainel] = useState('');

  const semelhantes =
    editando === 'novo' && rascunho.titulo.trim().length > 4
      ? parecidos(rascunho.titulo, escolhidos)
      : [];

  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    setItens(null);
    setErro(null);

    (async () => {
      try {
        const r = await fetch(
          `/api/conviteria/catalogo?tipo=${encodeURIComponent(estado.cfg.tipoEventoId)}`
        );
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
  const temFotoPropria = escolhidos.some((p) => !usaFotoDoCatalogo(p));

  function configurarPagamento(chave: string, valor: string) {
    despachar({
      tipo: 'configSecao',
      secao: 'presentes',
      chave,
      valor,
    });
  }

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
    if (!titulo) {
      setErroPainel('Dê um nome ao presente.');
      return;
    }

    const centavos = rascunho.valorLivre ? 0 : paraCentavos(rascunho.valor);

    if (
      !rascunho.valorLivre &&
      (
        centavos < MIN_VALOR_PRESENTE_CENTAVOS ||
        centavos > MAX_VALOR_PRESENTE_CENTAVOS
      )
    ) {
      setErroPainel(
        `O valor precisa ficar entre ${brl(MIN_VALOR_PRESENTE_CENTAVOS)} e ` +
        `${brl(MAX_VALOR_PRESENTE_CENTAVOS)}.`
      );
      return;
    }

    if (editando === 'novo') {
      if (noLimite) {
        setErroPainel(`Você chegou ao limite de ${LIMITE_PRESENTES_CONVITE} presentes.`);
        return;
      }

      despachar({
        tipo: 'alternarPresente',
        presente: {
          catalogoId:
            `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
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
          Entre {brl(MIN_VALOR_PRESENTE_CENTAVOS)} e {brl(MAX_VALOR_PRESENTE_CENTAVOS)}.
        </span>
      </label>

      <label className="wz-switch wz-switch-solto">
        <input
          type="checkbox"
          checked={rascunho.valorLivre}
          onChange={(e) =>
            setRascunho((r) => ({ ...r, valorLivre: e.target.checked }))
          }
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
              {enviando
                ? 'Enviando…'
                : rascunho.imagemUrl
                  ? 'Trocar foto'
                  : 'Escolher foto'}
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

      {semelhantes.length > 0 && (
        <div className="wz-alerta wz-alerta-leve">
          <p>Você já escolheu algo parecido:</p>
          <ul>
            {semelhantes.slice(0, 3).map((p) => (
              <li key={p.catalogoId}>
                {p.titulo}{' '}
                <button type="button" onClick={() => abrirEdicao(p)}>
                  Editar este
                </button>
              </li>
            ))}
          </ul>
          <p className="wz-alerta-acao">
            Editar o que já existe evita ficar com os dois na lista.
          </p>
        </div>
      )}

      {erroPainel && <p className="wz-status erro">{erroPainel}</p>}

      <div className="wz-presente-editor-acoes">
        <button
          type="button"
          className="wz-btn wz-btn-fantasma"
          onClick={() => setEditando(null)}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="wz-btn wz-btn-principal"
          onClick={salvar}
          disabled={enviando}
        >
          Salvar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <p className="wz-intro">
        Escolha os presentes do convite. Seus convidados podem pagar por PIX
        e, se você ativar abaixo, também por cartão de crédito. A taxa da
        ConviteIA sobre presentes continua em 1%.
      </p>

      {!secaoLigada && (
        <p className="wz-aviso">
          A seção de presentes está desligada. Ligue em “Seções” para ela aparecer no convite.
        </p>
      )}

      <section className="wz-pagamentos-presentes">
        <div className="wz-pagamentos-cabecalho">
          <div>
            <strong>Pagamentos dos presentes</strong>
            <span>PIX continua disponível. O cartão pode ser parcelado de 1x a 6x.</span>
          </div>

          <label className="wz-pagamentos-toggle">
            <input
              type="checkbox"
              checked={cartaoAtivo}
              onChange={(e) =>
                configurarPagamento(
                  'cartaoAtivo',
                  e.target.checked ? 'sim' : 'nao'
                )
              }
            />
            <span>{cartaoAtivo ? 'Cartão ativo' : 'Cartão desativado'}</span>
          </label>
        </div>

        {cartaoAtivo && (
          <>
            <p className="wz-pagamentos-pergunta">
              Quem assume a taxa de processamento do cartão?
            </p>

            <div className="wz-pagamentos-opcoes">
              <label className={taxaCartaoResponsavel === 'anfitriao' ? 'sel' : ''}>
                <input
                  type="radio"
                  name="taxa-cartao-responsavel"
                  checked={taxaCartaoResponsavel === 'anfitriao'}
                  onChange={() =>
                    configurarPagamento('taxaCartaoResponsavel', 'anfitriao')
                  }
                />
                <span>
                  <strong>Eu assumo a taxa</strong>
                  <small>
                    O convidado paga somente os presentes. A taxa do cartão sai
                    do saldo do evento.
                  </small>
                </span>
              </label>

              <label className={taxaCartaoResponsavel === 'convidado' ? 'sel' : ''}>
                <input
                  type="radio"
                  name="taxa-cartao-responsavel"
                  checked={taxaCartaoResponsavel === 'convidado'}
                  onChange={() =>
                    configurarPagamento('taxaCartaoResponsavel', 'convidado')
                  }
                />
                <span>
                  <strong>Repassar ao convidado</strong>
                  <small>
                    A taxa de processamento é acrescentada ao total do cartão
                    antes de o convidado seguir para a InfinitePay.
                  </small>
                </span>
              </label>
            </div>

            <div className="wz-pagamentos-taxas">
              {TAXAS_CARTAO.map(([parcela, taxa]) => (
                <span key={parcela}>
                  <strong>{parcela}</strong>
                  <small>{taxa}</small>
                </span>
              ))}
            </div>

            <p className="wz-pagamentos-nota">
              Essas porcentagens são do processamento do cartão
              (InfinitePay + BigCorps). O 1% da ConviteIA é separado.
            </p>
          </>
        )}
      </section>

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
              despachar({
                tipo: 'configSecao',
                secao: 'presentes',
                chave: 'titulo',
                valor: e.target.value,
              })
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
              despachar({
                tipo: 'configSecao',
                secao: 'presentes',
                chave: 'texto',
                valor: e.target.value,
              })
            }
          />
        </label>

        <label className="wz-campo">
          <span className="wz-campo-rotulo">Texto do botão</span>
          <input
            type="text"
            className="wz-input"
            maxLength={60}
            value={String(
              secaoPresentes?.config?.rotuloBotao ?? TEXTO_PADRAO.botao
            )}
            onChange={(e) =>
              despachar({
                tipo: 'configSecao',
                secao: 'presentes',
                chave: 'rotuloBotao',
                valor: e.target.value,
              })
            }
          />
        </label>
      </details>

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
                    ? (
                      <img
                        src={p.imagemUrl}
                        alt=""
                        className="wz-escolhido-img"
                        loading="lazy"
                      />
                    )
                    : (
                      <span className="wz-escolhido-img wz-presente-vazio">🎁</span>
                    )}

                  <div className="wz-escolhido-info">
                    <strong>{p.titulo}</strong>
                    <span>
                      {p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Valor livre'}
                    </span>

                    {p.personalizado && (
                      <em className="wz-etiqueta">Criado por você</em>
                    )}

                    {temFotoPropria &&
                      !p.personalizado &&
                      usaFotoDoCatalogo(p) && (
                        <em className="wz-etiqueta wz-etiqueta-leve">
                          Foto padrão
                        </em>
                      )}

                    {!p.personalizado && alterado && (
                      <em className="wz-etiqueta">Editado</em>
                    )}
                  </div>

                  <div className="wz-escolhido-acoes">
                    <button
                      type="button"
                      className="wz-btn-mini"
                      onClick={() => abrirEdicao(p)}
                    >
                      Editar
                    </button>

                    {!p.personalizado && alterado && (
                      <button
                        type="button"
                        className="wz-btn-mini"
                        onClick={() => restaurar(p)}
                      >
                        Restaurar
                      </button>
                    )}

                    <button
                      type="button"
                      className="wz-btn-mini"
                      onClick={() =>
                        despachar({
                          tipo: 'removerPresente',
                          catalogoId: p.catalogoId,
                        })
                      }
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
            <p className="wz-status">
              Nenhum presente encontrado com esse filtro.
            </p>
          ) : (
            <ul className="wz-presentes">
              {filtrados.map((item) => {
                const sel = escolhidos.some(
                  (p) => p.catalogoId === item.catalogoId
                );
                const bloqueado = !sel && noLimite;

                return (
                  <li key={item.catalogoId}>
                    <button
                      type="button"
                      disabled={bloqueado}
                      className={
                        `wz-presente${sel ? ' sel' : ''}` +
                        `${bloqueado ? ' bloqueado' : ''}`
                      }
                      onClick={() => alternar(item)}
                    >
                      {item.imagemUrl
                        ? (
                          <img
                            src={item.imagemUrl}
                            alt=""
                            className="wz-presente-img"
                            loading="lazy"
                          />
                        )
                        : (
                          <span className="wz-presente-img wz-presente-vazio">
                            🎁
                          </span>
                        )}

                      <span className="wz-presente-titulo">{item.titulo}</span>

                      <span className="wz-presente-valor">
                        {item.valorCentavos > 0
                          ? brl(item.valorCentavos)
                          : 'Valor livre'}
                      </span>

                      <span className="wz-presente-estado">
                        {sel ? 'Selecionado' : 'Adicionar'}
                      </span>
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
