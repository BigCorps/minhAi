'use client';

// hooks/useDitado.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ditado por microfone — SEMPRE GRATUITO.
//
// A minhAi bifurca por useIsMobile(), que olha só `window.innerWidth < 768`, e
// manda o caminho "mobile" para o GoogleSpeechWebSocket, que é PAGO por uso.
// Numa loja isso é marginal, porque a maioria dos acessos é desktop. Na
// MelhorIA seria quase todo acesso — todo ditado, de todo idoso, todo dia,
// saindo do bolso.
//
// Aqui o critério é DETECÇÃO DE RECURSO, não largura de tela:
//   tem SpeechRecognition  → nativo do navegador, custo zero
//   não tem                → o campo continua funcionando por digitação
//
// O Google Speech NÃO entra neste caminho em hipótese nenhuma. Se um dia for
// preciso um fallback de reconhecimento, é o /api/vosk-proxy que já existe no
// repositório — também gratuito.
//
// O ditado NÃO É COMANDO. Ele só preenche a caixa de texto; a pessoa confere e
// corrige antes de salvar. Nada é executado a partir do que foi falado.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

// Palavras que encerram a gravação. Vindas do CriarNotaDisplay da minhAi, que
// já validou essa lista em campo.
const GATILHOS_FIM = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:]+/g, '');
}

function removerGatilhoFinal(texto: string): string {
  let saida = texto;
  for (const g of GATILHOS_FIM) {
    saida = saida.replace(new RegExp(`\\s*${g}\\s*$`, 'gi'), '');
  }
  return saida.trim();
}

export interface UseDitadoOpts {
  /** Recebe o texto final. O componente decide o que fazer com ele. */
  aoFinalizar?: (texto: string) => void;
  /** Recebe o texto parcial, para exibir enquanto a pessoa fala. */
  aoParcial?: (texto: string) => void;
  /** Encerra sozinho após N ms sem fala. 0 desliga. Padrão: 8000. */
  silencioMs?: number;
}

export interface UseDitado {
  /** false = navegador sem suporte. Esconda o ícone de microfone. */
  suportado: boolean;
  gravando: boolean;
  parcial: string;
  erro: string | null;
  iniciar: () => void;
  parar: () => void;
  alternar: () => void;
}

export function useDitado(opts: UseDitadoOpts = {}): UseDitado {
  const { aoFinalizar, aoParcial, silencioMs = 8000 } = opts;

  const [suportado, setSuportado] = useState(false);
  const [gravando, setGravando]   = useState(false);
  const [parcial, setParcial]     = useState('');
  const [erro, setErro]           = useState<string | null>(null);

  const recRef      = useRef<any>(null);
  const finalRef    = useRef<string>('');
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pararManual = useRef(false);

  // Callbacks em ref: sem isso, cada render recria o reconhecedor e a gravação
  // morre no meio de uma frase.
  const cbFinal   = useRef(aoFinalizar); cbFinal.current   = aoFinalizar;
  const cbParcial = useRef(aoParcial);   cbParcial.current = aoParcial;

  // ── Detecção de recurso ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setSuportado(ok);
  }, []);

  const limparTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const parar = useCallback(() => {
    pararManual.current = true;
    limparTimer();
    try { recRef.current?.stop(); } catch { /* já parado */ }
  }, [limparTimer]);

  const armarSilencio = useCallback(() => {
    if (!silencioMs) return;
    limparTimer();
    timerRef.current = setTimeout(() => {
      try { recRef.current?.stop(); } catch { /* ignora */ }
    }, silencioMs);
  }, [silencioMs, limparTimer]);

  const iniciar = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setErro('Este aparelho não permite ditar. Você pode digitar normalmente.');
      return;
    }

    // Se já havia um reconhecedor, encerra antes de abrir outro.
    try { recRef.current?.abort(); } catch { /* ignora */ }

    const rec = new SR();
    rec.lang            = 'pt-BR';
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    finalRef.current  = '';
    pararManual.current = false;
    setErro(null);
    setParcial('');

    rec.onstart = () => { setGravando(true); armarSilencio(); };

    rec.onresult = (evento: any) => {
      armarSilencio();
      let provisorio = '';

      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const trecho = evento.results[i][0].transcript as string;

        if (evento.results[i].isFinal) {
          const limpo = trecho.trim();

          // "pronto" sozinho encerra e não entra no texto.
          if (GATILHOS_FIM.includes(normalizar(limpo))) {
            pararManual.current = true;
            try { rec.stop(); } catch { /* ignora */ }
            return;
          }

          finalRef.current = `${finalRef.current} ${limpo}`.trim();
        } else {
          provisorio += trecho;
        }
      }

      const visivel = `${finalRef.current} ${provisorio}`.trim();
      setParcial(visivel);
      cbParcial.current?.(visivel);
    };

    rec.onerror = (evento: any) => {
      const codigo = evento?.error;
      // 'aborted' e 'no-speech' são fluxo normal, não erro que mereça alarme.
      if (codigo === 'aborted' || codigo === 'no-speech') return;

      setErro(
        codigo === 'not-allowed' || codigo === 'service-not-allowed'
          ? 'Precisamos da sua permissão para usar o microfone.'
          : 'Não consegui ouvir. Tente de novo ou digite.'
      );
      setGravando(false);
      limparTimer();
    };

    rec.onend = () => {
      setGravando(false);
      limparTimer();

      const texto = removerGatilhoFinal(finalRef.current);
      setParcial(texto);
      if (texto) cbFinal.current?.(texto);
    };

    recRef.current = rec;

    try {
      rec.start();
    } catch {
      setErro('Não consegui abrir o microfone. Tente de novo.');
      setGravando(false);
    }
  }, [armarSilencio, limparTimer]);

  const alternar = useCallback(() => {
    gravando ? parar() : iniciar();
  }, [gravando, parar, iniciar]);

  // Limpeza no unmount: reconhecedor vivo depois da tela fechar mantém o
  // microfone aberto, e o indicador do sistema fica ligado sem explicação.
  useEffect(() => {
    return () => {
      limparTimer();
      try { recRef.current?.abort(); } catch { /* ignora */ }
    };
  }, [limparTimer]);

  return { suportado, gravando, parcial, erro, iniciar, parar, alternar };
}
