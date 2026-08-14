'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';
import { tokensDoConvite } from '@/lib/conviteria/tokens';

export default function ModalRecado({
  eventoId, temaId, fonteId, aoFechar, aoEnviado,
}: {
  eventoId: string;
  temaId: string;
  fonteId: string;
  aoFechar: () => void;
  aoEnviado?: () => void;
}) {
  const [montado, setMontado] = useState(false);
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const { getToken, containerRef } = useTurnstile();

  useEffect(() => {
    setMontado(true);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, []);

  if (!montado) return null;

  async function enviar() {
    if (!nome.trim() || !mensagem.trim()) {
      setErro('Preencha seu nome e o recado.');
      return;
    }
    setEnviando(true); setErro('');
    try {
      const turnstile = await getToken();
      const r = await fetch('/api/conviteria/recado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId,
          nome: nome.trim(),
          mensagem: mensagem.trim(),
          turnstile,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível enviar o recado.');
      setEnviado(true);
      aoEnviado?.();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível enviar o recado.');
    } finally {
      setEnviando(false);
    }
  }

  return createPortal(
    <div className="cv-modal-fundo" style={tokensDoConvite(temaId, fonteId)}
      role="dialog" aria-modal="true" aria-label="Deixar um recado"
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo">
          <h2>Deixar um recado</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="cv-modal-corpo">
          {!enviado ? (
            <div className="cv-modal-form">
              <label>Seu nome
                <input maxLength={80} value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Como você quer aparecer no mural" />
              </label>
              <label>Seu recado
                <textarea rows={5} maxLength={600} value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Escreva uma mensagem para o casal" />
              </label>
              <div ref={containerRef}
                style={{ position:'absolute', left:'-9999px', width:1, height:1, overflow:'hidden' }}
                aria-hidden="true" />
              {erro && <p className="cv-modal-erro">{erro}</p>}
              <button type="button" className="cv-botao" onClick={enviar} disabled={enviando}>
                {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : 'Enviar recado'}
              </button>
              <p className="cv-modal-dica">
                O recado será publicado depois da aprovação dos anfitriões.
              </p>
            </div>
          ) : (
            <div className="cv-modal-centro">
              <CheckCircle2 className="w-12 h-12" />
              <p className="cv-modal-valor">Recado enviado!</p>
              <p className="cv-modal-dica">
                Obrigado. Os anfitriões poderão aprová-lo antes de aparecer no mural.
              </p>
              <button type="button" className="cv-botao" onClick={aoFechar}>Voltar ao convite</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
