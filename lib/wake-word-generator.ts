// lib/wake-word-generator.ts

/**
 * Gerador automático de variações de Wake Words
 * Usado quando cliente cadastra nova wake word
 */

interface WakeWordVariation {
  original: string;
  variations: string[];
  confidence: number;
}

/**
 * Regras fonéticas do português brasileiro
 */
const PHONETIC_SUBSTITUTIONS: Record<string, string[]> = {
  // Vogais
  'a': ['a', 'á', 'à', 'â'],
  'e': ['e', 'é', 'ê'],
  'i': ['i', 'í'],
  'o': ['o', 'ó', 'ô'],
  'u': ['u', 'ú'],
  
  // Consoantes confusas
  'c': ['c', 'k', 'qu'],
  's': ['s', 'ss', 'ç'],
  'z': ['z', 's'],
  'x': ['x', 'ch'],
  'g': ['g', 'j'],
  
  // Sons compostos
  'lh': ['lh', 'li'],
  'nh': ['nh', 'ni'],
};

/**
 * Padrões comuns de erro do Vosk em PT-BR
 */
const COMMON_VOSK_ERRORS: Record<string, string[]> = {
  // Erros em nomes próprios
  'gerente': ['gente', 'g e r e n t e', 'garante', 'gerentes'],
  'atendente': ['a ten dente', 'aten dente', 'atenden te'],
  'assistente': ['assiste', 'asis tente', 'a sis tente'],
  
  // Erros em saudações
  'oi': ['hoi', 'ó i', 'o i'],
  'olá': ['ola', 'o la', 'hola'],
  'eai': ['iai', 'iae', 'i a e', 'e a i'],
  
  // Erros em títulos
  'doutor': ['douto', 'doto', 'do tor'],
  'doutora': ['dotora', 'do tora'],
};

/**
 * Gera variações automáticas de uma wake word
 */
export function generateWakeWordVariations(
  word: string,
  includeAutomatic: boolean = true,
  customVariations: string[] = []
): WakeWordVariation {
  const normalized = word.toLowerCase().trim();
  const variations = new Set<string>([normalized]);
  
  // 1. Adicionar variações customizadas pelo usuário
  customVariations.forEach(v => variations.add(v.toLowerCase().trim()));
  
  if (includeAutomatic) {
    // 2. Erros comuns conhecidos do Vosk
    if (COMMON_VOSK_ERRORS[normalized]) {
      COMMON_VOSK_ERRORS[normalized].forEach(v => variations.add(v));
    }
    
    // 3. Variações com espaçamento
    // "gerente" → "g e r e n t e"
    const spaced = normalized.split('').join(' ');
    variations.add(spaced);
    
    // 4. Variações com artigos
    variations.add(`a ${normalized}`);
    variations.add(`o ${normalized}`);
    variations.add(`e ${normalized}`);
    
    // 5. Variações sem espaços (se tiver)
    if (normalized.includes(' ')) {
      variations.add(normalized.replace(/\s+/g, ''));
    }
    
    // 6. Variações de acentuação
    const withoutAccents = removeAccents(normalized);
    if (withoutAccents !== normalized) {
      variations.add(withoutAccents);
    }
  }
  
  return {
    original: word,
    variations: Array.from(variations),
    confidence: 0.9 // Confiança padrão para variações geradas
  };
}

/**
 * Remove acentos de uma string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sugere variações que o usuário PODE querer adicionar
 * (para interface de cadastro)
 */
export function suggestVariations(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  const suggestions: string[] = [];
  
  // Sugerir erros comuns conhecidos
  if (COMMON_VOSK_ERRORS[normalized]) {
    suggestions.push(...COMMON_VOSK_ERRORS[normalized]);
  }
  
  // Sugerir versão com espaços
  if (!normalized.includes(' ')) {
    suggestions.push(normalized.split('').join(' '));
  }
  
  // Sugerir com artigos
  suggestions.push(`a ${normalized}`);
  suggestions.push(`o ${normalized}`);
  
  // Sugerir sem acentos
  const withoutAccents = removeAccents(normalized);
  if (withoutAccents !== normalized) {
    suggestions.push(withoutAccents);
  }
  
  // Remover duplicatas
  return Array.from(new Set(suggestions));
}

/**
 * Valida se wake word é boa (não muito curta, não muito longa)
 */
export function validateWakeWord(word: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Muito curta (< 2 caracteres)
  if (word.length < 2) {
    warnings.push('Wake word muito curta. Pode ativar acidentalmente.');
  }
  
  // Muito longa (> 30 caracteres)
  if (word.length > 30) {
    warnings.push('Wake word muito longa. Difícil de pronunciar.');
  }
  
  // Só números
  if (/^\d+$/.test(word)) {
    warnings.push('Wake word só com números não é recomendado.');
  }
  
  // Palavras muito comuns (alto risco de falso positivo)
  const veryCommonWords = ['o', 'a', 'e', 'de', 'para', 'com', 'por', 'em'];
  if (veryCommonWords.includes(word.toLowerCase())) {
    warnings.push('Palavra muito comum. Alto risco de ativação acidental.');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Exemplo de uso no cadastro de empresa
 */
export function createWakeWordConfig(
  primaryWord: string,
  customVariations: string[] = []
): {
  keyword: string;
  variations: string[];
  suggestions: string[];
  validation: { valid: boolean; warnings: string[] };
} {
  const validation = validateWakeWord(primaryWord);
  const generated = generateWakeWordVariations(primaryWord, true, customVariations);
  const suggestions = suggestVariations(primaryWord);
  
  return {
    keyword: primaryWord,
    variations: generated.variations,
    suggestions,
    validation
  };
}