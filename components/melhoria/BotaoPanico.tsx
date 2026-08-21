'use client';

// components/melhoria/BotaoPanico.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Botão fixo, mesma posição em todas as telas.
//
// A geolocalização usa o mesmo padrão do TracarRotaDisplay da minhAi:
// getCurrentPosition com callback de erro que simplesmente segue sem local.
// Nunca bloqueia o disparo — avisar sem localização é infinitamente melhor
// que não avisar.
//
// A contagem regressiva de 5 segundos existe porque este botão fica sempre na
// tela: toque acidental com o telefone no bolso é questão de tempo, e um
// alarme falso que assusta a família três vezes faz a pessoa desinstalar o
// aplicativo.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Phone, X, Check, Loader2 } from 'lucide-react';
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

export default function BotaoPanico() {
  const [montado, setMontado]   = useState(false);
  const [aberto, setAberto]     = useState(false);
  const [restante, setRestante] = useState(SEGUNDOS);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const localRef = useRef<GeolocationCoordinates | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMontado(true); }, []);

  // Pede a posição assim que a contagem começa — não na hora de enviar. O GPS
  // pode levar segundos, e são exatamente os segundos da contagem.
  const pedirLocal = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { localRef.current = pos.coords; },
      () => { localRef.current = null; },   // sem permissão: segue sem local
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

  // Contagem regressiva
  useEffect(() => {
    if (!aberto || resultado || enviando) return;

    setRestante(SEGUNDOS);
    pedirLocal();

    timerRef.current = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          disparar();
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

  if (!montado) return null;

  const botaoFixo = (
    <button
      type="button"
      onClick={() => setAberto(true)}
      aria-label="Botão de emergência: avisar minha família"
      style={{
        position: 'fixed', right: espaco.md, bottom: espaco.md, zIndex: 200,
        width: toque.critico, height: toque.critico, borderRadius: '50%',
        border: '4px solid #FFFFFF', background: cor.perigo, color: '#FFFFFF',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}
    >
      <AlertTriangle size={32} strokeWidth={2.5} aria-hidden="true" />
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>AJUDA</span>
    </button>
  );

  const painel = aberto && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pedido de ajuda"
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: espaco.md,
      }}
    >
      <div style={{
        background: cor.fundo, borderRadius: raio.card,
        padding: espaco.lg, width: '100%', maxWidth: 480,
        maxHeight: '90dvh', overflowY: 'auto',
      }}>

        {/* ── Contagem ── */}
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

            <button
              type="button"
              onClick={fechar}
              style={{
                minHeight: toque.critico, width: '100%', marginTop: espaco.lg,
                borderRadius: raio.botao, border: `3px solid ${cor.bordaForte}`,
                background: cor.fundo, color: cor.tinta,
                fontSize: 28, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
              }}
            >
              <X size={34} strokeWidth={3} aria-hidden="true" />
              Cancelar
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
          <div style={{ textAlign: 'center', padding: espaco.lg }}>
            <Loader2 size={64} className="animate-spin" style={{ color: cor.perigo }} />
            <p style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, marginTop: espaco.md }}>
              Avisando sua família...
            </p>
          </div>
        )}

        {/* ── Resultado: o que FOI feito vem primeiro ── */}
        {resultado && (
          <>
            <div style={{ textAlign: 'center', marginBottom: espaco.md }}>
              <Check size={72} strokeWidth={3} style={{ color: cor.okTexto }} aria-hidden="true" />
              <p style={{ fontSize: 30, fontWeight: 800, color: cor.tinta, margin: `${espaco.xs}px 0 0` }}>
                Avisamos sua família
              </p>
            </div>

            {resultado.semContatos && resultado.pushEnviados === 0 && (
              <p style={{
                background: cor.atencaoBg, color: cor.atencaoTexto,
                border: '2px solid #D97706', borderRadius: raio.campo,
                padding: espaco.md, fontSize: 20, fontWeight: 700, lineHeight: 1.4,
              }}>
                Você ainda não cadastrou ninguém para avisar. Cadastre agora,
                para a próxima vez.
              </p>
            )}

            <ul style={{ margin: `0 0 ${espaco.md}px`, padding: 0, listStyle: 'none' }}>
              {resultado.pushEnviados > 0 && (
                <li style={itemOk}>
                  <Check size={26} strokeWidth={3} aria-hidden="true" />
                  Aviso enviado pelo aplicativo
                </li>
              )}
              {resultado.notificados.map((n, i) => (
                <li key={i} style={n.status === 'enviado' ? itemOk : itemPendente}>
                  {n.status === 'enviado'
                    ? <Check size={26} strokeWidth={3} aria-hidden="true" />
                    : <AlertTriangle size={26} aria-hidden="true" />}
                  {n.status === 'enviado'
                    ? `Mensagem enviada para ${n.nome}`
                    : n.status === 'sem_credito'
                      ? `${n.nome}: mensagem não enviada, seus usos acabaram`
                      : `${n.nome}: a mensagem não chegou`}
                </li>
              ))}
            </ul>

            {/* 192 e 190 SEMPRE, e em letra grande. O aplicativo avisa a
                família — ele não é o SAMU, e a tela precisa deixar isso claro
                no momento em que mais importa. */}
            <p style={{
              fontSize: 21, fontWeight: 700, color: cor.tinta,
              textAlign: 'center', margin: `0 0 ${espaco.sm}px`, lineHeight: 1.4,
            }}>
              Se for grave, ligue agora:
            </p>

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

            <button type="button" onClick={fechar} style={{
              minHeight: toque.confortavel, width: '100%', marginTop: espaco.md,
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: cor.fundo, color: cor.tinta,
              fontSize: 21, fontWeight: 700, cursor: 'pointer',
            }}>
              Fechar
            </button>
          </>
        )}

        {erro && (
          <>
            <p role="alert" style={{
              background: cor.perigoBg, color: cor.perigoTexto,
              border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
              padding: espaco.md, fontSize: 22, fontWeight: 700, lineHeight: 1.4,
              margin: `0 0 ${espaco.md}px`,
            }}>
              {erro}
            </p>

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

            <button type="button" onClick={fechar} style={{
              minHeight: toque.confortavel, width: '100%', marginTop: espaco.md,
              borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
              background: cor.fundo, color: cor.tinta,
              fontSize: 21, fontWeight: 700, cursor: 'pointer',
            }}>
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(<>{botaoFixo}{painel}</>, document.body);
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
