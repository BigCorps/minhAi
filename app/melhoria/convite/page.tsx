'use client';

// app/melhoria/convite/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Aceite do convite de cuidador.
//
// O link chega por WhatsApp e é aberto por alguém que provavelmente não tem
// conta ainda. Por isso a tela funciona deslogada: explica o que é, guarda o
// token e manda entrar. Depois do login, o /auth/callback traz de volta para
// cá e o aceite acontece sozinho.
//
// Antes de aceitar, a tela diz exatamente o que a pessoa vai passar a ver.
// Consentimento de compartilhamento de dado de saúde não pode ser implícito.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Check, Loader2, AlertTriangle, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

const CHAVE = 'melhoria_convite_pendente';

function ConviteConteudo() {
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = createClient();

  const [estado, setEstado] = useState<'carregando' | 'deslogado' | 'confirmar' | 'ok' | 'erro'>('carregando');
  const [mensagem, setMensagem] = useState('');
  const [token, setToken]       = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    const t = params.get('t');

    // Token guardado antes do login sobrevive ao redirecionamento do OAuth.
    const guardado = typeof window !== 'undefined'
      ? sessionStorage.getItem(CHAVE)
      : null;

    const usar = t ?? guardado;

    if (!usar) {
      setEstado('erro');
      setMensagem('Este link não parece completo. Peça um novo para quem convidou você.');
      return;
    }

    setToken(usar);
    if (t) sessionStorage.setItem(CHAVE, t);

    (async () => {
      const { data } = await supabase.auth.getUser();
      setEstado(data?.user ? 'confirmar' : 'deslogado');
    })();
  }, [params, supabase]);

  const aceitar = useCallback(async () => {
    if (!token) return;
    setAceitando(true);

    const { data, error } = await supabase.rpc('melhoria_aceitar_convite', { p_token: token });
    const linha = Array.isArray(data) ? data[0] : data;

    if (error || !linha?.ok) {
      setEstado('erro');
      setMensagem(linha?.mensagem ?? 'Não consegui aceitar este convite.');
      sessionStorage.removeItem(CHAVE);
      setAceitando(false);
      return;
    }

    sessionStorage.removeItem(CHAVE);
    setMensagem(linha.mensagem);
    setEstado('ok');
    setTimeout(() => router.push('/melhoria/familia'), 2500);
  }, [token, supabase, router]);

  return (
    <main style={pagina}>
      <div style={{ textAlign: 'center', marginBottom: espaco.lg }}>
        <Image src="/brands/melhoria/logo.png" alt="" width={72} height={72}
               style={{ borderRadius: 16 }} />
        <p style={{ fontSize: 22, fontWeight: 700, color: cor.destaqueTexto, margin: `${espaco.sm}px 0 0` }}>
          MelhorIA
        </p>
      </div>

      {estado === 'carregando' && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
        </div>
      )}

      {estado === 'deslogado' && (
        <>
          <h1 style={titulo}>Convidaram você para acompanhar alguém</h1>
          <p style={texto}>
            Para aceitar, entre na sua conta ou crie uma. É rápido e não custa
            nada.
          </p>
          <button
            type="button"
            onClick={() => router.push('/melhoria/login?next=/melhoria/convite')}
            style={botaoPrincipal}
          >
            Entrar ou criar conta
          </button>
        </>
      )}

      {estado === 'confirmar' && (
        <>
          <h1 style={titulo}>Aceitar o convite</h1>

          {/* O que a pessoa vai passar a ver, dito antes de aceitar */}
          <div style={{
            background: cor.destaqueSuave, border: `2px solid ${cor.destaque}`,
            borderRadius: raio.card, padding: espaco.md, margin: `0 0 ${espaco.lg}px`,
          }}>
            <p style={{ fontSize: 21, fontWeight: 700, color: cor.destaqueTexto, margin: `0 0 ${espaco.xs}px` }}>
              Ao aceitar, você vai poder ver:
            </p>
            <ul style={{ margin: 0, paddingLeft: 24 }}>
              {[
                'Os remédios e os horários',
                'Se as doses foram confirmadas',
                'As consultas e exames marcados',
              ].map((t) => (
                <li key={t} style={{ fontSize: 20, color: cor.destaqueTexto, lineHeight: 1.6 }}>{t}</li>
              ))}
            </ul>
            <p style={{ fontSize: 19, color: cor.destaqueTexto, margin: `${espaco.sm}px 0 0`, lineHeight: 1.45 }}>
              Você também será avisado se uma dose não for confirmada. Esses são
              dados de saúde: seus acessos ficam registrados, e quem convidou
              pode remover seu acesso quando quiser.
            </p>
          </div>

          <button type="button" onClick={aceitar} disabled={aceitando} style={botaoPrincipal}>
            {aceitando
              ? <><Loader2 size={30} className="animate-spin" aria-hidden="true" /> Aceitando...</>
              : <><Heart size={30} aria-hidden="true" /> Aceitar e acompanhar</>}
          </button>

          <button
            type="button"
            onClick={() => { sessionStorage.removeItem(CHAVE); router.push('/melhoria'); }}
            style={{
              minHeight: toque.min, width: '100%', marginTop: espaco.md,
              background: 'none', border: 'none', color: cor.tintaMuted,
              fontSize: 20, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Agora não
          </button>
        </>
      )}

      {estado === 'ok' && (
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <Check size={90} strokeWidth={3} style={{ color: cor.okTexto }} aria-hidden="true" />
          <h1 style={{ ...titulo, textAlign: 'center' }}>{mensagem}</h1>
          <p style={texto}>Levando você para o acompanhamento...</p>
        </div>
      )}

      {estado === 'erro' && (
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <AlertTriangle size={72} style={{ color: cor.atencaoTexto }} aria-hidden="true" />
          <h1 style={{ ...titulo, textAlign: 'center' }}>Não deu certo</h1>
          <p style={texto}>{mensagem}</p>
          <button type="button" onClick={() => router.push('/melhoria')} style={botaoPrincipal}>
            Ir para o aplicativo
          </button>
        </div>
      )}
    </main>
  );
}

export default function ConvitePage() {
  return (
    <Suspense fallback={
      <main style={pagina}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
        </div>
      </main>
    }>
      <ConviteConteudo />
    </Suspense>
  );
}

const pagina: React.CSSProperties = {
  background: cor.fundo, minHeight: '100dvh', maxWidth: 520,
  margin: '0 auto', padding: `${espaco.xl}px ${espaco.md}px`,
  color: cor.tinta,
};

const titulo: React.CSSProperties = {
  fontSize: 30, fontWeight: 800, color: cor.tinta,
  margin: `0 0 ${espaco.md}px`, lineHeight: 1.25,
};

const texto: React.CSSProperties = {
  fontSize: 21, color: cor.tintaMuted, lineHeight: 1.5,
  margin: `0 0 ${espaco.lg}px`,
};

const botaoPrincipal: React.CSSProperties = {
  minHeight: toque.critico, width: '100%',
  borderRadius: raio.botao, border: 'none',
  background: cor.destaque, color: '#FFFFFF',
  fontSize: 24, fontWeight: 800, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
};
