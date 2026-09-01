'use client';

// app/melhoria/verificar/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Verificação antifraude.
//
// Duas coisas ficam explícitas na tela, e não por acaso:
//   1. Conferir boleto pelos NÚMEROS é grátis e sem limite. É a checagem que
//      pega o golpe mais comum e não custa nada para ninguém.
//   2. O resultado NUNCA diz "é seguro". O melhor veredito possível é "não
//      encontramos indícios", sempre com a orientação de confirmar por
//      telefone. Falso negativo aqui é dano de milhares de reais.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, FileDigit, Link2, Phone, RotateCcw } from 'lucide-react';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import {
  verificarBoleto, mascarar, limpar,
  type ResultadoBoleto, type Veredito,
} from '@/lib/melhoria/boleto';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';
import { Pagina } from '@/components/melhoria/Chrome';

type Aba = 'boleto' | 'link';

interface ResultadoIA {
  veredito: Veredito;
  motivos: string[];
  orientacao: string;
  saldoRestante?: number;
}

export default function VerificarPage() {

  const [aba, setAba] = useState<Aba>('boleto');

  const [numeros, setNumeros]   = useState('');
  const [jaConferiu, setJaConferiu] = useState(false);
  const [resBoleto, setResBoleto]   = useState<ResultadoBoleto | null>(null);

  const [link, setLink]         = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [resIA, setResIA]       = useState<ResultadoIA | null>(null);
  const [semCreditos, setSemCreditos] = useState<string | null>(null);

  // ── Boleto: 100% local, sem rede e sem crédito ──────────────────────────
  function conferirBoleto() {
    const r = verificarBoleto(numeros, {
      origem: 'digitado',
      jaConferiu,
    });
    setResBoleto(r);
    // Se pedimos para conferir e a pessoa tentar de novo, a segunda tentativa
    // já é tratada como definitiva.
    if (r.veredito === 'digitacao') setJaConferiu(true);
  }

  function recomecarBoleto() {
    setNumeros(''); setResBoleto(null); setJaConferiu(false);
  }

  // ── Link: usa IA, consome crédito ──────────────────────────────────────
  async function conferirLink() {
    setAnalisando(true);
    setResIA(null);
    setSemCreditos(null);

    try {
      const r = await fetch('/api/melhoria/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'url', entrada: link.trim() }),
      });

      const dados = await r.json();

      if (r.status === 402) { setSemCreditos(dados.mensagem); return; }
      if (!r.ok) throw new Error(dados?.mensagem ?? 'falhou');

      setResIA(dados);
    } catch {
      setSemCreditos('Não consegui analisar agora. Tente de novo em instantes.');
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <Pagina voltarPara={R.app()}>
      <h1 style={{ fontSize: 36, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.md}px`, lineHeight: 1.2 }}>
        Isto é golpe?
      </h1>

      {/* Abas grandes, com texto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: espaco.sm, marginBottom: espaco.lg }}>
        <BotaoAba ativo={aba === 'boleto'} onClick={() => setAba('boleto')}
                  icone={<FileDigit size={30} />} rotulo="Boleto" nota="grátis" />
        <BotaoAba ativo={aba === 'link'} onClick={() => setAba('link')}
                  icone={<Link2 size={30} />} rotulo="Link" nota="1 crédito" />
      </div>

      {/* ── BOLETO ───────────────────────────────────────────────────────── */}
      {aba === 'boleto' && (
        <>
          <p style={{
            background: cor.okBg, color: cor.okTexto,
            border: '2px solid #16A34A', borderRadius: raio.card,
            padding: espaco.md, fontSize: 20, fontWeight: 600,
            lineHeight: 1.45, margin: `0 0 ${espaco.lg}px`,
          }}>
            Conferir boleto pelos números é <strong>grátis e sem limite</strong>.
            Não gasta nenhum crédito.
          </p>

          {!resBoleto && (
            <>
              <CampoComDitado
                rotulo="Números do boleto"
                ajuda="A linha comprida de números, na parte de cima do boleto. Pode digitar sem os pontos."
                exemplo="00000.00000 00000.000000 00000.000000 0 00000000000000"
                tipo="text"
                semDitado
                valor={mascarar(numeros)}
                aoMudar={(v) => setNumeros(limpar(v).slice(0, 48))}
              />

              <p style={{ fontSize: 19, color: cor.tintaMuted, margin: `-12px 0 ${espaco.md}px` }}>
                {limpar(numeros).length} de 47 números
              </p>

              <button
                type="button"
                onClick={conferirBoleto}
                disabled={limpar(numeros).length < 40}
                style={{
                  ...botaoPrincipal,
                  background: limpar(numeros).length >= 40 ? cor.destaque : cor.borda,
                  cursor: limpar(numeros).length >= 40 ? 'pointer' : 'not-allowed',
                }}
              >
                <ShieldCheck size={34} aria-hidden="true" /> Conferir
              </button>
            </>
          )}

          {resBoleto && (
            <>
              <Semaforo veredito={resBoleto.veredito} />

              <ul style={listaMotivos}>
                {resBoleto.motivos.map((m, i) => (
                  <li key={i} style={itemMotivo}>{m}</li>
                ))}
              </ul>

              <p style={{
                background: cor.fundoCard, border: `2px solid ${cor.borda}`,
                borderRadius: raio.card, padding: espaco.md,
                fontSize: 21, fontWeight: 700, color: cor.tinta,
                lineHeight: 1.45, margin: `${espaco.md}px 0 0`,
              }}>
                {resBoleto.orientacao}
              </p>

              {(resBoleto.veredito === 'alto_risco' || resBoleto.veredito === 'atencao') && (
                <a href="tel:151" style={{ ...botaoSecundario, marginTop: espaco.md, textDecoration: 'none' }}>
                  <Phone size={28} aria-hidden="true" />
                  Ligar para o Procon (151)
                </a>
              )}

              <button type="button" onClick={recomecarBoleto}
                      style={{ ...botaoSecundario, marginTop: espaco.sm }}>
                <RotateCcw size={28} aria-hidden="true" /> Conferir outro
              </button>
            </>
          )}
        </>
      )}

      {/* ── LINK ─────────────────────────────────────────────────────────── */}
      {aba === 'link' && (
        <>
          <p style={{
            fontSize: 20, color: cor.tinta, lineHeight: 1.45,
            margin: `0 0 ${espaco.md}px`,
          }}>
            Recebeu um link por mensagem e não sabe se pode clicar? Cole aqui.
          </p>
          <p style={{ fontSize: 19, color: cor.tintaMuted, margin: `0 0 ${espaco.lg}px` }}>
            Esta análise usa <strong>1 crédito</strong>.
          </p>

          <CampoComDitado
            rotulo="Endereço do link"
            ajuda="Segure o dedo em cima do link na mensagem e escolha “Copiar”. Depois cole aqui."
            exemplo="https://..."
            semDitado
            valor={link}
            aoMudar={setLink}
          />

          <button
            type="button"
            onClick={conferirLink}
            disabled={analisando || link.trim().length < 8}
            style={{
              ...botaoPrincipal,
              background: link.trim().length >= 8 ? cor.destaque : cor.borda,
              cursor: link.trim().length >= 8 ? 'pointer' : 'not-allowed',
            }}
          >
            {analisando
              ? <><Loader2 size={32} className="animate-spin" aria-hidden="true" /> Analisando...</>
              : <><ShieldCheck size={34} aria-hidden="true" /> Conferir link</>}
          </button>

          {semCreditos && (
            <p role="alert" style={{
              background: cor.atencaoBg, color: cor.atencaoTexto,
              border: '2px solid #D97706', borderRadius: raio.card,
              padding: espaco.md, fontSize: 20, fontWeight: 600,
              lineHeight: 1.45, marginTop: espaco.md,
            }}>
              {semCreditos}
            </p>
          )}

          {resIA && (
            <>
              <Semaforo veredito={resIA.veredito} />
              <ul style={listaMotivos}>
                {resIA.motivos.map((m, i) => <li key={i} style={itemMotivo}>{m}</li>)}
              </ul>
              <p style={{
                background: cor.fundoCard, border: `2px solid ${cor.borda}`,
                borderRadius: raio.card, padding: espaco.md,
                fontSize: 21, fontWeight: 700, color: cor.tinta,
                lineHeight: 1.45, margin: `${espaco.md}px 0 0`,
              }}>
                {resIA.orientacao}
              </p>
            </>
          )}
        </>
      )}

      <p style={{
        fontSize: 19, color: cor.tintaFraca, textAlign: 'center',
        lineHeight: 1.5, margin: `${espaco.xl}px 0 0`,
      }}>
        Golpes novos aparecem todo dia. Na dúvida, ligue para quem enviou a
        cobrança usando um telefone que você já conhece — nunca o número que
        veio na mensagem.
      </p>
    </Pagina>
  );
}

// ── Semáforo de três estados ─────────────────────────────────────────────────
function Semaforo({ veredito }: { veredito: Veredito }) {
  const mapa = {
    sem_indicios: {
      Icone: ShieldCheck, bg: cor.okBg, borda: '#16A34A', txt: cor.okTexto,
      // Deliberadamente NÃO é "seguro" nem "pode pagar".
      titulo: 'Não encontramos indícios',
    },
    atencao: {
      Icone: ShieldAlert, bg: cor.atencaoBg, borda: '#D97706', txt: cor.atencaoTexto,
      titulo: 'Atenção',
    },
    alto_risco: {
      Icone: ShieldX, bg: cor.perigoBg, borda: cor.perigo, txt: cor.perigoTexto,
      titulo: 'Não pague',
    },
    digitacao: {
      Icone: FileDigit, bg: cor.fundoCard, borda: cor.borda, txt: cor.tinta,
      titulo: 'Confira os números',
    },
  }[veredito];

  const { Icone } = mapa;

  return (
    <div style={{
      background: mapa.bg, border: `3px solid ${mapa.borda}`,
      borderRadius: raio.card, padding: espaco.lg, textAlign: 'center',
      marginBottom: espaco.md,
    }}>
      <Icone size={72} style={{ color: mapa.txt }} aria-hidden="true" />
      <p style={{
        fontSize: 30, fontWeight: 800, color: mapa.txt,
        margin: `${espaco.sm}px 0 0`, lineHeight: 1.2,
      }}>
        {mapa.titulo}
      </p>
    </div>
  );
}

function BotaoAba({
  ativo, onClick, icone, rotulo, nota,
}: {
  ativo: boolean; onClick: () => void;
  icone: React.ReactNode; rotulo: string; nota: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        minHeight: toque.confortavel, padding: espaco.sm,
        borderRadius: raio.botao,
        border: `3px solid ${ativo ? cor.destaque : cor.borda}`,
        background: ativo ? cor.destaqueSuave : cor.fundo,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}
    >
      <span style={{ color: ativo ? cor.destaqueTexto : cor.tintaMuted, display: 'flex' }} aria-hidden="true">
        {icone}
      </span>
      <span style={{ fontSize: 21, fontWeight: 700, color: cor.tinta }}>{rotulo}</span>
      <span style={{ fontSize: 17, color: cor.tintaMuted }}>{nota}</span>
    </button>
  );
}



const botaoPrincipal: React.CSSProperties = {
  minHeight: toque.critico, width: '100%',
  borderRadius: raio.botao, border: 'none',
  color: '#FFFFFF', fontSize: 26, fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
};

const botaoSecundario: React.CSSProperties = {
  minHeight: toque.confortavel, width: '100%',
  borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
  background: cor.fundo, color: cor.destaqueTexto,
  fontSize: 21, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
};

const listaMotivos: React.CSSProperties = {
  margin: 0, padding: `0 0 0 ${espaco.lg}px`,
};

const itemMotivo: React.CSSProperties = {
  fontSize: 21, color: cor.tinta, lineHeight: 1.6, marginBottom: 6,
};
