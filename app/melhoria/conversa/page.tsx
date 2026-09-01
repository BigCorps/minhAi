'use client';

// app/melhoria/conversa/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Conversa com a IA. 1 crédito por resposta.
//
// ── ONDE O SALDO APARECE, E POR QUÊ ─────────────────────────────────────────
// O saldo NÃO aparece na tela inicial do aplicativo. Ele aparece aqui, que é
// uma das poucas telas pagas — e só depois que a pessoa escolheu entrar nela.
//
// Mostrar "restam 20 créditos" logo na abertura passava a impressão de
// aplicativo pago, quando a maior parte do que ele faz é grátis e ilimitada.
// O saldo é informação de quem já decidiu usar uma função paga; não é o cartão
// de visita do produto.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { melhoriaAuth } from '@/lib/melhoria/supabase';
import { useDitado } from '@/hooks/useDitado';
import { Pagina } from '@/components/melhoria/Chrome';
import { R } from '@/lib/melhoria/rotas';
import { Mic, Square } from 'lucide-react';
import {
  cor, toque, raio, espaco, descreverCreditos,
} from '@/lib/melhoria/tema';

interface Mensagem { autor: 'pessoa' | 'ia'; texto: string; }

const SUGESTOES = [
  'Que remédios eu tomo de manhã?',
  'Quando é minha próxima consulta?',
  'Como eu cadastro um remédio novo?',
];

export default function ConversaPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto]         = useState('');
  const [pensando, setPensando]   = useState(false);
  const [saldo, setSaldo]         = useState<number | null>(null);
  const [semCreditos, setSemCreditos] = useState<string | null>(null);

  const fimRef = useRef<HTMLDivElement | null>(null);

  const ditado = useDitado({ aoParcial: (t) => setTexto(t) });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.replace(R.login()); return; }

      const { data: cred } = await supabase
        .from('user_credits')
        .select('available_credits')
        .eq('user_id', data.user.id)
        .maybeSingle();

      setSaldo(cred?.available_credits ?? 0);
    })();
  }, [supabase, router]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, pensando]);

  const enviar = useCallback(async (conteudo?: string) => {
    const msg = (conteudo ?? texto).trim();
    if (!msg || pensando) return;

    if (ditado.gravando) ditado.parar();

    const novas: Mensagem[] = [...mensagens, { autor: 'pessoa', texto: msg }];
    setMensagens(novas);
    setTexto('');
    setPensando(true);
    setSemCreditos(null);

    try {
      const r = await fetch('/api/melhoria/conversa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg, historico: mensagens }),
      });

      const dados = await r.json();

      if (r.status === 402) {
        setSemCreditos(dados.mensagem);
        // Devolve a pergunta ao campo: nada pior que perder o que digitou.
        setMensagens(mensagens);
        setTexto(msg);
        return;
      }

      if (!r.ok) throw new Error(dados?.mensagem ?? 'falhou');

      setMensagens([...novas, { autor: 'ia', texto: dados.resposta }]);
      if (typeof dados.saldoRestante === 'number') setSaldo(dados.saldoRestante);
    } catch (e: any) {
      setMensagens([...novas, {
        autor: 'ia',
        texto: e?.message?.includes('devolvido')
          ? e.message
          : 'Não consegui responder agora. Tente de novo em instantes.',
      }]);
    } finally {
      setPensando(false);
    }
  }, [texto, mensagens, pensando, ditado]);

  return (
    <Pagina voltarPara={R.app()} semRodape>
      <h1 style={{
        display: 'flex', alignItems: 'center', gap: espaco.xs,
        fontSize: 32, fontWeight: 800, color: cor.tinta,
        margin: `0 0 ${espaco.xs}px`, lineHeight: 1.2,
      }}>
        <Sparkles size={30} style={{ color: cor.destaque }} aria-hidden="true" />
        Conversar
      </h1>

      {/* Custo dito de forma direta, uma vez, no topo. */}
      <p style={{
        fontSize: 19, color: cor.tintaMuted, lineHeight: 1.5,
        margin: `0 0 ${espaco.lg}px`,
      }}>
        Cada resposta usa <strong style={{ color: cor.tinta }}>1 crédito</strong>
        {saldo !== null && <> — {descreverCreditos(saldo)}</>}.{' '}
        <button
          type="button"
          onClick={() => router.push(R.creditos())}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: cor.destaqueTexto, fontSize: 19, fontWeight: 700,
            textDecoration: 'underline', cursor: 'pointer',
          }}
        >
          Ver créditos
        </button>
      </p>

      {/* ── Conversa ── */}
      {mensagens.length === 0 && (
        <div style={{
          background: cor.fundoCard, border: `2px dashed ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.lg, marginBottom: espaco.lg,
        }}>
          <p style={{
            fontSize: 21, color: cor.tinta, lineHeight: 1.5,
            margin: `0 0 ${espaco.md}px`,
          }}>
            Pode perguntar sobre seus remédios, suas consultas, ou como usar o
            aplicativo. Escreva ou fale.
          </p>

          <div style={{ display: 'grid', gap: espaco.xs }}>
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                style={{
                  minHeight: toque.min, textAlign: 'left',
                  padding: `${espaco.xs}px ${espaco.md}px`,
                  borderRadius: raio.botao,
                  border: `2px solid ${cor.borda}`,
                  background: cor.fundo, color: cor.destaqueTexto,
                  fontSize: 20, fontWeight: 600, cursor: 'pointer',
                  lineHeight: 1.35,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {mensagens.map((m, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: m.autor === 'pessoa' ? 'flex-end' : 'flex-start',
            marginBottom: espaco.sm,
          }}
        >
          <p style={{
            maxWidth: '88%',
            background: m.autor === 'pessoa' ? cor.destaqueSuave : cor.fundoCard,
            border: `2px solid ${m.autor === 'pessoa' ? cor.destaque : cor.borda}`,
            borderRadius: raio.card,
            padding: espaco.md,
            fontSize: 21, lineHeight: 1.5,
            color: cor.tinta, margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {m.texto}
          </p>
        </div>
      ))}

      {pensando && (
        <div style={{ display: 'flex', gap: espaco.xs, alignItems: 'center', marginBottom: espaco.sm }}>
          <Loader2 size={28} className="animate-spin" style={{ color: cor.destaque }} aria-hidden="true" />
          <span style={{ fontSize: 20, color: cor.tintaMuted }}>Pensando...</span>
        </div>
      )}

      {semCreditos && (
        <div role="alert" style={{
          background: cor.atencaoBg, color: cor.atencaoTexto,
          border: '2px solid #D97706', borderRadius: raio.card,
          padding: espaco.md, marginBottom: espaco.md,
        }}>
          <p style={{
            display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
            fontSize: 20, fontWeight: 600, lineHeight: 1.45, margin: 0,
          }}>
            <AlertTriangle size={26} aria-hidden="true" style={{ flexShrink: 0 }} />
            {semCreditos}
          </p>
          <button
            type="button"
            onClick={() => router.push(R.creditos())}
            style={{
              minHeight: toque.min, width: '100%', marginTop: espaco.sm,
              borderRadius: raio.botao, border: `2px solid ${cor.atencaoTexto}`,
              background: 'transparent', color: cor.atencaoTexto,
              fontSize: 20, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Comprar créditos
          </button>
        </div>
      )}

      <div ref={fimRef} />

      {/* ── Caixa de escrita ── */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: cor.fundo, paddingBottom: espaco.md, paddingTop: espaco.xs,
      }}>
        <div style={{ display: 'flex', gap: espaco.xs, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva sua pergunta"
              rows={2}
              aria-label="Sua pergunta"
              style={{
                width: '100%', minHeight: toque.min,
                padding: `${espaco.sm}px ${toque.min}px ${espaco.sm}px ${espaco.md}px`,
                borderRadius: raio.campo,
                border: `2px solid ${ditado.gravando ? cor.destaque : cor.borda}`,
                background: cor.fundo, color: cor.tinta,
                fontSize: 21, lineHeight: 1.4, fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            {ditado.suportado && (
              <button
                type="button"
                onClick={ditado.alternar}
                aria-label={ditado.gravando ? 'Parar de ditar' : 'Ditar pelo microfone'}
                aria-pressed={ditado.gravando}
                style={{
                  position: 'absolute', right: espaco.xs, top: espaco.xs,
                  width: toque.min - 12, height: toque.min - 12,
                  borderRadius: raio.botao, border: 'none',
                  background: ditado.gravando ? cor.perigo : cor.destaqueSuave,
                  color: ditado.gravando ? '#FFFFFF' : cor.destaqueTexto,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, lineHeight: 0,
                }}
              >
                {ditado.gravando
                  ? <Square size={24} fill="currentColor" />
                  : <Mic size={28} />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => enviar()}
            disabled={!texto.trim() || pensando}
            aria-label="Enviar"
            style={{
              minWidth: toque.confortavel, minHeight: toque.confortavel,
              borderRadius: raio.botao, border: 'none',
              background: texto.trim() && !pensando ? cor.destaque : cor.borda,
              color: '#FFFFFF',
              cursor: texto.trim() && !pensando ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Send size={30} aria-hidden="true" />
          </button>
        </div>

        {ditado.gravando && (
          <p role="status" style={{
            fontSize: 19, color: cor.destaqueTexto, fontWeight: 700,
            margin: `${espaco.xs}px 0 0`,
          }}>
            Estou ouvindo. Fale e depois diga “pronto”.
          </p>
        )}

        <p style={{
          fontSize: 17, color: cor.tintaFraca, textAlign: 'center',
          margin: `${espaco.xs}px 0 0`, lineHeight: 1.4,
        }}>
          A MelhorIA não indica dose nem substitui seu médico.
        </p>
      </div>
    </Pagina>
  );
}
