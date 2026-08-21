'use client';

// app/melhoria/agenda/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Consultas e exames. Só o que ainda vai acontecer, em ordem — o passado fica
// atrás de um botão, porque não é o que a pessoa veio procurar.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, CalendarDays, Check } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CartaoCompromisso, { type Compromisso } from '@/components/melhoria/CartaoCompromisso';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { Pagina, BotaoGoogle, IconeCentral, Carregando } from '@/components/melhoria/Chrome';

function AgendaConteudo() {
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [futuros, setFuturos]       = useState<Compromisso[]>([]);
  const [passados, setPassados]     = useState<Compromisso[]>([]);
  const [verPassados, setVerPassados] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [conectando, setConectando]   = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Mensagem de volta do callback do Google
  useEffect(() => {
    const g = params.get('google');
    const m = params.get('msg');
    if (g && m) {
      setAviso({ tipo: g === 'ok' ? 'ok' : 'erro', texto: m });
      // Limpa a URL para a mensagem não reaparecer se a pessoa recarregar.
      window.history.replaceState({}, '', '/melhoria/agenda');
    }
  }, [params]);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    const agora = new Date().toISOString();

    const [{ data: prox }, { data: velhos }, { data: conexao }] = await Promise.all([
      mel.from('agendamentos').select('*')
         .gte('data_hora', agora).neq('status', 'cancelado')
         .order('data_hora', { ascending: true }),
      mel.from('agendamentos').select('*')
         .lt('data_hora', agora).neq('status', 'cancelado')
         .order('data_hora', { ascending: false }).limit(20),
      mel.from('google_conexoes').select('google_email')
         .eq('is_active', true).maybeSingle(),
    ]);

    setFuturos((prox as any) ?? []);
    setPassados((velhos as any) ?? []);
    setGoogleEmail(conexao?.google_email ?? null);
    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function conectarGoogle() {
    setConectando(true);
    try {
      const { data, error } = await supabase.functions.invoke('melhoria-google-auth-url');
      if (error || !data?.url) throw error ?? new Error('sem url');
      window.location.href = data.url;
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não consegui abrir a permissão do Google. Tente de novo.' });
      setConectando(false);
    }
  }

  if (carregando) {
    return (
      <Pagina voltarPara="/melhoria">
        <Carregando />
      </Pagina>
    );
  }

  return (
    <Pagina voltarPara="/melhoria">
      <h1 style={{ fontSize: 38, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.lg}px` }}>
        Consultas e exames
      </h1>

      {aviso && (
        <p role="status" style={{
          background: aviso.tipo === 'ok' ? cor.okBg : cor.perigoBg,
          color: aviso.tipo === 'ok' ? cor.okTexto : cor.perigoTexto,
          border: `2px solid ${aviso.tipo === 'ok' ? '#16A34A' : cor.perigo}`,
          borderRadius: raio.card, padding: espaco.md,
          fontSize: 20, fontWeight: 600, lineHeight: 1.4,
          margin: `0 0 ${espaco.md}px`,
        }}>
          {aviso.texto}
        </p>
      )}

      {futuros.length === 0 && (
        <div style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.xl, textAlign: 'center',
          marginBottom: espaco.lg,
        }}>
          <IconeCentral margemAbaixo={0}><CalendarDays size={64} style={{ color: cor.destaque }} /></IconeCentral>
          <p style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: `${espaco.md}px 0 ${espaco.xs}px` }}>
            Nenhum compromisso marcado
          </p>
          <p style={{ fontSize: 20, color: cor.tintaMuted, margin: 0, lineHeight: 1.4 }}>
            Cadastre uma consulta ou exame e eu aviso com uma semana, um dia e
            uma hora de antecedência.
          </p>
        </div>
      )}

      {futuros.map((c) => <CartaoCompromisso key={c.id} c={c} />)}

      <button
        type="button"
        onClick={() => router.push('/melhoria/agenda/novo')}
        style={{
          minHeight: toque.critico, width: '100%', marginTop: espaco.md,
          borderRadius: raio.botao, border: 'none',
          background: cor.destaque, color: '#FFFFFF',
          fontSize: 26, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        <Plus size={34} strokeWidth={3} aria-hidden="true" />
        Marcar consulta ou exame
      </button>

      {/* Google Agenda — opcional, e a tela deixa isso claro */}
      <section style={{
        background: cor.fundoSuave, border: `2px solid ${cor.borda}`,
        borderRadius: raio.card, padding: espaco.md, marginTop: espaco.xl,
      }}>
        {googleEmail ? (
          <p style={{
            display: 'flex', alignItems: 'center', gap: espaco.xs,
            fontSize: 20, color: cor.okTexto, fontWeight: 700, margin: 0, lineHeight: 1.4,
          }}>
            <Check size={28} strokeWidth={3} aria-hidden="true" />
            Seus compromissos também vão para a agenda de {googleEmail}.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 20, color: cor.tinta, margin: `0 0 ${espaco.sm}px`, lineHeight: 1.45 }}>
              Quer que seus compromissos apareçam também na agenda do celular?
              Assim sua família pode ver, se você compartilhar a agenda com
              eles.
            </p>
            <p style={{ fontSize: 18, color: cor.tintaMuted, margin: `0 0 ${espaco.md}px`, lineHeight: 1.45 }}>
              É opcional. Os lembretes já funcionam sem isso.
            </p>
            {/* SVG oficial de quatro cores, igual aos outros logins da minhAi */}
            <BotaoGoogle
              onClick={conectarGoogle}
              carregando={conectando}
              rotulo="Conectar minha agenda do Google"
            />
          </>
        )}
      </section>

      {passados.length > 0 && (
        <section style={{ marginTop: espaco.xl }}>
          <button
            type="button"
            onClick={() => setVerPassados((v) => !v)}
            style={{
              minHeight: toque.min, width: '100%',
              background: 'none', border: 'none', color: cor.destaqueTexto,
              fontSize: 20, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            {verPassados ? 'Esconder o que já passou' : `Ver o que já passou (${passados.length})`}
          </button>

          {verPassados && (
            <div style={{ marginTop: espaco.md }}>
              {passados.map((c) => <CartaoCompromisso key={c.id} c={c} />)}
            </div>
          )}
        </section>
      )}
    </Pagina>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <Pagina voltarPara="/melhoria">
        <Carregando />
      </Pagina>
    }>
      <AgendaConteudo />
    </Suspense>
  );
}


