'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import { requestDeliveryQuote, type DeliveryQuote } from '@/lib/delivery-client';

type Product = {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  imagem_url?: string | null;
  preco_venda: number;
  unidade?: string | null;
  controla_estoque: boolean;
  disponivel: boolean;
  marca?: string | null;
};

type CartItem = { product: Product; quantity: number };

type Props = { slug: string; embedded?: boolean };

function brl(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FuncionarIAPublicSales({ slug, embedded = false }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [orderKey, setOrderKey] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const companyResponse = await fetch(`/api/public/company?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const companyData = await companyResponse.json().catch(() => ({}));
        if (!companyResponse.ok || !companyData?.company?.id || !companyData?.is_funcionaria) {
          throw new Error('FuncionarIA não encontrada.');
        }
        if (active) setProfile(companyData);

        const productResponse = await fetch(
          `/api/public/products?company_id=${encodeURIComponent(companyData.company.id)}&limit=100`,
          { cache: 'no-store' },
        );
        const productData = await productResponse.json().catch(() => ({}));
        if (!productResponse.ok) throw new Error('Não foi possível carregar os produtos.');
        if (active) setProducts(Array.isArray(productData.products) ? productData.products : []);
      } catch (err: any) {
        if (active) setError(err?.message || 'Não foi possível abrir as vendas.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    const checkout = result?.checkout;
    const target = checkout?.qr_url || (checkout?.codigo ? `FUNCIONARIA:${checkout.codigo}` : null);
    if (!target) {
      setQrDataUrl(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const value = await QRCode.toDataURL(String(target), { width: 280, margin: 1, errorCorrectionLevel: 'M' });
        if (active) setQrDataUrl(value);
      } catch {
        if (active) setQrDataUrl(null);
      }
    })();
    return () => { active = false; };
  }, [result]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.nome, product.descricao, product.categoria, product.marca]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [products, query]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.preco_venda * item.quantity, 0),
    [cart],
  );
  const displayTotal = total + (deliveryMode === 'delivery' && deliveryQuote?.customer_pays ? deliveryQuote.price_cents / 100 : 0);

  useEffect(() => {
    setDeliveryQuote(null);
    setDeliveryError(null);
  }, [cart, deliveryAddress, deliveryMode]);

  const primary = profile?.settings?.primary_color || '#6D28D9';
  const secondary = profile?.settings?.secondary_color || '#A3E635';
  const hasCheckout = profile?.active_skill_keys?.includes('checkout_payments') === true;

  function add(product: Product) {
    if (!product.disponivel) return;
    setResult(null);
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      if (found) {
        return current.map((item) => item.product.id === product.id
          ? { ...item, quantity: Math.min(50, item.quantity + 1) }
          : item);
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function change(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const quantity = item.quantity + delta;
      return quantity <= 0 ? [] : [{ ...item, quantity: Math.min(50, quantity) }];
    }));
  }

  async function calculateDelivery() {
    if (!profile?.company?.id || !cart.length || deliveryAddress.trim().length < 8) return;
    setDeliveryLoading(true);
    setDeliveryError(null);
    try {
      const quote = await requestDeliveryQuote({
        companyId: profile.company.id,
        deliveryAddress,
        items: cart.map((item) => ({ produto_id: item.product.id, quantidade: item.quantity })),
      });
      setDeliveryQuote(quote);
    } catch (error: any) {
      const map: Record<string,string> = {
        minimum_order_not_met: 'O pedido ainda não atingiu o valor mínimo para entrega.',
        delivery_outside_radius: 'Este endereço está fora do raio de entrega da loja.',
        delivery_outside_schedule: 'A entrega não está disponível neste horário.',
      };
      setDeliveryError(map[error?.message] || error?.message || 'Não foi possível calcular o frete.');
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function submit() {
    if (!profile?.company?.id || !cart.length || submitting) return;
    if (deliveryMode === 'delivery') {
      if (!deliveryQuote) { setError('Calcule o frete antes de enviar o pedido.'); return; }
      const phone = customerPhone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
      if (phone.length !== 10 && phone.length !== 11) { setError('Informe um telefone com DDD para a entrega.'); return; }
    }
    const requestKey = orderKey || crypto.randomUUID();
    if (!orderKey) setOrderKey(requestKey);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/funcionaria/public-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.company.id,
          cliente_nome: customerName,
          cliente_telefone: deliveryMode === 'delivery' ? customerPhone : null,
          delivery_quote_token: deliveryMode === 'delivery' ? deliveryQuote?.quote_token : null,
          observacoes: notes,
          idempotency_key: requestKey,
          itens: cart.map((item) => ({ produto_id: item.product.id, quantidade: item.quantity })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const message = data?.error === 'insufficient_stock'
          ? `Estoque insuficiente para ${data?.product_name || 'um dos itens'}.`
          : 'Não foi possível concluir o pedido. Atualize a página e tente novamente.';
        throw new Error(message);
      }
      setResult(data);
      setCart([]);
      setOrderKey(crypto.randomUUID());
      setDeliveryMode('pickup');
      setDeliveryAddress('');
      setCustomerPhone('');
      setDeliveryQuote(null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 py-24 text-center text-sm font-bold text-slate-400">Carregando produtos…</main>;
  }

  if (!profile?.company || error && !products.length) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-red-500" />
          <h1 className="mt-4 text-2xl font-black">Não foi possível abrir as vendas</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Empresa não encontrada.'}</p>
        </div>
      </main>
    );
  }

  const company = profile.company;

  return (
    <main className={`${embedded ? 'min-h-0' : 'min-h-screen'} bg-[#F8FAFC] text-slate-950`}>
      <header className={`${embedded ? 'relative' : 'sticky top-0'} z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!embedded ? <Link href="/" aria-label="Voltar" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-5 w-5" /></Link> : null}
            {company.logo_url ? <img src={company.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain" /> : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black">{company.name}</h1>
              <p className="text-xs font-bold text-slate-400">Produtos e pedidos</p>
            </div>
          </div>
          <div className="rounded-full px-3 py-1.5 text-xs font-black" style={{ color: primary, backgroundColor: `${primary}12` }}>
            {cart.length} {cart.length === 1 ? 'item' : 'itens'}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar produto…"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="aspect-[4/3] bg-slate-50">
                    {product.imagem_url ? <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-10 w-10 text-slate-300" /></div>}
                  </div>
                  <div className="p-4">
                    <div className="text-base font-black">{product.nome}</div>
                    {product.descricao ? <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{product.descricao}</p> : <div className="min-h-10" />}
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-lg font-black" style={{ color: primary }}>{brl(product.preco_venda)}</div>
                        {!product.disponivel ? <div className="text-[11px] font-black text-red-500">Sem estoque</div> : null}
                      </div>
                      <button
                        type="button"
                        disabled={!product.disponivel}
                        onClick={() => add(product)}
                        className="rounded-xl px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        style={product.disponivel ? { backgroundColor: primary } : undefined}
                      >Adicionar</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-400">Nenhum produto encontrado.</div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" style={{ color: primary }} /><h2 className="text-lg font-black">Seu pedido</h2></div>

            {result ? (
              <div className="mt-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-lime-500" />
                <h3 className="mt-3 text-xl font-black">Pedido recebido</h3>
                {result.kind === 'checkout' && result.checkout ? (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Mostre o código abaixo no caixa/terminal para escolher a forma de pagamento com segurança.</p>
                    <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
                      <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Código</div>
                      <div className="mt-2 font-mono text-3xl font-black tracking-[.16em]">{result.checkout.codigo}</div>
                      <div className="mt-3 text-2xl font-black" style={{ color: secondary }}>{brl(result.checkout.total)}</div>
                    </div>
                    {qrDataUrl ? <div className="mx-auto mt-4 w-fit rounded-2xl border border-slate-100 bg-white p-3"><img src={qrDataUrl} alt="QR do pedido" className="h-52 w-52" /></div> : null}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-500">A empresa recebeu o pedido. O pagamento será combinado no atendimento.</p>
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-black">Pedido #{String(result?.order?.pedido_id || '').slice(0, 8).toUpperCase()}</div>
                  </>
                )}
                <button type="button" onClick={() => { setResult(null); setCustomerName(''); setNotes(''); }} className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Fazer outro pedido</button>
              </div>
            ) : cart.length ? (
              <>
                <div className="mt-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="truncate text-sm font-black">{item.product.nome}</div><div className="mt-1 text-xs font-bold text-slate-500">{brl(item.product.preco_venda * item.quantity)}</div></div>
                        <button onClick={() => change(item.product.id, -item.quantity)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => change(item.product.id, -1)} className="rounded-lg border border-slate-200 bg-white p-1.5"><Minus className="h-4 w-4" /></button>
                        <span className="min-w-8 text-center text-sm font-black">{item.quantity}</span>
                        <button onClick={() => change(item.product.id, 1)} className="rounded-lg border border-slate-200 bg-white p-1.5"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm font-bold text-slate-500">Total</span><span className="text-2xl font-black">{brl(displayTotal)}</span></div>

                {profile?.company?.delivery_enabled === true && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-black"><Truck className="h-4 w-4" style={{ color: primary }} /> Como quer receber?</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDeliveryMode('pickup')} className={`rounded-xl border px-3 py-2 text-xs font-black ${deliveryMode === 'pickup' ? 'border-violet-300 bg-white text-violet-700' : 'border-slate-200 text-slate-500'}`}>Retirar no local</button>
                      <button type="button" onClick={() => setDeliveryMode('delivery')} className={`rounded-xl border px-3 py-2 text-xs font-black ${deliveryMode === 'delivery' ? 'border-violet-300 bg-white text-violet-700' : 'border-slate-200 text-slate-500'}`}>Receber por entrega</button>
                    </div>
                    {deliveryMode === 'delivery' && (
                      <div className="mt-3 space-y-2">
                        <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Endereço completo para entrega" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
                        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefone com DDD" inputMode="tel" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
                        <button type="button" onClick={() => void calculateDelivery()} disabled={deliveryLoading || deliveryAddress.trim().length < 8} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-black text-[#6D28D9] disabled:opacity-50">{deliveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Calcular entrega</button>
                        {deliveryError && <div className="text-xs font-bold text-red-600">{deliveryError}</div>}
                        {deliveryQuote && (
                          <div className="rounded-xl bg-white p-3 text-xs">
                            <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-500">Entrega</span><span className="font-black text-slate-900">{deliveryQuote.customer_pays ? brl(deliveryQuote.price_cents / 100) : 'Grátis'}</span></div>
                            {(deliveryQuote.eta_minutes != null || deliveryQuote.distance_km != null) && <div className="mt-1 text-[11px] font-semibold text-slate-400">{deliveryQuote.eta_minutes != null ? `Estimativa: ~${deliveryQuote.eta_minutes} min` : ''}{deliveryQuote.eta_minutes != null && deliveryQuote.distance_km != null ? ' • ' : ''}{deliveryQuote.distance_km != null ? `${deliveryQuote.distance_km.toFixed(1)} km` : ''}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome (opcional)" className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-300" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação (opcional)" rows={2} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-300" />
                <button onClick={submit} disabled={submitting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white disabled:opacity-60" style={{ backgroundColor: primary }}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasCheckout ? <QrCode className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Enviando…' : hasCheckout ? 'Gerar pedido e código de pagamento' : 'Enviar pedido'}
                </button>
                {hasCheckout ? <p className="mt-2 text-center text-[11px] leading-4 text-slate-400">O pagamento é confirmado no terminal da empresa; esta página nunca marca uma venda como paga.</p> : null}
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">Adicione produtos para montar o pedido.</div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
