// lib/voice-context-detector.ts

/**
 * Detector de comandos por CONTEXTO + SIMILARIDADE
 * Funciona mesmo quando Vosk erra a palavra exata
 */

interface ContextPattern {
  target: 'whatsapp' | 'instagram' | 'pix' | 'link_pagamento' | 'nfc_debito' | 'nfc_credito';
  contextWords: string[];
  fuzzyMatches: string[];
  minConfidence: number;
}

const CONTEXT_PATTERNS: ContextPattern[] = [
  // ========================================
  // WHATSAPP
  // ========================================
  {
    target: 'whatsapp',
    contextWords: [
      'número', 'numero', 'contato', 'telefone', 'celular',
      'ligar', 'chamar', 'conversar', 'mensagem', 'enviar',
      'mostrar', 'mostre', 'mostra', 'ver', 'qual'
    ],
    fuzzyMatches: [
      // Erros comuns do Vosk para "whatsapp"
      'lote', 'lotes', 'watts', 'wats', 'sap', 'sapp',
      'zap', 'zapzap', 'whats', 'what', 'artesanato',
      'artesão', 'desafio', 'massas', 'massa', 'uóts',
      'up', 'app', 'áudio', 'ato'
    ],
    minConfidence: 0.6
  },
  
  // ========================================
  // INSTAGRAM
  // ========================================
  {
    target: 'instagram',
    contextWords: [
      'perfil', 'arroba', 'seguir', 'rede', 'social',
      'página', 'pagina', 'foto', 'post', 'story',
      'mostrar', 'mostre', 'mostra', 'ver', 'qual'
    ],
    fuzzyMatches: [
      'insta', 'instá', 'inta', 'instagram', 'instagran',
      'instagramo', 'grama', 'programa', 'gramado',
      'estrangeiro', 'instante'
    ],
    minConfidence: 0.5
  },

  {
    target: 'link_pagamento' as any,
    contextWords: [
      'link', 'linque', 'gerar link', 'cobrar link',
      'link de pagamento', 'pagamento link',
    ],
    fuzzyMatches: [
      'link', 'linc', 'ling', 'linc', 'linque',
    ],
    minConfidence: 0.6
  },

  // ✅ NOVO: NFC (prioridade ANTES do PIX)
  {
    target: 'nfc' as any,
    contextWords: [
      'nfc', 'aproximação', 'aproximacao', 'aproximar',
      'débito', 'debito', 'crédito', 'credito',
      'cartão', 'cartao', 'tap', 'maquininha',
    ],
    fuzzyMatches: [
      'nfc', 'efe', 'efe ce', 'enfe', 'infc',
    ],
    minConfidence: 0.6
  },

  // PIX — agora só dispara se não tiver contexto de NFC/link
  {
    target: 'pix',
    contextWords: [
      'pix', 'gerar pix', 'cobrar pix',
      'chave pix',
    ],
    fuzzyMatches: [
      'pix', 'pics', 'pic', 'picos', 'kit', 'pis',
      'pitch', 'piche', 'pia', 'picks', 'mix', 'fix',
      'pixel', 'pico', 'pica'
    ],
    minConfidence: 0.7 // ✅ threshold mais alto que NFC/link
  }
];

/**
 * Detecta comando por contexto quando palavra exata falha
 */
export function detectByContext(transcript: string): {
  detected: boolean;
  target?: 'whatsapp' | 'instagram' | 'pix' | 'link_pagamento' | 'nfc_debito' | 'nfc_credito';
  confidence: number;
  reason: string;
} {
  const lowerTranscript = transcript.toLowerCase().trim();
  const words = lowerTranscript.split(/\s+/);
  
  let bestMatch: typeof CONTEXT_PATTERNS[0] | null = null;
  let bestConfidence = 0;
  
  for (const pattern of CONTEXT_PATTERNS) {
    let confidence = 0;
    let contextMatches = 0;
    let fuzzyMatches = 0;
    
    // Contar palavras de contexto
    for (const word of words) {
      if (pattern.contextWords.some(ctx => 
        word.includes(ctx) || 
        ctx.includes(word) ||
        levenshteinDistance(word, ctx) <= 1
      )) {
        contextMatches++;
      }
      
      if (pattern.fuzzyMatches.some(fuzzy => 
        word.includes(fuzzy) || 
        fuzzy.includes(word) ||
        levenshteinDistance(word, fuzzy) <= 2
      )) {
        fuzzyMatches++;
      }
    }
    
    // Calcular confiança
    // Contexto = 60%, Fuzzy = 40%
    const contextScore = Math.min(contextMatches / 2, 1) * 0.6;
    const fuzzyScore = Math.min(fuzzyMatches, 1) * 0.4;
    confidence = contextScore + fuzzyScore;
    
    if (confidence > bestConfidence && confidence >= pattern.minConfidence) {
      bestConfidence = confidence;
      bestMatch = pattern;
    }
  }
  
  if (bestMatch) {
    return {
      detected: true,
      target: bestMatch.target,
      confidence: bestConfidence,
      reason: `Contexto detectado (${(bestConfidence * 100).toFixed(0)}% confiança)`
    };
  }
  
  return {
    detected: false,
    confidence: 0,
    reason: 'Nenhum contexto reconhecido'
  };
}

/**
 * Distância de Levenshtein (similaridade entre palavras)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,      // inserção
          matrix[i - 1][j] + 1       // remoção
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Extrai valor numérico do texto
 */
export function extractAmountFromContext(text: string): number {
  // Procurar por números digitados
  const digitMatch = text.match(/(\d+(?:[,.]?\d{1,2})?)\s*(?:reais?)?/i);
  if (digitMatch) {
    return parseFloat(digitMatch[1].replace(',', '.'));
  }
  
  // Procurar por números por extenso
  const numberWords: {[key: string]: number} = {
    'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2,
    'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
    'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
    'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14,
    'quatorze': 14, 'quinze': 15, 'vinte': 20, 'trinta': 30,
    'quarenta': 40, 'cinquenta': 50, 'sessenta': 60,
    'setenta': 70, 'oitenta': 80, 'noventa': 90,
    'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300,
    'quatrocentos': 400, 'quinhentos': 500, 'mil': 1000
  };
  
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (numberWords[word]) {
      return numberWords[word];
    }
  }
  
  return 0;
}
