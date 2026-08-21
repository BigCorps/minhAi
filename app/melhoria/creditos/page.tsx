'use client';

// app/melhoria/creditos/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Vitrine de créditos.
//
// ── REAPROVEITAMENTO TOTAL DO BACKEND ───────────────────────────────────────
// Nenhuma rota nova, nenhuma edge function nova. É o mesmo fluxo do
// app/arte/perfil/page.tsx, que já roda em produção:
//
//   POST /api/credits/purchase      { package_id }
//        → edge gerar-cobranca-creditos { user_id, package_id }
//        → { payment_id, pix_code, pix_qrcode, amount }
//
//   POST /api/credits/verify-payment { payment_id }
//        → edge verificar-pagamento-creditos
//        → { success, status: 'paid' }
//
// O que muda é só a camada visual e o filtro package_type = 'melhoria'.
//
// ── QUEM PAGA NÃO É QUEM USA ────────────────────────────────────────────────
// Esta tela é para o CUIDADOR, não para o idoso. Por isso ela fala em reais e
// mostra o QR Code — coisas que a tela principal do idoso nunca mostra. Lá o
// saldo aparece só como "restam 12 usos".
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Copy, Loader2, QrCode } from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { cor, toque, raio, espaco, descreverCreditos } from '@/lib/melhoria/tema';
import { Pagina, Carregando } from '@/components/melhoria/Chrome';

interface Pacote {
  id: string;
  name: string;
  description: string | null;
  interactions: number;
  price_cents: number;
  is_highlighted: boolean;
}

interface Pagamento {
  payment_id: string;
  pix_code: string;
  pix_qrcode: string;
  amount: number;
  pacote: string;
  creditos: number;
}

export default function CreditosPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();

  const [carregando, setCarregando] = useState(true);
  const [saldo, setSaldo]           = useState(0);
  const [pacotes, setPacotes]       = useState<Pacote[]>([]);
  const [comprando, setComprando]   = useState<string | null>(null);
  const [pagamento, setPagamento]   = useState<Pagamento | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pago, setPago]             = useState(false);
  const [copiado, setCopiado]       = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    const [{ data: cred }, { data: pkgs }] = await Promise.all([
      supabase.from('user_credits')
        .select('available_credits').eq('user_id', sessao.user.id).maybeSingle(),
      supabase.from('credits_packages')
        .select('id, name, description, interactions, price_cents, is_highlighted')
        .eq('is_active', true)
        .eq('package_type', 'melhoria')   // vitrine própria, não mistura marcas
        .gt('price_cents', 0)
        .order('display_order'),
    ]);

    setSaldo(cred?.available_credits ?? 0);
    setPacotes((pkgs as any) ?? []);
    setCarregando(false);
  }, [supabase, router]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Compra: idêntica ao handlePurchase da ArteFinal ────────────────────
  async function comprar(pacote: Pacote) {
    setComprando(pacote.id);
    setErro(null);
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pacote.id }),
      });
      const dados = await res.json();
      if (!res.ok || !dados.success) throw new Error(dados.error ?? 'falhou');

      setPagamento({
        payment_id: dados.payment_id,
        pix_code: dados.pix_code,
        pix_qrcode: dados.pix_qrcode,
        amount: dados.amount,
        pacote: pacote.name,
        creditos: pacote.interactions,
      });
    } catch {
      setErro('Não consegui gerar o pagamento. Tente de novo em instantes.');
    } finally {
      setComprando(null);
    }
  }

  async function confirmar() {
    if (!pagamento || confirmando) return;
    setConfirmando(true);
    try {
      const res = await fetch('/api/credits/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: pagamento.payment_id }),
      });
      const dados = await res.json();

      if (dados.success && dados.status === 'paid') {
        setPago(true);
        await carregar();
        setTimeout(() => { setPagamento(null); setPago(false); }, 3000);
      } else {
        setErro('O banco ainda não confirmou. Espere alguns segundos e toque de novo.');
      }
    } catch {
      setErro('Não consegui verificar. Tente de novo.');
    } finally {
      setConfirmando(false);
    }
  }

  // Verificação automática a cada 5s — mesmo intervalo do PixLinkPage.
  useEffect(() => {
    if (!pagamento || pago) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/credits/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: pagamento.payment_id }),
        });
        const d = await res.json();
        if (d.success && d.status === 'paid') {
          setPago(true);
          clearInterval(t);
          await carregar();
        }
      } catch { /* silencioso: checagem automática não incomoda */ }
    }, 5000);
    return () => clearInterval(t);
  }, [pagamento, pago, carregar]);

  async function copiar() {
    if (!pagamento?.pix_code) return;
    await navigator.clipboard.writeText(pagamento.pix_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  if (carregando) {
    return (
      <Pagina voltarPara="/melhoria">
        <Carregando />
      </Pagina>
    );
  }

  // ── Tela de pagamento ───────────────────────────────────────────────────
  if (pagamento) {
    return (
      <Pagina voltarPara="/melhoria">
        {pago ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Check size={90} strokeWidth={3} style={{ color: cor.okTexto }} aria-hidden="true" />
            <h1 style={{ fontSize: 34, fontWeight: 800, color: cor.tinta, margin: `${espaco.md}px 0 0` }}>
              Pagamento confirmado
            </h1>
            <p style={{ fontSize: 22, color: cor.tintaMuted, marginTop: espaco.sm }}>
              {pagamento.creditos} usos foram adicionados.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.xs}px`, lineHeight: 1.2 }}>
              Pague com PIX
            </h1>
            <p style={{ fontSize: 21, color: cor.tintaMuted, margin: `0 0 ${espaco.lg}px` }}>
              {pagamento.pacote} — R$ {(pagamento.amount / 100).toFixed(2).replace('.', ',')}
            </p>

            {pagamento.pix_qrcode && (
              <div style={{
                background: '#FFFFFF', border: `3px solid ${cor.borda}`,
                borderRadius: raio.card, padding: espaco.md,
                display: 'flex', justifyContent: 'center', marginBottom: espaco.md,
              }}>
                <Image
                  src={pagamento.pix_qrcode.startsWith('data:')
                    ? pagamento.pix_qrcode
                    : `data:image/png;base64,${pagamento.pix_qrcode}`}
                  alt="QR Code para pagamento"
                  width={260} height={260}
                  unoptimized
                />
              </div>
            )}

            <button type="button" onClick={copiar} style={{
              minHeight: toque.confortavel, width: '100%',
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: copiado ? cor.okBg : cor.fundo,
              color: copiado ? cor.okTexto : cor.tinta,
              fontSize: 21, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}>
              {copiado
                ? <><Check size={28} strokeWidth={3} aria-hidden="true" /> Código copiado</>
                : <><Copy size={28} aria-hidden="true" /> Copiar código PIX</>}
            </button>

            <p style={{
              background: cor.destaqueSuave, color: cor.destaqueTexto,
              borderRadius: raio.campo, padding: espaco.md,
              fontSize: 20, fontWeight: 600, lineHeight: 1.45,
              margin: `${espaco.md}px 0`,
            }}>
              Assim que o banco confirmar, os usos entram sozinhos. Pode deixar
              esta tela aberta.
            </p>

            <button type="button" onClick={confirmar} disabled={confirmando} style={{
              minHeight: toque.critico, width: '100%',
              borderRadius: raio.botao, border: 'none',
              background: cor.destaque, color: '#FFFFFF',
              fontSize: 24, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}>
              {confirmando
                ? <><Loader2 size={30} className="animate-spin" aria-hidden="true" /> Verificando...</>
                : <>Já paguei</>}
            </button>

            {erro && (
              <p role="alert" style={avisoErro}>{erro}</p>
            )}

            <button type="button" onClick={() => { setPagamento(null); setErro(null); }} style={{
              minHeight: toque.min, width: '100%', marginTop: espaco.md,
              background: 'none', border: 'none', color: cor.destaqueTexto,
              fontSize: 20, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
            }}>
              Voltar
            </button>
          </>
        )}
      </Pagina>
    );
  }

  // ── Vitrine ─────────────────────────────────────────────────────────────
  return (
    <Pagina voltarPara="/melhoria">
      <h1 style={{ fontSize: 34, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.md}px`, lineHeight: 1.2 }}>
        Usos da MelhorIA
      </h1>

      <div style={{
        background: saldo <= 5 ? cor.atencaoBg : cor.destaqueSuave,
        border: `3px solid ${saldo <= 5 ? '#D97706' : cor.destaque}`,
        borderRadius: raio.card, padding: espaco.lg,
        textAlign: 'center', marginBottom: espaco.lg,
      }}>
        <p style={{
          fontSize: 44, fontWeight: 800,
          color: saldo <= 5 ? cor.atencaoTexto : cor.destaqueTexto,
          margin: 0, lineHeight: 1,
        }}>
          {saldo}
        </p>
        <p style={{
          fontSize: 22, fontWeight: 700,
          color: saldo <= 5 ? cor.atencaoTexto : cor.destaqueTexto,
          margin: `${espaco.xs}px 0 0`,
        }}>
          {descreverCreditos(saldo)}
        </p>
      </div>

      {/* O que é grátis vem ANTES da vitrine, de propósito. */}
      <section style={{
        background: cor.okBg, border: '2px solid #16A34A',
        borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.lg,
      }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: cor.okTexto, margin: `0 0 ${espaco.xs}px` }}>
          Não precisa de usos para:
        </p>
        <ul style={{ margin: 0, paddingLeft: 24 }}>
          {[
            'Cadastrar remédios, consultas e exames',
            'Receber todos os lembretes',
            'Marcar que tomou o remédio',
            'Conferir boleto digitando os números',
            'Lista de compras',
            'Avisar a família pelo aplicativo',
          ].map((t) => (
            <li key={t} style={{ fontSize: 20, color: cor.okTexto, lineHeight: 1.6 }}>{t}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: espaco.lg }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.xs}px` }}>
          Os usos servem para:
        </p>
        <ul style={{ margin: 0, paddingLeft: 24 }}>
          {[
            ['Ler receita pela câmera', 3],
            ['Ler pedido de exame pela câmera', 2],
            ['Analisar foto de boleto', 2],
            ['Analisar link suspeito', 1],
            ['Mensagem de celular (por pessoa)', 2],
          ].map(([t, n]) => (
            <li key={String(t)} style={{ fontSize: 20, color: cor.tinta, lineHeight: 1.7 }}>
              {t} — <strong>{n} {n === 1 ? 'uso' : 'usos'}</strong>
            </li>
          ))}
        </ul>
      </section>

      <h2 style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.md}px` }}>
        Comprar usos
      </h2>

      {pacotes.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => comprar(p)}
          disabled={comprando !== null}
          style={{
            width: '100%', minHeight: toque.critico, textAlign: 'left',
            padding: espaco.md, marginBottom: espaco.sm,
            borderRadius: raio.card,
            border: `3px solid ${p.is_highlighted ? cor.destaque : cor.borda}`,
            background: p.is_highlighted ? cor.destaqueSuave : cor.fundo,
            cursor: 'pointer', position: 'relative',
          }}
        >
          {p.is_highlighted && (
            <span style={{
              position: 'absolute', top: -14, left: espaco.md,
              background: cor.destaque, color: '#FFFFFF',
              fontSize: 16, fontWeight: 800, padding: '4px 14px', borderRadius: 999,
            }}>
              Mais escolhido
            </span>
          )}

          {comprando === p.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: espaco.sm }}>
              <Loader2 size={30} className="animate-spin" style={{ color: cor.destaque }} />
              <span style={{ fontSize: 22, fontWeight: 700 }}>Gerando PIX...</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 26, fontWeight: 800, color: cor.tinta, margin: 0 }}>
                {p.interactions} usos
              </p>
              {p.description && (
                <p style={{ fontSize: 19, color: cor.tintaMuted, margin: '4px 0 0', lineHeight: 1.4 }}>
                  {p.description}
                </p>
              )}
              <p style={{
                fontSize: 30, fontWeight: 800, color: cor.destaqueTexto,
                margin: `${espaco.xs}px 0 0`,
              }}>
                R$ {(p.price_cents / 100).toFixed(2).replace('.', ',')}
              </p>
            </>
          )}
        </button>
      ))}

      {erro && <p role="alert" style={avisoErro}>{erro}</p>}

      <p style={{
        display: 'flex', alignItems: 'center', gap: espaco.xs,
        fontSize: 19, color: cor.tintaMuted, lineHeight: 1.5,
        marginTop: espaco.lg,
      }}>
        <QrCode size={26} aria-hidden="true" style={{ flexShrink: 0 }} />
        O pagamento é por PIX. Os usos entram na hora que o banco confirmar e
        não têm prazo para acabar.
      </p>
    </Pagina>
  );
}



const avisoErro: React.CSSProperties = {
  background: cor.perigoBg, color: cor.perigoTexto,
  border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
  padding: espaco.md, fontSize: 20, fontWeight: 600,
  lineHeight: 1.4, marginTop: espaco.md,
};
