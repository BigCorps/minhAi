'use client';

// hooks/useDitado.ts
// Ditado do MelhorIA com privacidade fail-closed:
// só oferece microfone quando o navegador permite EXIGIR processamento local.
// Se não puder garantir isso, o campo continua disponível para digitação.

import { useCallback, useEffect, useRef, useState } from 'react';

const GATILHOS_FIM = ['concluir', 'acabou', 'terminou', 'pronto', 'fim'];
const IDIOMA = 'pt-BR';

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

function construtorLocal(): any | null {
  if (typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition;
  if (!SR?.prototype || !('processLocally' in SR.prototype)) return null;
  return SR;
}

export interface UseDitadoOpts {
  aoFinalizar?: (texto: string) => void;
  aoParcial?: (texto: string) => void;
  silencioMs?: number;
}

export interface UseDitado {
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
  const [gravando, setGravando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbFinal = useRef(aoFinalizar);
  const cbParcial = useRef(aoParcial);
  cbFinal.current = aoFinalizar;
  cbParcial.current = aoParcial;

  useEffect(() => {
    setSuportado(!!construtorLocal());
  }, []);

  const limparTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const parar = useCallback(() => {
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
    void (async () => {
      const SR = construtorLocal();
      if (!SR) {
        setErro('O ditado privado não está disponível neste aparelho. Você pode digitar normalmente.');
        setSuportado(false);
        return;
      }

      setErro(null);

      // Quando o navegador expõe os controles de pacote local, validamos antes
      // de abrir o microfone. Nunca fazemos fallback automático para nuvem.
      if (typeof SR.available === 'function') {
        try {
          const disponibilidade = await SR.available({
            langs: [IDIOMA],
            processLocally: true,
            quality: 'dictation',
          });

          if (disponibilidade === 'unavailable') {
            setErro('O reconhecimento de voz local em português não está disponível neste aparelho.');
            return;
          }

          if (disponibilidade === 'downloadable' || disponibilidade === 'downloading') {
            if (typeof SR.install !== 'function') {
              setErro('O pacote de voz local ainda não está instalado. Você pode digitar normalmente.');
              return;
            }

            const instalou = await SR.install({
              langs: [IDIOMA],
              processLocally: true,
              quality: 'dictation',
            });
            if (!instalou) {
              setErro('Não consegui preparar o ditado local. Você pode digitar normalmente.');
              return;
            }
          }
        } catch (e) {
          console.warn('[MelhorIA ditado] disponibilidade local:', e);
          setErro('Não consegui confirmar o modo privado do microfone. Você pode digitar normalmente.');
          return;
        }
      }

      try { recRef.current?.abort(); } catch { /* ignora */ }

      const rec = new SR();
      rec.lang = IDIOMA;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.processLocally = true;

      finalRef.current = '';
      setParcial('');

      rec.onstart = () => {
        setGravando(true);
        armarSilencio();
      };

      rec.onresult = (evento: any) => {
        armarSilencio();
        let provisorio = '';

        for (let i = evento.resultIndex; i < evento.results.length; i++) {
          const trecho = evento.results[i][0].transcript as string;

          if (evento.results[i].isFinal) {
            const limpo = trecho.trim();
            if (GATILHOS_FIM.includes(normalizar(limpo))) {
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
        if (codigo === 'aborted' || codigo === 'no-speech') return;

        setErro(
          codigo === 'not-allowed' || codigo === 'service-not-allowed'
            ? 'Precisamos da sua permissão para usar o microfone.'
            : codigo === 'language-not-supported'
              ? 'O pacote de voz local em português não está disponível. Você pode digitar normalmente.'
              : 'Não consegui ouvir no modo privado. Tente de novo ou digite.'
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
        setErro('Não consegui abrir o microfone no modo privado. Você pode digitar normalmente.');
        setGravando(false);
      }
    })();
  }, [armarSilencio, limparTimer]);

  const alternar = useCallback(() => {
    gravando ? parar() : iniciar();
  }, [gravando, parar, iniciar]);

  useEffect(() => {
    return () => {
      limparTimer();
      try { recRef.current?.abort(); } catch { /* ignora */ }
    };
  }, [limparTimer]);

  return { suportado, gravando, parcial, erro, iniciar, parar, alternar };
}
