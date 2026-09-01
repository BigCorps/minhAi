'use client';

// components/melhoria/CartaoDose.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Um cartão por dose. Uma ação por cartão.
//
// A confirmação é INEQUÍVOCA: ao tocar em "Tomei", o cartão muda de cor, ganha
// um ✓ grande e mostra a hora do registro. Sem isso a pessoa toca de novo por
// insegurança, e a dúvida "será que marquei?" é justamente o que o app
// existe para eliminar.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Check, Clock, X, Loader2, AlertTriangle } from 'lucide-react';
import {
  cor, fonte, px, toque, raio, espaco, horaCurta,
  type TamanhoFonte,
} from '@/lib/melhoria/tema';

export type StatusDose =
  | 'pendente' | 'notificado' | 'tomado' | 'pulado' | 'perdido';

export interface DoseDoDia {
  id: string;
  previsto_para: string;
  status: StatusDose;
  confirmado_em: string | null;
  medicamento_nome: string;
  medicamento_dosagem: string | null;
  medicamento_forma: string | null;
  quantidade: number;
}

interface Props {
  dose: DoseDoDia;
  timezone?: string;
  escala?: TamanhoFonte;
  aoConfirmar: (id: string, status: 'tomado' | 'pulado') => Promise<void>;
  /** speechSynthesis do navegador. Opt-in, desligado por padrão. */
  falar?: boolean;
}

export default function CartaoDose({
  dose, timezone = 'America/Sao_Paulo', escala = 'grande',
  aoConfirmar, falar = false,
}: Props) {
  const [salvando, setSalvando] = useState<'tomado' | 'pulado' | null>(null);

  const resolvida = dose.status === 'tomado' || dose.status === 'pulado';
  const perdida   = dose.status === 'perdido';
  const atrasada  =
    !resolvida && !perdida && new Date(dose.previsto_para) < new Date();

  async function confirmar(status: 'tomado' | 'pulado') {
    if (salvando || resolvida) return;
    setSalvando(status);
    try {
      await aoConfirmar(dose.id, status);
      if (falar && typeof window !== 'undefined') {
        const fala = new SpeechSynthesisUtterance(
          status === 'tomado' ? 'Anotado.' : 'Anotado que não tomou.'
        );
        fala.lang = 'pt-BR';
        window.speechSynthesis?.speak(fala);
      }
    } finally {
      setSalvando(null);
    }
  }

  const fundo =
    dose.status === 'tomado' ? cor.okBg
    : dose.status === 'pulado' ? cor.fundoCard
    : perdida   ? cor.perigoBg
    : atrasada  ? cor.atencaoBg
    : cor.fundoCard;

  const borda =
    dose.status === 'tomado' ? '#16A34A'
    : perdida  ? cor.perigo
    : atrasada ? '#D97706'
    : cor.borda;

  const descricao = [
    dose.medicamento_dosagem,
    dose.quantidade !== 1 ? `${dose.quantidade} ${dose.medicamento_forma ?? 'dose'}s` : dose.medicamento_forma,
  ].filter(Boolean).join(' · ');

  return (
    <article
      style={{
        background: fundo,
        border: `3px solid ${borda}`,
        borderRadius: raio.card,
        padding: espaco.md,
        marginBottom: espaco.md,
      }}
    >
      {/* Horário + nome */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: espaco.sm, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: px(fonte.numero, escala),
          fontWeight: 800,
          color: cor.tinta,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {horaCurta(dose.previsto_para, timezone)}
        </span>

        {atrasada && !resolvida && !perdida && (
          <span style={{
            fontSize: px(fonte.rotulo, escala),
            fontWeight: 700,
            color: cor.atencaoTexto,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Clock size={22} aria-hidden="true" /> passou da hora
          </span>
        )}
      </div>

      <h3 style={{
        fontSize: px(fonte.titulo, escala),
        fontWeight: 700,
        color: cor.tinta,
        margin: `${espaco.xs}px 0 0`,
        lineHeight: 1.25,
      }}>
        {dose.medicamento_nome}
      </h3>

      {descricao && (
        <p style={{
          fontSize: px(fonte.corpo, escala),
          color: cor.tintaMuted,
          margin: `4px 0 0`,
        }}>
          {descricao}
        </p>
      )}

      {/* Estado resolvido */}
      {dose.status === 'tomado' && (
        <p style={{
          display: 'flex', alignItems: 'center', gap: espaco.xs,
          fontSize: px(fonte.corpo, escala),
          fontWeight: 700,
          color: cor.okTexto,
          margin: `${espaco.md}px 0 0`,
        }}>
          <Check size={34} strokeWidth={3} aria-hidden="true" />
          Tomado
          {dose.confirmado_em && ` às ${horaCurta(dose.confirmado_em, timezone)}`}
        </p>
      )}

      {dose.status === 'pulado' && (
        <p style={{
          display: 'flex', alignItems: 'center', gap: espaco.xs,
          fontSize: px(fonte.corpo, escala),
          fontWeight: 700,
          color: cor.tintaMuted,
          margin: `${espaco.md}px 0 0`,
        }}>
          <X size={34} strokeWidth={3} aria-hidden="true" />
          Marcado como não tomado
        </p>
      )}

      {perdida && (
        <p style={{
          display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
          fontSize: px(fonte.corpo, escala),
          fontWeight: 600,
          color: cor.perigoTexto,
          margin: `${espaco.md}px 0 0`,
          lineHeight: 1.4,
        }}>
          <AlertTriangle size={30} aria-hidden="true" style={{ flexShrink: 0 }} />
          {/* Deliberadamente NÃO oferece "tomar agora": remédio muito atrasado
              pode ser perigoso, e a orientação é do médico, não do aplicativo. */}
          Este horário passou sem confirmação. Se tiver dúvida, fale com quem
          acompanha seu tratamento.
        </p>
      )}

      {/* Ações */}
      {!resolvida && !perdida && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: espaco.sm, marginTop: espaco.md }}>
          <button
            type="button"
            onClick={() => confirmar('tomado')}
            disabled={!!salvando}
            style={{
              minHeight: toque.critico,
              borderRadius: raio.botao,
              border: 'none',
              background: cor.destaque,
              color: '#FFFFFF',
              fontSize: px(fonte.titulo, escala),
              fontWeight: 800,
              cursor: salvando ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            }}
          >
            {salvando === 'tomado'
              ? <Loader2 size={34} className="animate-spin" aria-hidden="true" />
              : <Check size={38} strokeWidth={3} aria-hidden="true" />}
            Tomei
          </button>

          <button
            type="button"
            onClick={() => confirmar('pulado')}
            disabled={!!salvando}
            style={{
              minHeight: toque.min,
              borderRadius: raio.botao,
              border: `2px solid ${cor.borda}`,
              background: 'transparent',
              color: cor.tintaMuted,
              fontSize: px(fonte.corpo, escala),
              fontWeight: 700,
              cursor: salvando ? 'wait' : 'pointer',
            }}
          >
            {salvando === 'pulado' ? 'Salvando...' : 'Não tomei'}
          </button>
        </div>
      )}
    </article>
  );
}
