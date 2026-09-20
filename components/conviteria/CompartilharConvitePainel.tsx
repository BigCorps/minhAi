'use client';

import { Check, ChevronDown, ChevronUp, Clipboard, Link2, MessageCircle, RotateCcw, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

function mensagemPadrao(titulo: string, url: string) {
  return [
    '💌 Você está convidado(a)!',
    '',
    `Preparamos um convite especial para *${titulo}*. ✨`,
    '',
    'Acesse aqui:',
    url,
    '',
    'No convite você encontra todos os detalhes do evento e pode confirmar sua presença.',
    '',
    'Esperamos você! 💕',
    '',
    'Convite digital criado com ConviteIA.',
  ].join('\n');
}

export default function CompartilharConvitePainel({
  eventoId,
  titulo,
  url,
}: {
  eventoId: string;
  titulo: string;
  url: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<'link' | 'mensagem' | null>(null);
  const customizado = useRef(false);
  const sugestao = useMemo(() => mensagemPadrao(titulo, url), [titulo, url]);
  const [texto, setTexto] = useState(sugestao);
  const chaveLocal = `conviteia:compartilhar:${eventoId}`;

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(chaveLocal);
      if (salvo?.trim()) {
        customizado.current = true;
        setTexto(salvo);
      }
    } catch {
      // Compartilhar continua funcionando sem localStorage.
    }
  }, [chaveLocal]);

  useEffect(() => {
    if (!customizado.current) setTexto(sugestao);
  }, [sugestao]);

  function alterarTexto(valor: string) {
    customizado.current = true;
    setTexto(valor);
    try {
      window.localStorage.setItem(chaveLocal, valor);
    } catch {
      // Sem impacto no compartilhamento.
    }
  }

  function restaurar() {
    customizado.current = false;
    setTexto(sugestao);
    try {
      window.localStorage.removeItem(chaveLocal);
    } catch {
      // Sem impacto no compartilhamento.
    }
  }

  async function copiar(valor: string, tipo: 'link' | 'mensagem') {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(null), 1800);
    } catch {
      setCopiado(null);
    }
  }

  function abrirWhatsApp() {
    const mensagem = texto.trim();
    if (!mensagem) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: '#c0607822' }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: '#a04a63' }}>
          <Send className="h-4 w-4" />
          Compartilhar convite
        </span>
        {aberto
          ? <ChevronUp className="h-4 w-4" style={{ color: '#9b7b84' }} />
          : <ChevronDown className="h-4 w-4" style={{ color: '#9b7b84' }} />}
      </button>

      {aberto && (
        <div className="mt-4 rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: '#fff9fb', borderColor: '#c0607833' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#40232c' }}>Envie o convite para quem você quiser</p>
            <p className="mt-1 text-xs leading-5" style={{ color: '#7c5560' }}>
              Aqui você apenas compartilha o link do convite. Para envios para a lista de convidados, lembretes e WhatsApp oficial do ConviteIA, use <strong>Gestão do Evento → Comunicações</strong>.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copiar(url, 'link')}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-xs font-semibold"
              style={{ borderColor: '#c0607833', color: '#7c5560' }}
            >
              {copiado === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copiado === 'link' ? 'Link copiado' : 'Copiar link'}
            </button>
            <button
              type="button"
              onClick={abrirWhatsApp}
              disabled={!texto.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-45"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir no WhatsApp
            </button>
          </div>

          <label className="mt-4 block text-xs font-semibold" style={{ color: '#40232c' }}>
            Mensagem
            <textarea
              value={texto}
              onChange={(e) => alterarTexto(e.target.value)}
              rows={7}
              maxLength={2500}
              aria-label="Mensagem para compartilhar o convite"
              className="mt-2 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm font-normal leading-6 outline-none"
              style={{ borderColor: '#c0607833', color: '#40232c' }}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copiar(texto.trim(), 'mensagem')}
              disabled={!texto.trim()}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-45"
              style={{ borderColor: '#c0607833', color: '#7c5560' }}
            >
              {copiado === 'mensagem' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiado === 'mensagem' ? 'Mensagem copiada' : 'Copiar mensagem'}
            </button>
            <button
              type="button"
              onClick={restaurar}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-medium"
              style={{ color: '#a04a63' }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar sugestão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
