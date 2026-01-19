'use client';

/**
 * Sistema de Wake Word Detection com Fuzzy Matching e Normalização Fonética
 * 
 * Funciona com Web Speech API ou Deepgram transcriptions
 * Resolve o problema de variações de pronúncia como:
 * - "iTend" → "aitend", "itende", "itand", "i tend"
 * - "ola" → "olá", "óla", "ola"
 * - "oi" → "ói", "oí"
 */

// ==================== NORMALIZAÇÃO FONÉTICA ====================

// Mapa de sons similares em português
const PHONETIC_RULES: Record<string, string[]> = {
  // Vogais
  'a': ['a', 'á', 'à', 'â', 'ã'],
  'e': ['e', 'é', 'è', 'ê'],
  'i': ['i', 'í', 'y'],
  'o': ['o', 'ó', 'ò', 'ô', 'õ'],
  'u': ['u', 'ú', 'ù'],
  
  // Consoantes confusas
  's': ['s', 'ss', 'ç', 'c'],
  'z': ['z', 's'],
  'x': ['x', 'ch'],
  'j': ['j', 'g'],
  'c': ['c', 'k', 'q'],
  
  // Sons compostos
  'lh': ['lh', 'li'],
  'nh': ['nh', 'ni'],
};

// Variações fonéticas específicas para palavras compostas
const WORD_VARIATIONS: Record<string, string[]> = {
  'itend': [
    'itend',
    'aitend',
    'i tend',
    'ai tend',
    'itende',
    'aitende',
    'itand',
    'aitand',
    'itent',
    'aitent',
  ],
  'ola': ['ola', 'olá', 'óla', 'hola'],
  'oi': ['oi', 'ói', 'oí', 'hoi'],
  'tchau': ['tchau', 'xau', 'chau', 'tchal'],
};

/**
 * Normaliza texto removendo acentos, pontuação e caracteres especiais
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover marcas diacríticas
    .replace(/[^\w\s]/g, '') // Remover pontuação
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
}

/**
 * Gera todas as variações fonéticas possíveis de uma palavra
 */
function generatePhoneticVariations(word: string): string[] {
  const normalized = normalizeText(word);
  const variations = new Set<string>([normalized]);
  
  // Adicionar variações predefinidas
  if (WORD_VARIATIONS[normalized]) {
    WORD_VARIATIONS[normalized].forEach(v => variations.add(normalizeText(v)));
  }
  
  // Variações de espaçamento
  variations.add(normalized.replace(/\s+/g, '')); // Sem espaços
  variations.add(normalized.replace(/(\w)/g, '$1 ').trim()); // Com espaços entre letras
  
  // Variações com/sem artigos
  variations.add(`a ${normalized}`);
  variations.add(`o ${normalized}`);
  variations.add(`e ${normalized}`);
  
  return Array.from(variations);
}

/**
 * Calcula similaridade entre duas strings (Levenshtein Distance normalizado)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1.0;
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLength);
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substituição
          matrix[i][j - 1] + 1,     // Inserção
          matrix[i - 1][j] + 1      // Deleção
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

// ==================== DETECÇÃO DE WAKE WORD ====================

export interface WakeWordConfig {
  keywords: string[];           // Palavras de ativação
  threshold?: number;           // Threshold de similaridade (0-1, padrão: 0.7)
  contextWindow?: number;       // Quantas palavras analisar (padrão: 5)
  caseSensitive?: boolean;      // Case sensitive (padrão: false)
  usePhoneticMatching?: boolean; // Usar matching fonético (padrão: true)
  excludeWords?: string[];      // Palavras a excluir (ex: comandos de fim)
}

export class WakeWordDetector {
  private keywords: string[];
  private threshold: number;
  private contextWindow: number;
  private caseSensitive: boolean;
  private usePhoneticMatching: boolean;
  private excludeWords: string[];
  private wordBuffer: string[] = [];
  private keywordVariations: Map<string, string[]> = new Map();
  
  constructor(config: WakeWordConfig) {
    this.keywords = config.keywords;
    this.threshold = config.threshold ?? 0.7;
    this.contextWindow = config.contextWindow ?? 5;
    this.caseSensitive = config.caseSensitive ?? false;
    this.usePhoneticMatching = config.usePhoneticMatching ?? true;
    this.excludeWords = config.excludeWords ?? [];
    
    // Pré-computar variações fonéticas
    if (this.usePhoneticMatching) {
      this.keywords.forEach(keyword => {
        const variations = generatePhoneticVariations(keyword);
        this.keywordVariations.set(keyword, variations);
        console.log(`📝 Variações de "${keyword}":`, variations);
      });
    }
  }
  
  /**
   * Analisa um texto transcrito e verifica se contém wake word
   * @returns { detected: boolean, keyword?: string, confidence: number, matchedText?: string }
   */
  detect(transcript: string): {
    detected: boolean;
    keyword?: string;
    confidence: number;
    matchedText?: string;
  } {
    const normalized = normalizeText(transcript);
    
    // 🎯 NOVO: Verificar se contém palavras excluídas
    if (this.excludeWords.length > 0) {
      const hasExcludedWord = this.excludeWords.some(word => {
        const normalizedExclude = normalizeText(word);
        return normalized.includes(normalizedExclude);
      });
      
      if (hasExcludedWord) {
        console.log('⛔ Texto contém palavra excluída, ignorando wake word');
        return { detected: false, confidence: 0 };
      }
    }
    
    const words = normalized.split(/\s+/);
    
    // Adicionar palavras ao buffer
    this.wordBuffer.push(...words);
    if (this.wordBuffer.length > this.contextWindow * 2) {
      this.wordBuffer = this.wordBuffer.slice(-this.contextWindow * 2);
    }
    
    // Criar janelas de contexto (1 a contextWindow palavras)
    const windows: string[] = [];
    for (let size = 1; size <= this.contextWindow; size++) {
      for (let i = 0; i <= this.wordBuffer.length - size; i++) {
        windows.push(this.wordBuffer.slice(i, i + size).join(' '));
      }
    }
    
    // Verificar cada keyword
    for (const keyword of this.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // 1. Match exato
      if (normalized.includes(normalizedKeyword)) {
        console.log('✅ Wake word detectada (match exato):', keyword);
        return {
          detected: true,
          keyword,
          confidence: 1.0,
          matchedText: normalizedKeyword
        };
      }
      
      // 2. Match de variações fonéticas
      if (this.usePhoneticMatching) {
        const variations = this.keywordVariations.get(keyword) || [];
        for (const variation of variations) {
          if (normalized.includes(variation)) {
            console.log('✅ Wake word detectada (variação fonética):', keyword, '→', variation);
            return {
              detected: true,
              keyword,
              confidence: 0.95,
              matchedText: variation
            };
          }
        }
      }
      
      // 3. Match fuzzy (similaridade)
      for (const window of windows) {
        const similarity = calculateSimilarity(window, normalizedKeyword);
        
        if (similarity >= this.threshold) {
          console.log(`✅ Wake word detectada (${Math.round(similarity * 100)}% similar):`, keyword, '→', window);
          return {
            detected: true,
            keyword,
            confidence: similarity,
            matchedText: window
          };
        }
      }
    }
    
    return { detected: false, confidence: 0 };
  }
  
  /**
   * Limpa o buffer de palavras
   */
  reset(): void {
    this.wordBuffer = [];
  }
  
  /**
   * Adiciona novas keywords dinamicamente
   */
  addKeywords(keywords: string[]): void {
    keywords.forEach(keyword => {
      if (!this.keywords.includes(keyword)) {
        this.keywords.push(keyword);
        
        if (this.usePhoneticMatching) {
          const variations = generatePhoneticVariations(keyword);
          this.keywordVariations.set(keyword, variations);
          console.log(`📝 Variações de "${keyword}":`, variations);
        }
      }
    });
  }
  
  /**
   * Remove keywords
   */
  removeKeywords(keywords: string[]): void {
    this.keywords = this.keywords.filter(k => !keywords.includes(k));
    keywords.forEach(k => this.keywordVariations.delete(k));
  }
}

// ==================== EXEMPLO DE USO ====================

/*
// 1. Criar detector
const detector = new WakeWordDetector({
  keywords: ['itend', 'ola', 'oi', 'ei sistema'],
  threshold: 0.7,
  contextWindow: 5,
  usePhoneticMatching: true
});

// 2. Analisar transcrições do Deepgram ou Web Speech API
const result = detector.detect("ei aitend tudo bem");

if (result.detected) {
  console.log('Wake word ativada!', result);
  // { detected: true, keyword: 'itend', confidence: 0.95, matchedText: 'aitend' }
}

// 3. Adicionar keywords dinamicamente por empresa
detector.addKeywords(['gerente', 'sistema']);
*/
