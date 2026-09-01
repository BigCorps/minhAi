/**
 * Vozes da FuncionarIA.
 *
 * Quatro personalidades, todas construídas sobre a família **Neural2**. Isso é
 * deliberado e é o que torna a escolha gratuita: o Google cobra por caractere e
 * o preço varia por família — Standard é a mais barata, WaveNet e Neural2
 * custam algumas vezes mais, Studio e Chirp são as mais caras. Mantendo todas
 * na mesma família, qualquer opção que a empresa escolher custa igual, e a
 * escolha não vira uma decisão de orçamento disfarçada de preferência estética.
 *
 * Em pt-BR o Google oferece duas vozes femininas por família, não quatro. As
 * quatro personalidades saem de combinar essas duas bases com tom e ritmo
 * diferentes — o que muda a percepção bem mais do que a base sozinha, e sem
 * custo nenhum, porque `pitch` e `speakingRate` são parâmetros de síntese, não
 * vozes distintas.
 */

export type FuncionarIAVoice = {
  id: string;
  label: string;
  description: string;
  /** Nome da voz no Google TTS. */
  voice: string;
  /** Semitons. Negativo abaixa, positivo levanta. */
  pitch: number;
  /** 1.0 é o ritmo natural da voz. */
  speed: number;
};

export const FUNCIONARIA_VOICES: FuncionarIAVoice[] = [
  {
    id: 'clara',
    label: 'Clara',
    description: 'Neutra e profissional. Boa para qualquer negócio.',
    voice: 'pt-BR-Neural2-A',
    pitch: 0,
    speed: 1.0,
  },
  {
    id: 'acolhedora',
    label: 'Acolhedora',
    description: 'Mais grave e pausada. Transmite calma.',
    voice: 'pt-BR-Neural2-A',
    pitch: -2,
    speed: 0.94,
  },
  {
    id: 'firme',
    label: 'Firme',
    description: 'Segura e objetiva. Combina com serviços técnicos.',
    voice: 'pt-BR-Neural2-C',
    pitch: -0.5,
    speed: 1.0,
  },
  {
    id: 'animada',
    label: 'Animada',
    description: 'Mais aguda e rápida. Combina com varejo.',
    voice: 'pt-BR-Neural2-C',
    pitch: 1.5,
    speed: 1.08,
  },
];

export const DEFAULT_VOICE_ID = 'clara';

export function getFuncionarIAVoice(id?: string | null): FuncionarIAVoice {
  return FUNCIONARIA_VOICES.find(item => item.id === id)
    || FUNCIONARIA_VOICES.find(item => item.id === DEFAULT_VOICE_ID)
    || FUNCIONARIA_VOICES[0];
}

/**
 * Frase de demonstração do seletor.
 *
 * Curta de propósito: o áudio é cacheado por texto, voz, tom e ritmo, então uma
 * frase fixa é sintetizada uma única vez por personalidade em toda a
 * plataforma. Se a frase incluísse o nome da empresa, cada cliente geraria
 * quatro sínteses novas só para ouvir as opções.
 */
export const VOICE_SAMPLE_TEXT =
  'Olá! Sou a atendente virtual. Como posso ajudar você hoje?';
