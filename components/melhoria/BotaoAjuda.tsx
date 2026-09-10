'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AlertTriangle, Phone, X, Check, Loader2, UserPlus } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import { R } from '@/lib/melhoria/rotas';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';

const SEGUNDOS = 5;

interface Notificado {
  nome: string;
  canal: string;
  status: 'enviado' | 'sem_credito' | 'falhou';
}

interface Resultado {
  pushEnviados: number;
  smsEnviados: number;
  bloqueados: number;
  notificados: Notificado[];
  semContatos: boolean;
}

export default function BotaoAjuda() {
  const router = useRouter();
  const supabase = melhoriaAuth();
  const mel = createMelhoriaClient();

  const [temContato, setTemContato] = useState<boolean | null>(null);
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const localRef = useRef<GeolocationCoordinates | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMontado(true); }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) { if (vivo) setTemContato(null); return; }

      const { count } = await mel
        .from('contatos_emergencia')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true);

      if (vivo) setTemContato((count ?? 0) > 0);
    })();
    return () => { vivo = false; };
  }, [supabase, mel]);

  const pedirLocal = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { localRef.current = pos.coords; },
      () => { localRef.current = null; },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  const disparar = useCallback(async () => {
    setEnviando(true);
    setErro(null);
    try {
      const c = localRef.current;
      const r = await fetch('/api/melhoria/panico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: c?.latitude,
          longitude: c?.longitude,
          precisao: c?.accuracy,
          origem: 'botao',
        }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados?.erro ?? 'falhou');
      setResultado(dados);
    } catch {
      setErro('Não consegui avisar pelo aplicativo. Ligue você mesmo para 192 ou 190.');
    } finally {
      setEnviando(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto || resultado || enviando) return;
    setRestante(SEGUNDOS);
    pedirLocal();

    timerRef.current = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void disparar();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [aberto, resultado, enviando, disparar, pedirLocal]);

  function fechar() {
    if (timerRef.current) clearInterval(timerRef.current);
    setAberto(false);
    setResultado(null);
    setErro(null);
  }

  if (!montado || temContato === null) return null;

  if (!temContato) {
    return (
      <button
        type="button"
        onClick={() => router.push(R.emergencia())}
        aria-label="Configurar quem avisar em caso de emergência"
        style={{
          minHeight: toque.min, flexShrink: 0,
          padding: `0 ${espaco.xs}px`,
          borderRadius: raio.botao,
          border: '2px solid #D97706',
          background: cor.atencaoBg, color: cor.atencaoTexto,
          fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1.1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      >
        <UserPlus size={24} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span className="mel-rotulo-ajuda" style={{ whiteSpace: 'nowrap' }}>Configurar</span>
      </button>
    );
  }

  const botao = (
    <button
      type="button"
      onClick={() => setAberto(true)}
      aria-label="Pedir ajuda: avisar minha família"
      style={{
        minHeight: toque.min, flexShrink: 0,
        padding: `0 ${espaco.sm}px`,
        borderRadius: raio.botao, border: 'none',
        background: cor.perigo, color: '#FFFFFF',
        fontSize: 19, fontWeight: 800, letterSpacing: 0.5,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}
    >
      <AlertTriangle size={26} strokeWidth={2.5} aria-hidden="true" />
      <span className="mel-rotulo-ajuda" style={{ whiteSpace: 'nowrap' }}>AJUDA</span>
    </button>
  );

  const houveEnvio = !!resultado && (resultado.pushEnviados > 0 || resultado.smsEnviados > 0);

  const painel = aberto && montado && createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Pedido de ajuda"
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: espaco.md,
      }}
    >
      <div style={{
        background: cor.fundo, borderRadius: raio.card, padding: espaco.lg,
        width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto',
      }}>
        {!resultado && !erro && !enviando && (
          <>
            <p style={{
              fontSize: 26, fontWeight: 700, color: cor.tinta,
              textAlign: 'center', margin: `0 0 ${espaco.md}px`, lineHeight: 1.3,
            }}>
              Vou avisar sua família em
            </p>
            <p style={{
              fontSize: 110, fontWeight: 800, color: cor.perigo,
              textAlign: 'center', margin: 0, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {restante}
            </p>
            <button type="button" onClick={fechar} style={{
              minHeight: toque.critico, width: '100%', marginTop: espaco.lg,
              borderRadius: raio.botao, border: `3px solid ${cor.bordaForte}`,
              background: cor.fundo, color: cor.tinta,
              fontSize: 28, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}>
              <X size={34} strokeWidth={3} aria-hidden="true" /> Cancelar
            </button>
            <p style={{
              fontSize: 19, color: cor.tintaMuted, textAlign: 'center',
              margin: `${espaco.md}px 0 0`, lineHeight: 1.4,
            }}>
              Se apertou sem querer, toque em Cancelar.
            </p>
          </>
        )}

        {enviando && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: espaco.md, padding: espaco.lg,
          }}>
            <Loader2 size={64} className="animate-spin" style={{ color: cor.perigo }} aria-hidden="true" />
            <p style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: 0 }}>
              Avisando sua família...
            </p>
          </div>
        )}

        {resultado && (
          <>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginBottom: espaco.md,
            }}>
              {houveEnvio
                ? <Check size={72} strokeWidth={3} style={{ color: cor.okTexto }} aria-hidden="true" />
                : <AlertTriangle size={72} strokeWidth={2.5} style={{ color: cor.perigo }} aria-hidden="true" />}
              <p role="status" style={{
                fontSize: 30, fontWeight: 800,
                color: houveEnvio ? cor.tinta : cor.perigoTexto,
                margin: `${espaco.xs}px 0 0`, textAlign: 'center',
              }}>
                {houveEnvio ? 'Avisamos sua família' : 'Não consegui avisar sua família'}
              </p>
              {!houveEnvio && (
                <p style={{
                  fontSize: 20, color: cor.perigoTexto, textAlign: 'center',
                  lineHeight: 1.4, margin: `${espaco.xs}px 0 0`,
                }}>
                  Não conte com este envio. Se precisar de ajuda agora, ligue diretamente para um serviço de emergência.
                </p>
              )}
            </div>

            <ul style={{ margin: `0 0 ${espaco.md}px`, padding: 0, listStyle: 'none' }}>
              {resultado.pushEnviados > 0 && (
                <li style={itemOk}>
                  <Check size={26} strokeWidth={3} aria-hidden="true" style={{ flexShrink: 0 }} />
                  Aviso enviado pelo aplicativo
                </li>
              )}
              {resultado.notificados.map((n, i) => (
                <li key={i} style={n.status === 'enviado' ? itemOk : itemPendente}>
                  {n.status === 'enviado'
                    ? <Check size={26} strokeWidth={3} aria-hidden="true" style={{ flexShrink: 0 }} />
                    : <AlertTriangle size={26} aria-hidden="true" style={{ flexShrink: 0 }} />}
                  {n.status === 'enviado'
                    ? `Mensagem enviada para ${n.nome}`
                    : n.status === 'sem_credito'
                      ? `${n.nome}: SMS não enviado porque os créditos acabaram`
                      : `${n.nome}: o SMS não chegou`}
                </li>
              ))}
              {resultado.semContatos && (
                <li style={itemPendente}>
                  <AlertTriangle size={26} aria-hidden="true" style={{ flexShrink: 0 }} />
                  Nenhum contato de emergência ativo foi encontrado.
                </li>
              )}
            </ul>

            <p style={{
              fontSize: 21, fontWeight: 700, color: cor.tinta,
              textAlign: 'center', margin: `0 0 ${espaco.sm}px`, lineHeight: 1.4,
            }}>
              Se for grave, ligue agora:
            </p>
            <Emergencias />
            <button type="button" onClick={fechar} style={btnFechar}>Fechar</button>
          </>
        )}

        {erro && (
          <>
            <p role="alert" style={{
              background: cor.perigoBg, color: cor.perigoTexto,
              border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
              padding: espaco.md, fontSize: 22, fontWeight: 700,
              lineHeight: 1.4, margin: `0 0 ${espaco.md}px`,
            }}>
              {erro}
            </p>
            <Emergencias />
            <button type="button" onClick={fechar} style={btnFechar}>Fechar</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );

  return <>{botao}{painel}</>;
}

function Emergencias() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: espaco.sm }}>
      <a href="tel:192" style={botaoEmergencia}>
        <Phone size={30} aria-hidden="true" />
        <span>SAMU<br /><strong style={{ fontSize: 34 }}>192</strong></span>
      </a>
      <a href="tel:190" style={botaoEmergencia}>
        <Phone size={30} aria-hidden="true" />
        <span>Polícia<br /><strong style={{ fontSize: 34 }}>190</strong></span>
      </a>
    </div>
  );
}

const itemBase: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
  fontSize: 21, fontWeight: 600, lineHeight: 1.4, marginBottom: espaco.xs,
};
const itemOk: React.CSSProperties = { ...itemBase, color: cor.okTexto };
const itemPendente: React.CSSProperties = { ...itemBase, color: cor.atencaoTexto };

const botaoEmergencia: React.CSSProperties = {
  minHeight: toque.critico, borderRadius: raio.botao,
  border: `3px solid ${cor.perigo}`, background: cor.perigoBg,
  color: cor.perigoTexto, fontSize: 19, fontWeight: 700,
  textDecoration: 'none', textAlign: 'center',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
};

const btnFechar: React.CSSProperties = {
  minHeight: toque.confortavel, width: '100%', marginTop: espaco.md,
  borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
  background: cor.fundo, color: cor.tinta,
  fontSize: 21, fontWeight: 700, cursor: 'pointer',
};
