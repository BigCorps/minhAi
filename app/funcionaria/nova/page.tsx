'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clipboard,
  Loader2,
  Minus,
  Package,
  Plus,
  QrCode,
  ScanBarcode,
  Search,
  Trash2,
} from 'lucide-react';
import FuncionarIAHeader from '@/components/funcionaria/FuncionarIAHeader';
import { useAssistant } from '@/contexts/AssistantContext';
import {
  buscarProdutoPorEan,
  buscarProdutoPorNome,
  type ProdutoVenda,
} from '@/lib/produtos-venda';
import {
  cancelarCheckoutFuncionarIA,
  criarCheckoutFuncionarIA,
  formatarBRL,
  type FuncionarIACarrinhoItem,
  type FuncionarIACheckoutCriado,
} from '@/lib/funcionaria';

export default function NovaCobrancaPage() {
  const { selectedAssistantId, selectedAssistantName } = useAssistant();
  const scannerRef = useRef<HTMLInputElement>(null);

  const [ean, setEan] = useState('');
  const [buscandoEan, setBuscandoEan] = useState(false);
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<ProdutoVenda[]>([]);
  const [buscandoNome, setBuscandoNome] = useState(false);
  const [itens, setItens] = useState<FuncionarIACarrinhoItem[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [checkout, setCheckout] = useState<FuncionarIACheckoutCriado | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const total = useMemo(
    () => itens.reduce((acc, item) => acc + item.subtotal, 0),
    [itens],
  );

  useEffect(() => {
    scannerRef.current?.focus();
  }, [selectedAssistantId, checkout]);

  useEffect(() => {
    setItens([]);
    setCheckout(null);
    setQrDataUrl(null);
    setErro(null);
  }, [selectedAssistantId]);

  useEffect(() => {
    if (!selectedAssistantId || termo.trim().length < 2 || checkout) {
      setSugestoes([]);
      return;
    }

    let ativo = true;
    const timer = window.setTimeout(async () => {
      setBuscandoNome(true);
      try {
        const produtos = await buscarProdutoPorNome(selectedAssistantId, termo.trim());
        if (ativo) setSugestoes(produtos);
      } catch {
        if (ativo) setSugestoes([]);
      } finally {
        if (ativo) setBuscandoNome(false);
      }
    }, 250);

    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [selectedAssistantId, termo, checkout]);

  useEffect(() => {
    if (!checkout?.qr_url) {
      setQrDataUrl(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(checkout.qr_url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        if (ativo) setQrDataUrl(dataUrl);
      } catch {
        if (ativo) setQrDataUrl(null);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [checkout]);

  function adicionarProduto(produto: ProdutoVenda) {
    setErro(null);
    setItens((atuais) => {
      const existente = atuais.find((item) => item.produto.id === produto.id);
      const novaQuantidade = (existente?.quantidade || 0) + 1;

      if (produto.controla_estoque && novaQuantidade > Number(produto.estoque_atual || 0)) {
        setErro(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}.`);
        return atuais;
      }

      if (existente) {
        return atuais.map((item) =>
          item.produto.id === produto.id
            ? {
                ...item,
                quantidade: novaQuantidade,
                subtotal: novaQuantidade * Number(produto.preco_venda),
              }
            : item,
        );
      }

      return [
        ...atuais,
        {
          produto,
          quantidade: 1,
          subtotal: Number(produto.preco_venda),
        },
      ];
    });

    setEan('');
    setTermo('');
    setSugestoes([]);
    window.setTimeout(() => scannerRef.current?.focus(), 0);
  }

  function alterarQuantidade(produtoId: string, delta: number) {
    setErro(null);
    setItens((atuais) =>
      atuais.flatMap((item) => {
        if (item.produto.id !== produtoId) return [item];

        const quantidade = item.quantidade + delta;
        if (quantidade <= 0) return [];

        if (
          item.produto.controla_estoque &&
          quantidade > Number(item.produto.estoque_atual || 0)
        ) {
          setErro(
            `Estoque insuficiente para ${item.produto.nome}. Disponível: ${item.produto.estoque_atual}.`,
          );
          return [item];
        }

        return [
          {
            ...item,
            quantidade,
            subtotal: quantidade * Number(item.produto.preco_venda),
          },
        ];
      }),
    );
  }

  async function buscarPorEan() {
    if (!selectedAssistantId || checkout) return;
    const codigo = ean.trim();
    if (!codigo) return;

    setBuscandoEan(true);
    setErro(null);
    try {
      const produto = await buscarProdutoPorEan(selectedAssistantId, codigo);
      if (!produto) {
        setErro(`Nenhum produto ativo encontrado com o código ${codigo}.`);
        return;
      }
      adicionarProduto(produto);
    } catch (error: any) {
      setErro(error?.message || 'Erro ao buscar o produto.');
    } finally {
      setBuscandoEan(false);
    }
  }

  async function gerarCheckout() {
    if (!selectedAssistantId || !itens.length) return;

    setCriando(true);
    setErro(null);
    try {
      const criado = await criarCheckoutFuncionarIA({
        companyId: selectedAssistantId,
        itens,
        clienteNome,
        observacoes,
      });
      setCheckout(criado);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível gerar o código da cobrança.');
    } finally {
      setCriando(false);
    }
  }

  async function copiarCodigo() {
    if (!checkout) return;
    await navigator.clipboard.writeText(checkout.codigo);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  async function cancelar() {
    if (!checkout) return;
    setCancelando(true);
    setErro(null);
    try {
      await cancelarCheckoutFuncionarIA(checkout.codigo);
      novaVenda();
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível cancelar a cobrança.');
    } finally {
      setCancelando(false);
    }
  }

  function novaVenda() {
    setItens([]);
    setClienteNome('');
    setObservacoes('');
    setCheckout(null);
    setQrDataUrl(null);
    setCopiado(false);
    setErro(null);
    setEan('');
    setTermo('');
    setSugestoes([]);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <FuncionarIAHeader
        title="Nova cobrança"
        subtitle="Bipe ou pesquise os produtos e envie a venda para o caixa."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#6D28D9]">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {erro && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {!selectedAssistantId ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="font-black text-amber-900">Selecione uma empresa no topo para começar.</p>
          </div>
        ) : checkout ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-lg shadow-violet-950/5 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-100 text-lime-700">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">Venda pronta para o caixa</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                A venda já está em <strong>aguardando pagamento</strong>. O terminal recupera o pedido usando o código abaixo.
              </p>

              <div className="mt-6 rounded-3xl bg-[#111827] p-6 text-center text-white">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Código da cobrança</p>
                <p className="mt-3 font-mono text-4xl font-black tracking-[0.2em] sm:text-5xl">
                  {checkout.codigo}
                </p>
                <p className="mt-4 text-3xl font-black text-[#A3E635]">{formatarBRL(checkout.total)}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Válido até {new Date(checkout.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white transition hover:bg-[#5B21B6]"
                >
                  {copiado ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copiado ? 'Copiado' : 'Copiar código'}
                </button>
                <Link
                  href={`/terminal?codigo=${checkout.codigo}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-[#6D28D9] transition hover:bg-violet-100"
                >
                  <ScanBarcode className="h-4 w-4" />
                  Abrir no terminal
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={novaVenda}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Nova venda
                </button>
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={cancelando}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelando ? 'Cancelando...' : 'Cancelar cobrança'}
                </button>
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#6D28D9]">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-900">QR da venda</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Pode ser lido por scanner 2D ou câmera. Ele abre o terminal já com o código preenchido.
              </p>

              {qrDataUrl ? (
                <div className="mx-auto mt-5 w-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt={`QR da cobrança ${checkout.codigo}`} className="h-64 w-64" />
                </div>
              ) : (
                <div className="mx-auto mt-8 flex h-64 w-64 items-center justify-center rounded-3xl bg-slate-50">
                  <Loader2 className="h-7 w-7 animate-spin text-[#6D28D9]" />
                </div>
              )}

              <p className="mt-5 text-xs text-slate-400">{selectedAssistantName}</p>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <section className="space-y-5">
              <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-[#6D28D9]">
                    <ScanBarcode className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-950">Bipar produto</h2>
                    <p className="text-xs text-slate-500">Scanner USB/2D funciona como teclado e envia Enter.</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    ref={scannerRef}
                    value={ean}
                    onChange={(event) => setEan(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void buscarPorEan();
                      }
                    }}
                    placeholder="Código EAN / barras"
                    inputMode="numeric"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-base text-slate-900 outline-none transition focus:border-[#6D28D9] focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    type="button"
                    onClick={() => void buscarPorEan()}
                    disabled={buscandoEan || !ean.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-[#6D28D9] px-4 text-white disabled:opacity-40"
                    aria-label="Buscar código"
                  >
                    {buscandoEan ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanBarcode className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-700">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-950">Pesquisar por nome</h2>
                    <p className="text-xs text-slate-500">Usa o mesmo cadastro de produtos da minhAi.</p>
                  </div>
                </div>

                <div className="relative mt-4">
                  <input
                    value={termo}
                    onChange={(event) => setTermo(event.target.value)}
                    placeholder="Ex.: Coca-Cola 2L"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#6D28D9] focus:ring-2 focus:ring-violet-100"
                  />
                  {buscandoNome && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
                </div>

                {sugestoes.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                    {sugestoes.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => adicionarProduto(produto)}
                        className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{produto.nome}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {produto.ean ? `EAN ${produto.ean}` : 'Sem EAN'}
                            {produto.controla_estoque ? ` · estoque ${produto.estoque_atual}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-[#6D28D9]">{formatarBRL(Number(produto.preco_venda))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black text-slate-950">Identificação opcional</h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={clienteNome}
                    onChange={(event) => setClienteNome(event.target.value)}
                    placeholder="Nome do cliente (opcional)"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-violet-100"
                  />
                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Observação da venda (opcional)"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Itens da venda</h2>
                  <p className="mt-1 text-xs text-slate-400">{itens.length} produto(s) diferente(s)</p>
                </div>
                <Package className="h-6 w-6 text-[#6D28D9]" />
              </div>

              {itens.length === 0 ? (
                <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <ScanBarcode className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-bold text-slate-500">Bipe ou pesquise o primeiro produto.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {itens.map((item) => (
                    <div key={item.produto.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-900">{item.produto.nome}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatarBRL(Number(item.produto.preco_venda))} / {item.produto.unidade}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setItens((atuais) => atuais.filter((i) => i.produto.id !== item.produto.id))}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          aria-label={`Remover ${item.produto.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.produto.id, -1)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-black text-slate-900">{item.quantidade}</span>
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.produto.id, 1)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-lg font-black text-slate-950">{formatarBRL(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-[#111827] p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-300">Total</span>
                  <span className="text-3xl font-black text-[#A3E635]">{formatarBRL(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void gerarCheckout()}
                disabled={!itens.length || criando}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6D28D9] px-5 py-4 text-base font-black text-white transition hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {criando ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                {criando ? 'Gerando cobrança...' : 'Gerar código para o caixa'}
              </button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
