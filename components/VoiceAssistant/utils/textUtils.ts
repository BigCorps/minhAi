// ============================================================
// utils/textUtils.ts
// Caminho: components/assistant/VoiceAssistant/utils/textUtils.ts
// ============================================================

/**
 * Converte números por extenso em dígitos numéricos.
 * Ex: "vinte e cinco reais" → "25 reais"
 */
export function convertWordsToNumbers(text: string): string {
  const numberWords: { [key: string]: string } = {
    'zero': '0', 'um': '1', 'dois': '2', 'três': '3', 'tres': '3',
    'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7',
    'oito': '8', 'nove': '9',
    'dez': '10', 'onze': '11', 'doze': '12', 'treze': '13',
    'catorze': '14', 'quatorze': '14', 'quinze': '15',
    'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50',
    'sessenta': '60', 'setenta': '70', 'oitenta': '80', 'noventa': '90',
    'cem': '100', 'cento': '100',
    'duzentos': '200', 'trezentos': '300', 'quatrocentos': '400',
    'quinhentos': '500', 'seiscentos': '600', 'setecentos': '700',
    'oitocentos': '800', 'novecentos': '900',
    'mil': '1000',
  };

  let result = text;

  const composicoes = [
    { pattern: /vinte e um/gi, value: '21' },
    { pattern: /vinte e dois/gi, value: '22' },
    { pattern: /vinte e três/gi, value: '23' },
    { pattern: /vinte e quatro/gi, value: '24' },
    { pattern: /vinte e cinco/gi, value: '25' },
    { pattern: /trinta e cinco/gi, value: '35' },
    { pattern: /quarenta e cinco/gi, value: '45' },
    { pattern: /cinquenta e cinco/gi, value: '55' },
  ];

  for (const comp of composicoes) {
    result = result.replace(comp.pattern, comp.value);
  }

  for (const [word, number] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, number);
  }

  return result;
}

/**
 * Corrige erros comuns de transcrição de voz.
 * Ex: "picos" → "pix", "watts" → "whatsapp"
 */
export function correctTranscriptionErrors(text: string): string {
  let corrected = text;

  const corrections: { [key: string]: string } = {
    'picos': 'pix', 'picks': 'pix', 'piche': 'pix', 'pics': 'pix', 'pixel': 'pix',
    'cobranca': 'cobrança', 'cobranças': 'cobrança',
    'watts': 'whatsapp', "what's": 'whatsapp', 'whats': 'whatsapp',
    'zap': 'whatsapp', 'zapp': 'whatsapp',
    'instagran': 'instagram', 'insta': 'instagram', 'istagran': 'instagram',
    'sentavos': 'centavos', 'real': 'reais',
    'gera': 'gerar', 'cria': 'criar', 'faz': 'fazer', 'cobra': 'cobrar',
  };

  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  }

  return corrected;
}

/**
 * Detecta comandos de parada como "pare", "tchau", "cala boca", etc.
 */
export function detectStopCommand(text: string): boolean {
  const lowerText = text.toLowerCase().trim();

  const stopPhrases = [
    'pare', 'para', 'parar', 'stop', 'cala boca', 'cala a boca',
    'silêncio', 'silencio', 'quieto', 'chega', 'cancela', 'cancelar',
    'para de falar', 'pare de falar', 'cale a boca', 'fica quieto',
    'para aí', 'para ai', 'tchau', 'obrigado tchau', 'tá bom tchau', 'ta bom tchau',
    'não quero', 'nao quero', 'esquece', 'deixa pra lá', 'deixa pra la',
    // Comandos de fechamento de modal
    'fechar', 'fecha', 'fecha isso', 'fechar isso', 'fechar modal',
    'sair', 'voltar', 'vai embora', 'dispensado', 'obrigado',
  ];

  if (stopPhrases.includes(lowerText)) return true;

  return stopPhrases.some(phrase => {
    const words = phrase.split(' ');
    if (words.length === 1) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'i');
      return regex.test(lowerText);
    }
    return lowerText.includes(phrase);
  });
}

/**
 * Remove a wake word detectada do transcript, deixando apenas o comando.
 */
export function extractCommand(
  transcript: string,
  wakeWordResult: { detected: boolean; keyword?: string; confidence: number; matchedText?: string }
): string {
  let text = transcript.toLowerCase().trim();

  if (wakeWordResult.matchedText) {
    text = text.replace(wakeWordResult.matchedText.toLowerCase(), '');
  }

  if (wakeWordResult.keyword) {
    text = text.replace(wakeWordResult.keyword.toLowerCase(), '');
  }

  text = text.replace(/^[,.\s]+/, '');
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

/**
 * Detecta atividade de voz humana baseado em RMS (volume).
 */
export function detectHumanVoice(
  audioData: Float32Array,
  isPlayingAudio: boolean,
  isSpeaking: boolean
): { isHuman: boolean; volume: number } {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);

  const BASE_THRESHOLD = 0.08;
  const threshold = isPlayingAudio || isSpeaking ? BASE_THRESHOLD * 2.0 : BASE_THRESHOLD;
  const isHuman = rms > threshold;

  return { isHuman, volume: rms };
}