// lib/vosk-corrections.ts

/**
 * Dicionário EXPANDIDO de correções para Vosk
 * Captura erros comuns de reconhecimento em português
 */

export const VOSK_CORRECTIONS: { [key: string]: string } = {
  // ========================================
  // PIX - Todas as variações possíveis
  // ========================================
  'pix': 'pix',
  'pics': 'pix',
  'pic': 'pix',
  'picos': 'pix',
  'kit': 'pix',
  'pis': 'pix',
  'pitch': 'pix',
  'piche': 'pix',
  'pica': 'pix',
  'pia': 'pix',
  'picks': 'pix',
  'mix': 'pix',
  'fix': 'pix',
  
  // ========================================
  // WHATSAPP - Muitas variações
  // ========================================
  'whatsapp': 'whatsapp',
  'whats app': 'whatsapp',
  'whats': 'whatsapp',
  'what\'s app': 'whatsapp',
  'whats up': 'whatsapp',
  'wassap': 'whatsapp',
  'watzap': 'whatsapp',
  'watts': 'whatsapp',
  'watts app': 'whatsapp',
  'zap': 'whatsapp',
  'zap zap': 'whatsapp',
  'zapzap': 'whatsapp',
  'zapp': 'whatsapp',
  'sap': 'whatsapp',
  'sapp': 'whatsapp',
  'uóts': 'whatsapp',
  'uóts app': 'whatsapp',
  
  // Especial: "lote" (comum no Vosk BR confundir com WhatsApp)
  'lote': 'whatsapp',
  'lotes': 'whatsapp',
  'do lote': 'whatsapp',
  'o lote': 'whatsapp',
  
  // ========================================
  // INSTAGRAM - Variações
  // ========================================
  'instagram': 'instagram',
  'insta': 'instagram',
  'insta gram': 'instagram',
  'instagramo': 'instagram',
  'instagran': 'instagram',
  'instagrama': 'instagram',
  'inta': 'instagram',
  'instá': 'instagram',
  
  // ========================================
  // COBRANÇA/PIX (contexto)
  // ========================================
  'cobrança': 'cobrança',
  'cobranca': 'cobrança',
  'cobransa': 'cobrança',
  'cobrânça': 'cobrança',
  
  // ========================================
  // NÚMEROS POR EXTENSO (expansão)
  // ========================================
  'zero': '0',
  'um': '1',
  'uma': '1',
  'dois': '2',
  'duas': '2',
  'três': '3',
  'tres': '3',
  'quatro': '4',
  'cinco': '5',
  'seis': '6',
  'sete': '7',
  'oito': '8',
  'nove': '9',
  'dez': '10',
  'onze': '11',
  'doze': '12',
  'treze': '13',
  'catorze': '14',
  'quatorze': '14',
  'quinze': '15',
  'dezesseis': '16',
  'dezessete': '17',
  'dezoito': '18',
  'dezenove': '19',
  'vinte': '20',
  'trinta': '30',
  'quarenta': '40',
  'cinquenta': '50',
  'sessenta': '60',
  'setenta': '70',
  'oitenta': '80',
  'noventa': '90',
  'cem': '100',
  'cento': '100',
  'duzentos': '200',
  'trezentos': '300',
  'quatrocentos': '400',
  'quinhentos': '500',
  'seiscentos': '600',
  'setecentos': '700',
  'oitocentos': '800',
  'novecentos': '900',
  'mil': '1000',
  
  // Compostos comuns
  'vinte e um': '21',
  'vinte e dois': '22',
  'trinta e cinco': '35',
  'cinquenta reais': '50 reais',
  'cem reais': '100 reais',
  
  // ========================================
  // STOP COMMANDS
  // ========================================
  'calça boca': 'cala boca',
  'para de': 'pare de',
  'para aí': 'pare aí',
  'pára': 'pare',
  
  // ========================================
  // CONFIRMAÇÃO
  // ========================================
  'tá bom': 'ok',
  'ta bom': 'ok',
  'tá': 'ok',
  'ta': 'ok',
  'beleza': 'ok',
  'blz': 'ok',
  'tranquilo': 'ok',
  'confirmo': 'confirmar',
  'confirmado': 'confirmar',
};

/**
 * Normaliza transcrição do Vosk aplicando correções
 * VERSÃO MELHORADA com regex mais robusta
 */
export function normalizeVoskTranscript(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // Aplicar correções do dicionário
  for (const [wrong, correct] of Object.entries(VOSK_CORRECTIONS)) {
    // Usar regex com word boundaries E lookahead/lookbehind flexível
    // Captura: "do lote" → "do whatsapp"
    const regex = new RegExp(`\\b${escapeRegex(wrong)}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  }
  
  return normalized;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ALTERNATIVA: Fuzzy matching agressivo
 * Para casos onde Vosk erra muito
 */
export function fuzzyNormalize(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // WhatsApp: qualquer coisa com "at" ou "zap"
  if (/\b(w[aeiou]*ts?|zap|lote|sap)\b/i.test(normalized)) {
    // Se tem "número" ou "contato" perto, é WhatsApp
    if (/número|numero|contato|telefone/i.test(normalized)) {
      normalized = normalized.replace(/\b(w[aeiou]*ts?|zap|lote|sap)\b/gi, 'whatsapp');
    }
  }
  
  // Instagram: qualquer coisa com "insta"
  if (/\bint?[aeiou]*s?t[aeiou]*\b/i.test(normalized)) {
    if (/perfil|arroba|rede|social/i.test(normalized)) {
      normalized = normalized.replace(/\bint?[aeiou]*s?t[aeiou]*\b/gi, 'instagram');
    }
  }
  
  // PIX: qualquer coisa com "p" + vogal + "x" ou "cs"
  if (/\bp[aeiou]*[xcs]+\b/i.test(normalized)) {
    if (/gerar|criar|fazer|cobrança|cobrar|pagar/i.test(normalized)) {
      normalized = normalized.replace(/\bp[aeiou]*[xcs]+\b/gi, 'pix');
    }
  }
  
  return normalized;
}