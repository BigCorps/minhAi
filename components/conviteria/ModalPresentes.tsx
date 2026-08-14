'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';
import { tokensDoConvite } from '@/lib/conviteria/tokens';
import type { PresenteExibicao } from '@/lib/conviteria/tipos';

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Passo = 'lista' | 'dados' | 'gerando' | 'pix' | 'pago';

export default function ModalPresentes({
  eventoId, presentes, temaId, fonteId, aoFechar,
}: {
  eventoId: string;
  presentes: PresenteExibicao[];
  temaId: string;
  fonteId: string;
  aoFechar: () => void;
}) {
  const [montado, setMontado] = useState(false);
  const [passo, setPasso] = useState<Passo>('lista');
  const [escolhido, setEscolhido] = useState<PresenteExibicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [valorLivre, setValorLivre] = useState('');
  const [pix, setPix] = useState<{
    pagamentoId: string; valorCentavos: number; qrcode?: string; copiaECola?: string
  } | null>(null);

  const { getToken, containerRef } = useTurnstile();

  useEffect(() => {
    setMontado(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  if (!montado) return null;

  function escolher(p: PresenteExibicao) {
    setEscolhido(p);
    setValorLivre('');
    setErro(null);
    setPasso('dados');
  }

  async function gerar() {
    if (!escolhido) return;
    const centavos = escolhido.valorCentavos > 0
      ? escolhido.valorCentavos
      : Math.round(parseFloat(valorLivre.replace(',', '.')) * 100);

    if (!Number.isFinite(centavos) || centavos < 500) {
      setErro('Informe um valor de pelo menos R$ 5,00.');
      return;
    }

    setPasso('gerando');
    setErro(null);

    try {
      const turnstile = await getToken();
      const r = await fetch('/api/conviteria/presente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId,
          presenteId: escolhido.id,
          valorCentavos: escolhido.valorCentavos > 0 ? undefined : centavos,
          pagadorNome: nome.trim() || undefined,
          mensagem: mensagem.trim() || undefined,
          turnstile,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(d?.erro ?? 'Não foi possível gerar o PIX.');
        setPasso('dados');
        return;
      }
      setPix(d);
      setPasso('pix');
    } catch {
      setErro('Falha de conexão. Tente de novo.');
      setPasso('dados');
    }
  }

  async function copiar() {
    if (!pix?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('Não foi possível copiar. Use o QR Code.');
    }
  }

  const modal = (
    <div
      className="cv-modal-fundo"
      style={tokensDoConvite(temaId, fonteId)}
      role="dialog"
      aria-modal="true"
      aria-label="Lista de presentes"
      onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      <div className="cv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="cv-modal-topo">
          <h2>
            {passo === 'lista' && 'Lista de presentes'}
            {passo === 'dados' && escolhido?.titulo}
            {(passo === 'gerando' || passo === 'pix') && 'Pagamento'}
            {passo === 'pago' && 'Obrigado!'}
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="cv-modal-corpo">
          {erro && (
            <p className="cv-modal-erro">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erro}
            </p>
          )}

          {passo === 'lista' && (
            <ul className="cv-modal-lista">
              {presentes.map((p) => (
                <li key={p.id}>
                  <button type="button" disabled={p.esgotado}
                    onClick={() => escolher(p)} className="cv-modal-item">
                    {p.imagemUrl && <img src={p.imagemUrl} alt="" loading="lazy" />}
                    <span className="cv-modal-item-txt">
                      <strong>{p.titulo}</strong>
                      <small>
                        {p.esgotado ? 'Já presenteado'
                          : p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Você escolhe o valor'}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {passo === 'dados' && escolhido && (
            <div className="cv-modal-form">
              {escolhido.valorCentavos > 0 ? (
                <p className="cv-modal-valor">{brl(escolhido.valorCentavos)}</p>
              ) : (
                <label>Valor do presente
                  <input type="text" inputMode="decimal" placeholder="0,00"
                    value={valorLivre}
                    onChange={(e) => setValorLivre(e.target.value.replace(/[^\d,]/g, ''))} />
                </label>
              )}

              <label>Seu nome <span>(opcional)</span>
                <input type="text" maxLength={80} value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Para os noivos saberem quem foi" />
              </label>

              <label>Recado <span>(opcional)</span>
                <textarea maxLength={400} rows={3} value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Uma mensagem para o casal" />
              </label>

              <div ref={containerRef} className="cv-turnstile" />

              <div className="cv-modal-acoes">
                <button type="button" className="cv-botao cv-botao-fantasma"
                  onClick={() => setPasso('lista')}>Voltar</button>
                <button type="button" className="cv-botao" onClick={gerar}>Gerar PIX</button>
              </div>
            </div>
          )}

          {passo === 'gerando' && (
            <div className="cv-modal-centro">
              <Loader2 className="w-8 h-8 animate-spin" /><p>Gerando o PIX…</p>
            </div>
          )}

          {passo === 'pix' && pix && (
            <div className="cv-modal-centro">
              <p className="cv-modal-valor">{brl(pix.valorCentavos)}</p>
              {pix.qrcode && <img src={pix.qrcode} alt="QR Code do PIX" className="cv-modal-qr" />}
              <p className="cv-modal-dica">Escaneie no app do seu banco.</p>
              {pix.copiaECola && (
                <button type="button" className="cv-botao cv-botao-fantasma" onClick={copiar}>
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Código copiado!' : 'Copiar código PIX'}
                </button>
              )}
              <button type="button" className="cv-botao" onClick={() => setPasso('pago')}>
                Concluir
              </button>
            </div>
          )}

          {passo === 'pago' && (
            <div className="cv-modal-centro">
              <CheckCircle2 className="w-12 h-12" />
              <p className="cv-modal-valor">Obrigado!</p>
              <p className="cv-modal-dica">
                Assim que o pagamento cair, o presente será registrado para o casal.
              </p>
              <button type="button" className="cv-botao" onClick={aoFechar}>
                Voltar ao convite
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
