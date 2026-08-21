'use client';

// components/melhoria/CampoComDitado.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Campo de texto com microfone embutido. O microfone DITA, não comanda: o que
// a pessoa fala aparece na caixa para ela conferir e corrigir antes de salvar.
//
// Se o navegador não suporta ditado, o ícone simplesmente não aparece — em vez
// de aparecer e falhar quando tocado, que é pior.
// ─────────────────────────────────────────────────────────────────────────────

import { useId } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { useDitado } from '@/hooks/useDitado';
import {
  cor, fonte, px, toque, raio, espaco, estiloCampo,
  type TamanhoFonte,
} from '@/lib/melhoria/tema';

interface Props {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;

  /** Texto de apoio abaixo do rótulo. Escreva em português claro. */
  ajuda?: string;
  exemplo?: string;
  tipo?: 'text' | 'tel' | 'number' | 'time' | 'date';
  multilinha?: boolean;
  obrigatorio?: boolean;
  escala?: TamanhoFonte;
  /** Some com o microfone mesmo onde há suporte (ex.: campo de hora). */
  semDitado?: boolean;
  erro?: string | null;
}

export default function CampoComDitado({
  rotulo, valor, aoMudar,
  ajuda, exemplo,
  tipo = 'text',
  multilinha = false,
  obrigatorio = false,
  escala = 'grande',
  semDitado = false,
  erro = null,
}: Props) {
  const id = useId();

  const ditado = useDitado({
    // Substitui em vez de concatenar: a pessoa vê o que falou e edita. Somar ao
    // que já estava produz frases duplicadas quando ela repete por insegurança.
    aoParcial: (t) => aoMudar(t),
  });

  const mostrarMic = !semDitado && ditado.suportado && tipo === 'text';
  const Campo: any = multilinha ? 'textarea' : 'input';

  return (
    <div style={{ marginBottom: espaco.lg }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: px(fonte.corpo, escala),
          fontWeight: 700,
          color: cor.tinta,
          marginBottom: espaco.xs,
          lineHeight: 1.3,
        }}
      >
        {rotulo}
        {obrigatorio && (
          <span style={{ color: cor.perigo, marginLeft: 6 }} aria-hidden="true">*</span>
        )}
      </label>

      {ajuda && (
        <p style={{
          fontSize: px(fonte.rotulo, escala),
          color: cor.tintaMuted,
          margin: `0 0 ${espaco.xs}px`,
          lineHeight: 1.4,
        }}>
          {ajuda}
        </p>
      )}

      <div style={{ position: 'relative' }}>
        <Campo
          id={id}
          type={multilinha ? undefined : tipo}
          value={valor}
          onChange={(e: any) => aoMudar(e.target.value)}
          placeholder={exemplo}
          rows={multilinha ? 4 : undefined}
          inputMode={tipo === 'tel' ? 'tel' : tipo === 'number' ? 'decimal' : undefined}
          aria-invalid={!!erro}
          aria-describedby={erro ? `${id}-erro` : undefined}
          style={{
            ...estiloCampo(escala),
            paddingRight: mostrarMic ? toque.min + espaco.md : espaco.md,
            borderColor: erro ? cor.perigo : ditado.gravando ? cor.destaque : cor.borda,
            resize: multilinha ? 'vertical' : undefined,
            fontFamily: 'inherit',
          }}
        />

        {mostrarMic && (
          <button
            type="button"
            onClick={ditado.alternar}
            aria-label={ditado.gravando ? 'Parar de ditar' : 'Ditar pelo microfone'}
            aria-pressed={ditado.gravando}
            style={{
              position: 'absolute',
              right: espaco.xs,
              // Centro vertical real. A versão anterior usava `top: 8px` com
              // altura fixa, contando que o campo tivesse exatamente 64px —
              // mas com fonte 24 e padding o campo cresce, e o microfone
              // ficava alto demais. Em campo de várias linhas ele fica no
              // topo, que é onde a pessoa está digitando.
              top: multilinha ? espaco.xs : '50%',
              transform: multilinha ? undefined : 'translateY(-50%)',
              width: toque.min - 8,
              height: toque.min - 8,
              minWidth: toque.min - 8,
              borderRadius: raio.botao,
              border: 'none',
              background: ditado.gravando ? cor.perigo : cor.destaqueSuave,
              color: ditado.gravando ? '#FFFFFF' : cor.destaqueTexto,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 0,
            }}
          >
            {ditado.gravando
              ? <Square size={26} fill="currentColor" />
              : <Mic size={30} />}
          </button>
        )}
      </div>

      {ditado.gravando && (
        <p
          role="status"
          style={{
            fontSize: px(fonte.rotulo, escala),
            color: cor.destaqueTexto,
            fontWeight: 700,
            margin: `${espaco.xs}px 0 0`,
          }}
        >
          Estou ouvindo. Fale e depois diga “pronto”.
        </p>
      )}

      {(erro || ditado.erro) && (
        <p
          id={`${id}-erro`}
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: px(fonte.rotulo, escala),
            color: cor.perigoTexto,
            fontWeight: 600,
            margin: `${espaco.xs}px 0 0`,
          }}
        >
          <AlertCircle size={22} aria-hidden="true" />
          {erro || ditado.erro}
        </p>
      )}
    </div>
  );
}
