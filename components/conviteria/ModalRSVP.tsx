'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { tokensDoConvite } from '@/lib/conviteria/tokens';

export default function ModalRSVP({
  eventoId,
  temaId,
  fonteId,
  aoFechar,
}: {
  eventoId: string;
  temaId: string;
  fonteId: string;
  aoFechar: () => void;
}) {
  const [montado, setMontado] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [familia, setFamilia] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmado, setConfirmado] = useState<number | null>(null);
  const [atualizado, setAtualizado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };

    document.addEventListener('keydown', tecla);

    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener('keydown', tecla);
    };
  }, [aoFechar]);

  if (!montado) return null;

  function adicionar() {
    if (familia.length >= 20) return;
    setFamilia((f) => [...f, '']);
  }

  function alterar(i: number, valor: string) {
    setFamilia((f) => f.map((v, idx) => idx === i ? valor : v));
  }

  function remover(i: number) {
    setFamilia((f) => f.filter((_, idx) => idx !== i));
  }

  async function confirmar() {
    setErro('');

    if (nome.trim().length < 2) {
      setErro('Informe seu nome.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Informe um e-mail válido.');
      return;
    }

    setEnviando(true);

    try {
      const r = await fetch('/api/conviteria/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId,
          nome: nome.trim(),
          email: email.trim(),
          acompanhantes: familia.map((x) => x.trim()).filter(Boolean),
        }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(d?.erro || 'Não foi possível confirmar.');
      }

      setConfirmado(Number(d.totalPessoas ?? 1));
      setAtualizado(Boolean(d.atualizado));
    } catch (e: any) {
      setErro(e.message || 'Não foi possível confirmar sua presença.');
    } finally {
      setEnviando(false);
    }
  }

  return createPortal(
    <div
      className="cv-modal-fundo"
      style={tokensDoConvite(temaId, fonteId)}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação de presença"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo">
          <h2>Confirmar presença</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="cv-modal-corpo">
          {confirmado == null ? (
            <div className="cv-modal-form">
              <p className="cv-rsvp-intro">
                Informe quem irá ao evento. Se precisar corrigir depois,
                envie novamente usando o mesmo e-mail.
              </p>

              <label>
                Seu nome
                <input
                  type="text"
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Ex.: Ana Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </label>

              <label>
                Seu e-mail
                <input
                  type="email"
                  maxLength={180}
                  autoComplete="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <div className="cv-rsvp-familia">
                <div className="cv-rsvp-familia-topo">
                  <div>
                    <strong>Pessoas da sua família que também irão</strong>
                    <small>Não repita seu próprio nome.</small>
                  </div>

                  <button
                    type="button"
                    onClick={adicionar}
                    disabled={familia.length >= 20}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {familia.length === 0 && (
                  <p className="cv-rsvp-sozinho">
                    Se for somente você, pode confirmar assim mesmo.
                  </p>
                )}

                <div className="cv-rsvp-pessoas">
                  {familia.map((pessoa, i) => (
                    <div className="cv-rsvp-pessoa" key={i}>
                      <input
                        type="text"
                        maxLength={120}
                        placeholder={`Pessoa ${i + 2}`}
                        value={pessoa}
                        onChange={(e) => alterar(i, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => remover(i)}
                        aria-label="Remover pessoa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {erro && <p className="cv-modal-erro">{erro}</p>}

              <button
                type="button"
                className="cv-botao cv-botao-icone"
                disabled={enviando}
                onClick={confirmar}
              >
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {enviando ? 'Confirmando…' : 'Confirmar presença'}
              </button>

              <p className="cv-rsvp-privacidade">
                O e-mail será usado pelos anfitriões para informações relacionadas ao evento.
              </p>
            </div>
          ) : (
            <div className="cv-modal-centro">
              <CheckCircle2 className="w-12 h-12" />
              <p className="cv-modal-valor">
                {atualizado ? 'Confirmação atualizada!' : 'Presença confirmada!'}
              </p>
              <p className="cv-modal-dica">
                {confirmado === 1
                  ? 'Confirmamos a sua presença.'
                  : `Confirmamos a presença de ${confirmado} pessoas da sua família.`}
              </p>
              <button type="button" className="cv-botao" onClick={aoFechar}>
                Voltar ao convite
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
