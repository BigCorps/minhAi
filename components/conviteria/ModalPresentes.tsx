'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, Check, CheckCircle2, Copy, Gift, LayoutGrid,
  List, Loader2, Plus, ShoppingBag, X,
} from 'lucide-react';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import { calcularTaxa } from '@/lib/conviteria/precos';
import type { PresenteExibicao } from '@/lib/conviteria/tipos';
import './presentes-checkout.css';

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

type Passo = 'escolha' | 'dados' | 'gerando' | 'pix' | 'pago';
type Modo = 'grid' | 'lista';
type Ordem = 'padrao' | 'menor' | 'maior';

type Selecionado = {
  presente: PresenteExibicao;
  valorLivre: string;
};

function centavosLivre(v: string) {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
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
  // 'padrao' preserva a ordem que o casal montou no wizard — e uma escolha
  // deles, nao um acaso, entao e o padrao.
  const [ordem, setOrdem] = useState<Ordem>('padrao');
  const [selecionados, setSelecionados] = useState<Record<string, Selecionado>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [verificandoManual, setVerificandoManual] = useState(false);
  const verificandoRef = useRef(false);

  const listaOrdenada = useMemo(() => {
    if (ordem === 'padrao') return presentes;
    // Valor livre (0) vai sempre para o fim: nao tem preco para comparar, e
    // no topo da lista "crescente" pareceria o item mais barato.
    const peso = (p: PresenteExibicao) =>
      p.valorCentavos > 0 ? p.valorCentavos : Number.POSITIVE_INFINITY;
    return [...presentes].sort((a, b) =>
      ordem === 'menor' ? peso(a) - peso(b) : peso(b) - peso(a)
    );
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  const listaSelecionados = useMemo(() => Object.values(selecionados), [selecionados]);

  const total = useMemo(() =>
    listaSelecionados.reduce((s, item) =>
      s + (item.presente.valorCentavos > 0
        ? item.presente.valorCentavos
        : centavosLivre(item.valorLivre)), 0
    ), [listaSelecionados]);

  const taxaTotal = useMemo(
    () => listaSelecionados.reduce((s, item) => {
      const valor = item.presente.valorCentavos > 0
        ? item.presente.valorCentavos
        : centavosLivre(item.valorLivre);
      return s + (valor > 0 ? calcularTaxa(valor).taxa : 0);
    }, 0),
    [listaSelecionados]
  );

  const liquidoTotal = Math.max(0, total - taxaTotal);

  const valoresLivresValidos = listaSelecionados.every((item) =>
    item.presente.valorCentavos > 0 || centavosLivre(item.valorLivre) >= 500
  );

  function alternar(p: PresenteExibicao) {
    if (p.esgotado) return;
    setErro(null);
    setSelecionados((atual) => {
      if (atual[p.id]) {
        const prox = { ...atual };
        delete prox[p.id];
        return prox;
      }
      return {
        ...atual,
        [p.id]: { presente:p, valorLivre:'' },
      };
    });
  }

  function mudarLivre(id: string, valor: string) {
    setSelecionados((atual) => ({
      ...atual,
      [id]: { ...atual[id], valorLivre:valor.replace(/[^\d,.]/g, '') },
    }));
  }

  async function gerar() {
    if (listaSelecionados.length === 0 || !valoresLivresValidos) {
      setErro('Escolha seus presentes e confira os valores.');
      return;
    }

    setPasso('gerando');
    setErro(null);

    try {
      const r = await fetch('/api/conviteria/presente', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({
          eventoId,
          itens:listaSelecionados.map(({ presente, valorLivre }) => ({
            presenteId:presente.id,
            valorCentavos:presente.valorCentavos > 0
              ? undefined
              : centavosLivre(valorLivre),
          })),
          pagadorNome:nome.trim() || undefined,
          mensagem:mensagem.trim() || undefined,
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(d?.erro ?? 'Não foi possível gerar o PIX.');
        setPasso('dados');
        return;
      }

      setPix(d);
      setPasso('pix');
    } catch {
      setErro('Falha de conexão. Tente novamente.');
      setPasso('dados');
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

  // Igual ao checkout minhAi: enquanto o QR está aberto, consulta confirmação.
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
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo">
          <h2>
            {passo === 'escolha' && 'Lista de presentes'}
            {passo === 'dados' && 'Seu presente'}
            {(passo === 'gerando' || passo === 'pix') && 'Pagamento'}
            {passo === 'pago' && 'Obrigado!'}
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="cv-modal-corpo">
          {erro && (
            <p className="cv-modal-erro">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erro}
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
                    <option value="padrao">Ordem do casal</option>
                    <option value="menor">Menor preço</option>
                    <option value="maior">Maior preço</option>
                  </select>
                </label>

                <div className="cv-presentes-modos" aria-label="Modo de visualização">
                  <button type="button" className={modo === 'grid' ? 'sel' : ''}
                    onClick={() => setModo('grid')} aria-label="Ver em grade">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button type="button" className={modo === 'lista' ? 'sel' : ''}
                    onClick={() => setModo('lista')} aria-label="Ver em lista">
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {modo === 'grid' ? (
                <ul className="cv-presentes-grade">
                  {listaOrdenada.map((p) => {
                    const sel = selecionados[p.id];
                    return (
                      <li key={p.id}
                        className={`cv-presente-card${sel ? ' sel' : ''}${p.esgotado ? ' esgotado' : ''}`}>
                        {sel && <span className="cv-presente-check"><Check className="w-3.5 h-3.5" /></span>}
                        <button type="button" className="cv-presente-card-main"
                          disabled={p.esgotado} onClick={() => alternar(p)}>
                          {p.imagemUrl
                            ? <img className="cv-presente-card-img" src={p.imagemUrl} alt="" loading="lazy" />
                            : <span className="cv-presente-card-sem-img"><Gift className="w-7 h-7" /></span>}
                          <span className="cv-presente-card-txt">
                            <strong>{p.titulo}</strong>
                            <small>
                              {p.esgotado ? 'Já presenteado'
                                : p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Você escolhe o valor'}
                            </small>
                          </span>
                        </button>
                        {sel && p.valorCentavos <= 0 && (
                          <div className="cv-presente-livre">
                            <input
                              type="text" inputMode="decimal"
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
                      <li key={p.id} className={`cv-presente-linha${sel ? ' sel' : ''}`}>
                        {p.imagemUrl
                          ? <img src={p.imagemUrl} alt="" loading="lazy" />
                          : <span className="cv-presente-linha-foto" />}
                        <div className="cv-presente-linha-info">
                          <strong>{p.titulo}</strong>
                          <small>
                            {p.esgotado ? 'Já presenteado'
                              : p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Você escolhe o valor'}
                          </small>
                          {sel && p.valorCentavos <= 0 && (
                            <div className="cv-presente-livre" style={{ margin:'.45rem 0 0' }}>
                              <input type="text" inputMode="decimal"
                                placeholder="Valor (R$)" value={sel.valorLivre}
                                onChange={(e) => mudarLivre(p.id, e.target.value)} />
                            </div>
                          )}
                        </div>
                        <button type="button" disabled={p.esgotado}
                          className="cv-presente-toggle"
                          onClick={() => alternar(p)}
                          aria-label={sel ? 'Remover presente' : 'Adicionar presente'}>
                          {sel ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="cv-carrinho-resumo">
                <p className="cv-taxa-aviso">
                  Taxa de serviço de 1% descontada do valor repassado aos anfitriões.
                </p>
                <div className="cv-carrinho-resumo-topo">
                  <span>
                    <ShoppingBag className="inline w-4 h-4 mr-1" />
                    {listaSelecionados.length} {listaSelecionados.length === 1 ? 'presente' : 'presentes'}
                  </span>
                  <strong>{brl(total)}</strong>
                </div>
                <button type="button" className="cv-botao"
                  disabled={listaSelecionados.length === 0 || !valoresLivresValidos}
                  onClick={() => { setErro(null); setPasso('dados'); }}>
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
                      {brl(presente.valorCentavos > 0
                        ? presente.valorCentavos
                        : centavosLivre(valorLivre))}
                    </strong>
                  </li>
                ))}
              </ul>

              <p className="cv-modal-valor">{brl(total)}</p>

              <div className="cv-taxa-resumo">
                <span>
                  <span>Taxa de serviço (1%)</span>
                  <strong>- {brl(taxaTotal)}</strong>
                </span>
                <small>Descontada do repasse, não adicionada ao seu PIX.</small>
                <span className="liquido">
                  <span>Líquido aos anfitriões</span>
                  <strong>{brl(liquidoTotal)}</strong>
                </span>
              </div>

              <label>
                Seu nome <span>(opcional)</span>
                <input type="text" maxLength={80} value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Ana Silva" />
              </label>

              <label>
                Recado <span>(opcional)</span>
                <textarea maxLength={400} rows={3} value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Uma mensagem para o casal" />
              </label>

              <div className="cv-modal-acoes">
                <button type="button" className="cv-botao cv-botao-fantasma"
                  onClick={() => setPasso('escolha')}>Voltar</button>
                <button type="button" className="cv-botao" onClick={gerar}>Gerar PIX</button>
              </div>
            </div>
          )}

          {passo === 'gerando' && (
            <div className="cv-modal-centro">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Gerando o PIX…</p>
            </div>
          )}

          {passo === 'pix' && pix && (
            <div className="cv-modal-centro">
              <p className="cv-modal-valor">{brl(pix.valorCentavos)}</p>

              {pix.qrcode && (
                <img src={pix.qrcode} alt="QR Code do PIX" className="cv-modal-qr" />
              )}

              <p className="cv-modal-dica">
                Um único PIX para {pix.quantidade} {pix.quantidade === 1 ? 'presente' : 'presentes'}.
              </p>

              {pix.copiaECola && (
                <button type="button" className="cv-botao cv-botao-fantasma cv-botao-icone" onClick={copiar}>
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</>
                  : 'Já paguei — verificar'}
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
                Obrigado. O valor foi registrado para os anfitriões e as cotas foram atualizadas.
              </p>
              <button type="button" className="cv-botao" onClick={aoFechar}>
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
