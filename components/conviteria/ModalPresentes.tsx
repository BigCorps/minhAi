'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, Check, CheckCircle2, Copy, CreditCard, Gift, LayoutGrid,
  List, Loader2, Phone, Plus, QrCode, ShoppingBag, X,
} from 'lucide-react';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import type { PresenteExibicao } from '@/lib/conviteria/tipos';
import {
  LIMITE_PRESENTES_POR_PIX,
  MAX_VALOR_PRESENTE_CENTAVOS,
  MIN_VALOR_PRESENTE_CENTAVOS,
} from '@/lib/conviteria/catalogo';
import './presentes-checkout.css';
import './presentes-cartao.css';

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', {
    style:'currency',
    currency:'BRL',
  });

type Passo =
  | 'escolha'
  | 'dados'
  | 'pagamento'
  | 'gerando'
  | 'gerando_cartao'
  | 'pix'
  | 'pago';

type Modo = 'grid' | 'lista';
type Ordem = 'menor' | 'maior';
type MetodoPagamento = 'pix' | 'cartao';
type ResponsavelTaxa = 'anfitriao' | 'convidado';
type Parcelas = 1 | 2 | 3 | 4 | 5 | 6;

type Selecionado = {
  presente: PresenteExibicao;
  valorLivre: string;
};

const TAXAS_CARTAO_BPS: Record<Parcelas, number> = {
  1: 499,
  2: 709,
  3: 801,
  4: 891,
  5: 980,
  6: 1067,
};

function centavosLivre(v: string) {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function digitosTelefone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11);
}

function mascaraTelefone(v: string) {
  const d = digitosTelefone(v);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function ModalPresentes({
  eventoId, presentes, temaId, fonteId, aoFechar,
}: {
  eventoId: string;
  presentes: PresenteExibicao[];
  temaId: string;
  fonteId: string;
  aoFechar: () => void;
}) {
  const [montado, setMontado] = useState(false);
  const [passo, setPasso] = useState<Passo>('escolha');
  const [modo, setModo] = useState<Modo>('grid');
  const [ordem, setOrdem] = useState<Ordem>('menor');
  const [selecionados, setSelecionados] =
    useState<Record<string, Selecionado>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [verificandoManual, setVerificandoManual] = useState(false);
  const verificandoRef = useRef(false);

  // Novo: escolha do meio de pagamento. PIX continua sendo o padrão.
  const [metodo, setMetodo] = useState<MetodoPagamento>('pix');
  const [telefone, setTelefone] = useState('');
  const [parcelas, setParcelas] = useState<Parcelas>(1);
  const [cartaoConfig, setCartaoConfig] = useState<{
    ativo: boolean;
    taxaResponsavel: ResponsavelTaxa;
    maxParcelas: number;
  } | null>(null);

  const listaOrdenada = useMemo(() => {
    return [...presentes].sort((a, b) => {
      const aLivre = a.valorCentavos <= 0;
      const bLivre = b.valorCentavos <= 0;

      if (aLivre && bLivre) return 0;
      if (aLivre) return 1;
      if (bLivre) return -1;

      return ordem === 'menor'
        ? a.valorCentavos - b.valorCentavos
        : b.valorCentavos - a.valorCentavos;
    });
  }, [presentes, ordem]);

  const [pix, setPix] = useState<{
    checkoutId: string;
    transactionId: string;
    quantidade: number;
    valorCentavos: number;
    qrcode?: string;
    copiaECola?: string;
    expiresAt?: string | null;
  } | null>(null);

  useEffect(() => {
    setMontado(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', onKey);

    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  // Consulta somente as duas informações públicas necessárias ao checkout:
  // cartão ativo e quem assume a taxa. Nenhum dado financeiro do anfitrião
  // é exposto ao convidado.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const r = await fetch(
          `/api/conviteria/presente/cartao/config?evento=${encodeURIComponent(eventoId)}`,
          { cache: 'no-store' }
        );
        const d = await r.json().catch(() => null);

        if (!cancelado && r.ok) {
          setCartaoConfig({
            ativo: d?.ativo !== false,
            taxaResponsavel:
              d?.taxaResponsavel === 'convidado'
                ? 'convidado'
                : 'anfitriao',
            maxParcelas: 6,
          });
          return;
        }
      } catch {
        // O PIX continua funcionando mesmo se a consulta de cartão falhar.
      }

      if (!cancelado) {
        setCartaoConfig({
          ativo: false,
          taxaResponsavel: 'anfitriao',
          maxParcelas: 6,
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [eventoId]);

  useEffect(() => {
    if (cartaoConfig && !cartaoConfig.ativo && metodo === 'cartao') {
      setMetodo('pix');
    }
  }, [cartaoConfig, metodo]);

  const listaSelecionados =
    useMemo(() => Object.values(selecionados), [selecionados]);

  const total = useMemo(() =>
    listaSelecionados.reduce((s, item) =>
      s + (
        item.presente.valorCentavos > 0
          ? item.presente.valorCentavos
          : centavosLivre(item.valorLivre)
      ), 0
    ), [listaSelecionados]);

  // O 1% da ConviteIA continua sem aparecer como acréscimo ao convidado.
  // No cartão, somente a taxa de PROCESSAMENTO pode ser repassada, conforme
  // a escolha do anfitrião. O backend permanece como fonte de verdade.
  const taxaProcessamentoCartao = useMemo(() => {
    const bps = TAXAS_CARTAO_BPS[parcelas];

    return listaSelecionados.reduce((s, item) => {
      const valor =
        item.presente.valorCentavos > 0
          ? item.presente.valorCentavos
          : centavosLivre(item.valorLivre);

      return s + Math.round((valor * bps) / 10_000);
    }, 0);
  }, [listaSelecionados, parcelas]);

  const convidadoAssumeTaxa =
    cartaoConfig?.taxaResponsavel === 'convidado';

  const totalCartao =
    total + (convidadoAssumeTaxa ? taxaProcessamentoCartao : 0);

  const telefoneOk = /^\d{10,11}$/.test(digitosTelefone(telefone));

  const valoresLivresValidos = listaSelecionados.every((item) => {
    if (item.presente.valorCentavos > 0) return true;
    const valor = centavosLivre(item.valorLivre);

    return (
      valor >= MIN_VALOR_PRESENTE_CENTAVOS &&
      valor <= MAX_VALOR_PRESENTE_CENTAVOS
    );
  });

  function alternar(p: PresenteExibicao) {
    if (p.esgotado) return;

    setSelecionados((atual) => {
      if (atual[p.id]) {
        const prox = { ...atual };
        delete prox[p.id];
        setErro(null);
        return prox;
      }

      if (Object.keys(atual).length >= LIMITE_PRESENTES_POR_PIX) {
        setErro(
          `Você pode pagar até ${LIMITE_PRESENTES_POR_PIX} presentes por vez. ` +
          'Finalize este pagamento e depois escolha os demais.'
        );
        return atual;
      }

      setErro(null);
      return {
        ...atual,
        [p.id]: { presente:p, valorLivre:'' },
      };
    });
  }

  function mudarLivre(id: string, valor: string) {
    setSelecionados((atual) => ({
      ...atual,
      [id]: {
        ...atual[id],
        valorLivre: valor.replace(/[^\d,.]/g, ''),
      },
    }));
  }

  const itensParaApi = () =>
    listaSelecionados.map(({ presente, valorLivre }) => ({
      presenteId: presente.id,
      valorCentavos:
        presente.valorCentavos > 0
          ? undefined
          : centavosLivre(valorLivre),
    }));

  async function gerarPix() {
    if (listaSelecionados.length > LIMITE_PRESENTES_POR_PIX) {
      setErro(
        `Escolha até ${LIMITE_PRESENTES_POR_PIX} presentes por pagamento.`
      );
      return;
    }

    if (listaSelecionados.length === 0 || !valoresLivresValidos) {
      setErro(
        `Escolha seus presentes e use valores entre ` +
        `${brl(MIN_VALOR_PRESENTE_CENTAVOS)} e ` +
        `${brl(MAX_VALOR_PRESENTE_CENTAVOS)}.`
      );
      return;
    }

    setPasso('gerando');
    setErro(null);

    try {
      // Fluxo PIX original: endpoint e payload permanecem os mesmos.
      const r = await fetch('/api/conviteria/presente', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({
          eventoId,
          itens: itensParaApi(),
          pagadorNome:nome.trim() || undefined,
          mensagem:mensagem.trim() || undefined,
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(d?.erro ?? 'Não foi possível gerar o PIX.');
        setPasso('pagamento');
        return;
      }

      setPix(d);
      setPasso('pix');
    } catch {
      setErro('Falha de conexão. Tente novamente.');
      setPasso('pagamento');
    }
  }

  async function gerarCartao() {
    if (!cartaoConfig?.ativo) {
      setErro('Pagamento por cartão não está disponível neste convite.');
      return;
    }

    if (!telefoneOk) {
      setErro('Informe um celular válido com DDD para receber a confirmação da InfinitePay.');
      return;
    }

    if (listaSelecionados.length === 0 || !valoresLivresValidos) {
      setErro('Confira os presentes selecionados antes de continuar.');
      return;
    }

    setPasso('gerando_cartao');
    setErro(null);

    try {
      const r = await fetch('/api/conviteria/presente/cartao', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({
          eventoId,
          itens: itensParaApi(),
          pagadorNome:nome.trim() || undefined,
          mensagem:mensagem.trim() || undefined,
          telefone: digitosTelefone(telefone),
          parcelas,
        }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.checkoutUrl) {
        setErro(d?.erro ?? 'Não foi possível abrir o pagamento por cartão.');
        setPasso('pagamento');
        return;
      }

      // A partir daqui os dados do cartão ficam exclusivamente na InfinitePay.
      window.location.assign(d.checkoutUrl);
    } catch {
      setErro('Falha de conexão. Tente novamente.');
      setPasso('pagamento');
    }
  }

  async function verificar(silencioso = false) {
    if (!pix?.checkoutId || verificandoRef.current) return false;

    verificandoRef.current = true;
    if (!silencioso) setVerificandoManual(true);

    try {
      const r = await fetch('/api/conviteria/presente/status', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ checkoutId:pix.checkoutId }),
      });

      const d = await r.json().catch(() => null);

      if (r.ok && d?.pago) {
        setPasso('pago');
        return true;
      }

      return false;
    } finally {
      verificandoRef.current = false;
      if (!silencioso) setVerificandoManual(false);
    }
  }

  // Fluxo PIX original: enquanto o QR está aberto, consulta confirmação.
  useEffect(() => {
    if (passo !== 'pix' || !pix?.checkoutId) return;

    let encerrado = false;

    const atraso = window.setTimeout(() => {
      if (!encerrado) void verificar(true);
    }, 7000);

    const id = window.setInterval(() => {
      if (!encerrado) void verificar(true);
    }, 5000);

    return () => {
      encerrado = true;
      window.clearTimeout(atraso);
      window.clearInterval(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, pix?.checkoutId]);

  async function copiar() {
    if (!pix?.copiaECola) return;

    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro('Não foi possível copiar. Use o QR Code.');
    }
  }

  if (!montado) return null;

  const modal = (
    <div
      className="cv-modal-fundo"
      style={tokensDoConvite(temaId, fonteId)}
      role="dialog"
      aria-modal="true"
      aria-label="Lista de presentes"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        className="cv-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cv-modal-topo">
          <h2>
            {passo === 'escolha' && 'Lista de presentes'}
            {passo === 'dados' && 'Seu presente'}
            {passo === 'pagamento' && 'Pagamento'}
            {(passo === 'gerando' || passo === 'pix') && 'Pagamento PIX'}
            {passo === 'gerando_cartao' && 'Pagamento com cartão'}
            {passo === 'pago' && 'Obrigado!'}
          </h2>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="cv-modal-corpo">
          {erro && (
            <p className="cv-modal-erro">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </p>
          )}

          {passo === 'escolha' && (
            <>
              <div className="cv-presentes-toolbar">
                <span className="cv-presentes-toolbar-info">
                  Escolha um ou mais presentes
                </span>

                <label className="cv-presentes-ordem">
                  <span className="sr-only">Ordenar por</span>
                  <select
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as Ordem)}
                    aria-label="Ordenar presentes"
                  >
                    <option value="menor">Menor preço</option>
                    <option value="maior">Maior preço</option>
                  </select>
                </label>

                <div
                  className="cv-presentes-modos"
                  aria-label="Modo de visualização"
                >
                  <button
                    type="button"
                    className={modo === 'grid' ? 'sel' : ''}
                    onClick={() => setModo('grid')}
                    aria-label="Ver em grade"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    className={modo === 'lista' ? 'sel' : ''}
                    onClick={() => setModo('lista')}
                    aria-label="Ver em lista"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {modo === 'grid' ? (
                <ul className="cv-presentes-grade">
                  {listaOrdenada.map((p) => {
                    const sel = selecionados[p.id];

                    return (
                      <li
                        key={p.id}
                        className={
                          `cv-presente-card${sel ? ' sel' : ''}` +
                          `${p.esgotado ? ' esgotado' : ''}`
                        }
                      >
                        {sel && (
                          <span className="cv-presente-check">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <button
                          type="button"
                          className="cv-presente-card-main"
                          disabled={p.esgotado}
                          onClick={() => alternar(p)}
                        >
                          {p.imagemUrl
                            ? (
                              <img
                                className="cv-presente-card-img"
                                src={p.imagemUrl}
                                alt=""
                                loading="lazy"
                              />
                            )
                            : (
                              <span className="cv-presente-card-sem-img">
                                <Gift className="w-7 h-7" />
                              </span>
                            )
                          }

                          <span className="cv-presente-card-txt">
                            <strong>{p.titulo}</strong>
                            <small>
                              {p.esgotado
                                ? 'Já presenteado'
                                : p.valorCentavos > 0
                                  ? brl(p.valorCentavos)
                                  : 'Você escolhe o valor'}
                            </small>
                          </span>
                        </button>

                        {sel && p.valorCentavos <= 0 && (
                          <div className="cv-presente-livre">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Valor (R$)"
                              value={sel.valorLivre}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => mudarLivre(p.id, e.target.value)}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="cv-presentes-lista-nova">
                  {listaOrdenada.map((p) => {
                    const sel = selecionados[p.id];

                    return (
                      <li
                        key={p.id}
                        className={`cv-presente-linha${sel ? ' sel' : ''}`}
                      >
                        {p.imagemUrl
                          ? <img src={p.imagemUrl} alt="" loading="lazy" />
                          : <span className="cv-presente-linha-foto" />
                        }

                        <div className="cv-presente-linha-info">
                          <strong>{p.titulo}</strong>

                          <small>
                            {p.esgotado
                              ? 'Já presenteado'
                              : p.valorCentavos > 0
                                ? brl(p.valorCentavos)
                                : 'Você escolhe o valor'}
                          </small>

                          {sel && p.valorCentavos <= 0 && (
                            <div
                              className="cv-presente-livre"
                              style={{ margin:'.45rem 0 0' }}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Valor (R$)"
                                value={sel.valorLivre}
                                onChange={(e) => mudarLivre(p.id, e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={p.esgotado}
                          className="cv-presente-toggle"
                          onClick={() => alternar(p)}
                          aria-label={
                            sel
                              ? 'Remover presente'
                              : 'Adicionar presente'
                          }
                        >
                          {sel
                            ? <Check className="w-4 h-4" />
                            : <Plus className="w-4 h-4" />
                          }
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="cv-carrinho-resumo">
                <div className="cv-carrinho-resumo-topo">
                  <span>
                    <ShoppingBag className="inline w-4 h-4 mr-1" />
                    {listaSelecionados.length}{' '}
                    {listaSelecionados.length === 1
                      ? 'presente'
                      : 'presentes'}
                  </span>
                  <strong>{brl(total)}</strong>
                </div>

                <button
                  type="button"
                  className="cv-botao"
                  disabled={
                    listaSelecionados.length === 0 ||
                    !valoresLivresValidos
                  }
                  onClick={() => {
                    setErro(null);
                    setPasso('dados');
                  }}
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {passo === 'dados' && (
            <div className="cv-modal-form">
              <ul className="cv-checkout-itens">
                {listaSelecionados.map(({ presente, valorLivre }) => (
                  <li key={presente.id}>
                    <span>{presente.titulo}</span>
                    <strong>
                      {brl(
                        presente.valorCentavos > 0
                          ? presente.valorCentavos
                          : centavosLivre(valorLivre)
                      )}
                    </strong>
                  </li>
                ))}
              </ul>

              <p className="cv-modal-valor">{brl(total)}</p>

              <label>
                Seu nome <span>(opcional)</span>
                <input
                  type="text"
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Ana Silva"
                />
              </label>

              <label>
                Recado <span>(opcional)</span>
                <textarea
                  maxLength={400}
                  rows={3}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Uma mensagem para o casal"
                />
              </label>

              <div className="cv-modal-acoes">
                <button
                  type="button"
                  className="cv-botao cv-botao-fantasma"
                  onClick={() => setPasso('escolha')}
                >
                  Voltar
                </button>

                <button
                  type="button"
                  className="cv-botao"
                  onClick={() => {
                    setErro(null);
                    setPasso('pagamento');
                  }}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {passo === 'pagamento' && (
            <div className="cv-modal-form">
              <p className="cv-pagamento-titulo">Como deseja pagar?</p>

              <div className="cv-pagamento-metodos">
                <button
                  type="button"
                  className={`cv-pagamento-metodo${metodo === 'pix' ? ' sel' : ''}`}
                  onClick={() => {
                    setMetodo('pix');
                    setErro(null);
                  }}
                >
                  <span className="cv-pagamento-metodo-icone">
                    <QrCode className="w-5 h-5" />
                  </span>
                  <span>
                    <strong>PIX</strong>
                    <small>Pagamento instantâneo</small>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!cartaoConfig?.ativo}
                  className={`cv-pagamento-metodo${metodo === 'cartao' ? ' sel' : ''}`}
                  onClick={() => {
                    setMetodo('cartao');
                    setErro(null);
                  }}
                >
                  <span className="cv-pagamento-metodo-icone">
                    {cartaoConfig === null
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <CreditCard className="w-5 h-5" />
                    }
                  </span>
                  <span>
                    <strong>Cartão de crédito</strong>
                    <small>
                      {cartaoConfig === null
                        ? 'Verificando disponibilidade…'
                        : cartaoConfig.ativo
                          ? 'Parcele em até 6x'
                          : 'Indisponível neste convite'}
                    </small>
                  </span>
                </button>
              </div>

              {metodo === 'pix' && (
                <div className="cv-pagamento-box">
                  <div className="cv-pagamento-linha total">
                    <span>Total</span>
                    <strong>{brl(total)}</strong>
                  </div>

                  <p className="cv-pagamento-nota">
                    O QR Code será gerado na próxima tela e a confirmação
                    acontece automaticamente.
                  </p>
                </div>
              )}

              {metodo === 'cartao' && (
                <>
                  <div className="cv-pagamento-box">
                    <label className="cv-cartao-telefone">
                      <span>
                        <Phone className="w-4 h-4" />
                        Celular
                      </span>

                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={16}
                        value={telefone}
                        onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                        placeholder="(11) 99999-9999"
                      />

                      <small>
                        A InfinitePay usa este número para enviar o código de
                        confirmação do pagamento.
                      </small>
                    </label>
                  </div>

                  <div className="cv-pagamento-box">
                    <span className="cv-cartao-label">Parcelamento</span>

                    <div className="cv-cartao-parcelas">
                      {([1,2,3,4,5,6] as Parcelas[]).map((n) => {
                        const bps = TAXAS_CARTAO_BPS[n];

                        const taxaN =
                          listaSelecionados.reduce((s, item) => {
                            const valor =
                              item.presente.valorCentavos > 0
                                ? item.presente.valorCentavos
                                : centavosLivre(item.valorLivre);

                            return s + Math.round((valor * bps) / 10_000);
                          }, 0);

                        const totalN =
                          total + (convidadoAssumeTaxa ? taxaN : 0);

                        const parcelaAprox = Math.ceil(totalN / n);

                        return (
                          <button
                            type="button"
                            key={n}
                            className={parcelas === n ? 'sel' : ''}
                            onClick={() => setParcelas(n)}
                          >
                            <strong>{n}x</strong>
                            <small>{brl(parcelaAprox)}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cv-pagamento-box cv-cartao-resumo">
                    <div className="cv-pagamento-linha">
                      <span>Presentes</span>
                      <strong>{brl(total)}</strong>
                    </div>

                    {convidadoAssumeTaxa ? (
                      <>
                        <div className="cv-pagamento-linha">
                          <span>
                            Taxa de processamento ({(TAXAS_CARTAO_BPS[parcelas] / 100).toFixed(2).replace('.', ',')}%)
                          </span>
                          <strong>{brl(taxaProcessamentoCartao)}</strong>
                        </div>

                        <div className="cv-pagamento-linha total">
                          <span>Total no cartão</span>
                          <strong>{brl(totalCartao)}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cv-pagamento-linha total">
                          <span>Total no cartão</span>
                          <strong>{brl(total)}</strong>
                        </div>

                        <p className="cv-pagamento-nota">
                          A taxa de processamento do cartão será assumida pelos
                          anfitriões. Você paga somente o valor dos presentes.
                        </p>
                      </>
                    )}

                    <p className="cv-pagamento-nota">
                      Você será direcionado ao checkout seguro da InfinitePay.
                      Os dados do cartão não passam pela ConviteIA.
                    </p>
                  </div>
                </>
              )}

              <div className="cv-modal-acoes">
                <button
                  type="button"
                  className="cv-botao cv-botao-fantasma"
                  onClick={() => setPasso('dados')}
                >
                  Voltar
                </button>

                {metodo === 'pix' ? (
                  <button
                    type="button"
                    className="cv-botao cv-botao-icone"
                    onClick={gerarPix}
                  >
                    <QrCode className="w-4 h-4" />
                    Pagar com PIX
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cv-botao cv-botao-icone"
                    disabled={!cartaoConfig?.ativo || !telefoneOk}
                    onClick={gerarCartao}
                  >
                    <CreditCard className="w-4 h-4" />
                    Continuar para o cartão
                  </button>
                )}
              </div>
            </div>
          )}

          {passo === 'gerando' && (
            <div className="cv-modal-centro">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Gerando o PIX…</p>
            </div>
          )}

          {passo === 'gerando_cartao' && (
            <div className="cv-modal-centro">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Abrindo o pagamento seguro…</p>
              <span className="cv-modal-dica">
                Você será direcionado para a InfinitePay.
              </span>
            </div>
          )}

          {passo === 'pix' && pix && (
            <div className="cv-modal-centro">
              <p className="cv-modal-valor">{brl(pix.valorCentavos)}</p>

              {pix.qrcode && (
                <img
                  src={pix.qrcode}
                  alt="QR Code do PIX"
                  className="cv-modal-qr"
                />
              )}

              <p className="cv-modal-dica">
                Um único PIX para {pix.quantidade}{' '}
                {pix.quantidade === 1 ? 'presente' : 'presentes'}.
              </p>

              {pix.copiaECola && (
                <button
                  type="button"
                  className="cv-botao cv-botao-fantasma cv-botao-icone"
                  onClick={copiar}
                >
                  {copiado
                    ? <Check className="w-4 h-4" />
                    : <Copy className="w-4 h-4" />
                  }
                  {copiado ? 'Código copiado!' : 'Copiar código PIX'}
                </button>
              )}

              <button
                type="button"
                className="cv-botao cv-botao-icone"
                onClick={() => void verificar(false)}
                disabled={verificandoManual}
              >
                {verificandoManual
                  ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verificando…
                    </>
                  )
                  : 'Já paguei — verificar'
                }
              </button>

              <p className="cv-pix-status cv-pix-status-estatico">
                A confirmação acontece automaticamente em segundo plano.
              </p>
            </div>
          )}

          {passo === 'pago' && (
            <div className="cv-modal-centro">
              <CheckCircle2 className="w-12 h-12" />
              <p className="cv-modal-valor">Presentes confirmados!</p>
              <p className="cv-modal-dica">
                Obrigado. O valor foi registrado para os anfitriões e as cotas
                foram atualizadas.
              </p>
              <button
                type="button"
                className="cv-botao"
                onClick={aoFechar}
              >
                Voltar ao convite
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
