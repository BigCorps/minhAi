'use client';

// components/conviteria/ModalPresentes.tsx
//
// Lista de presentes em modal, com o PIX acontecendo dentro.
//
// Fica em modal, e nao aberta na pagina, por dois motivos: a lista pode ter 24
// itens e empurraria o resto do convite para baixo, e pagar exige sair do
// clima da peca — melhor que isso aconteca numa camada por cima, de onde a
// pessoa volta ao convite com um toque.
//
// O convidado nao tem conta. Toda protecao aqui e Turnstile mais validacao no
// servidor: a rota /api/conviteria/presente recusa valor vindo do cliente para
// item de preco fixo, justamente porque nao ha sessao em que confiar.

import { useEffect, useState } from 'react';
import { X, Copy, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';
import type { PresenteExibicao } from '@/lib/conviteria/tipos';

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Passo = 'lista' | 'dados' | 'gerando' | 'pix' | 'pago';

export default function ModalPresentes({
  eventoId,
  presentes,
  aoFechar,
}: {
  eventoId: string;
  presentes: PresenteExibicao[];
  aoFechar: () => void;
}) {
  const [passo, setPasso] = useState<Passo>('lista');
  const [escolhido, setEscolhido] = useState<PresenteExibicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [valorLivre, setValorLivre] = useState('');

  const [pix, setPix] = useState<{ pagamentoId: string; valorCentavos: number; qrcode?: string; copiaECola?: string } | null>(null);

  const { getToken, containerRef } = useTurnstile();

  // Esc fecha, e o fundo da pagina para de rolar enquanto o modal esta aberto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

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
          // Enviado apenas para item de valor livre. Para preco fixo a rota
          // ignora e usa o valor do banco.
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

  return (
    <div className="cv-modal-fundo" role="dialog" aria-modal="true" aria-label="Lista de presentes">
      <div className="cv-modal">
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
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </p>
          )}

          {passo === 'lista' && (
            <ul className="cv-modal-lista">
              {presentes.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={p.esgotado}
                    onClick={() => escolher(p)}
                    className="cv-modal-item"
                  >
                    {p.imagemUrl && <img src={p.imagemUrl} alt="" loading="lazy" />}
                    <span className="cv-modal-item-txt">
                      <strong>{p.titulo}</strong>
                      <small>
                        {p.esgotado
                          ? 'Já presenteado'
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
                <label>
                  Valor do presente
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorLivre}
                    onChange={(e) => setValorLivre(e.target.value.replace(/[^\d,]/g, ''))}
                  />
                </label>
              )}

              <label>
                Seu nome <span>(opcional)</span>
                <input
                  type="text"
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Para os noivos saberem quem foi"
                />
              </label>

              <label>
                Recado <span>(opcional)</span>
                <textarea
                  maxLength={400}
                  rows={3}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Uma mensagem para o casal"
                />
              </label>

              {/* Turnstile invisível, fora da área visível. */}
              <div
                ref={containerRef}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
                aria-hidden="true"
              />

              <div className="cv-modal-acoes">
                <button type="button" className="cv-botao cv-botao-fantasma" onClick={() => setPasso('lista')}>
                  Voltar
                </button>
                <button type="button" className="cv-botao" onClick={gerar}>
                  Gerar PIX
                </button>
              </div>
            </div>
          )}

          {passo === 'gerando' && (
            <div className="cv-modal-centro">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Gerando o PIX…</p>
            </div>
          )}

          {passo === 'pix' && pix && (
            <div className="cv-modal-centro">
              <p className="cv-modal-valor">{brl(pix.valorCentavos)}</p>
              {pix.qrcode && <img src={pix.qrcode} alt="QR Code do PIX" className="cv-modal-qr" />}
              <p className="cv-modal-dica">
                Escaneie no app do seu banco. Os noivos recebem a confirmação
                automaticamente.
              </p>
              {pix.copiaECola && (
                <button type="button" className="cv-botao cv-botao-fantasma" onClick={copiar}>
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Código copiado!' : 'Copiar código PIX'}
                </button>
              )}
              {/* Sem botao "ja paguei": quem confirma e o webhook, e um botao
                  que nao consulta nada so ensinaria a desconfiar da tela. */}
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
                Assim que o pagamento cair, seu presente aparece na lista do
                casal.
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
}
