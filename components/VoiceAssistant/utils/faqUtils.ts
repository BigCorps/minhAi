// ============================================================
// utils/faqUtils.ts
// Caminho: components/assistant/VoiceAssistant/utils/faqUtils.ts
//
// Lógica de correspondência de FAQs portada do backend
// (app/api/voice/process/route.ts) para rodar localmente
// no frontend, garantindo FAQ First com latência zero.
// ============================================================

import { FAQEntry } from '../hooks/useFAQs';

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

export function findMatchingFAQLocal(faqs: FAQEntry[], question: string): FAQEntry | null {
  if (!faqs || faqs.length === 0) return null;

  const questionNormalized = normalizeText(question);
  const questionWords = questionNormalized.split(' ').filter(w => w.length > 2);

  let bestMatch: FAQEntry | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqQuestionNormalized = normalizeText(faq.question);

    // Match exato na pergunta principal
    if (questionNormalized === faqQuestionNormalized) {
      console.log(`✅ FAQ match exato: "${faq.question}"`);
      return faq;
    }

    // Similaridade Levenshtein na pergunta principal
    const score = similarity(questionNormalized, faqQuestionNormalized);
    if (score > bestScore && score > 0.85) {
      bestScore = score;
      bestMatch = faq;
    }

    // Verificar variações
    if (faq.variations && Array.isArray(faq.variations)) {
      for (const variation of faq.variations) {
        const variationNormalized = normalizeText(variation);

        // Match exato na variação
        if (questionNormalized === variationNormalized) {
          console.log(`✅ FAQ match exato (variação): "${variation}"`);
          return faq;
        }

        // Similaridade Levenshtein na variação
        const varScore = similarity(questionNormalized, variationNormalized);
        if (varScore > bestScore && varScore > 0.85) {
          bestScore = varScore;
          bestMatch = faq;
        }
      }
    }

    // Sobreposição de palavras-chave
    const faqWords = faqQuestionNormalized.split(' ').filter(w => w.length > 2);
    const commonWords = questionWords.filter(w => faqWords.includes(w));
    if (questionWords.length === 0 && faqWords.length === 0) continue;
    const keywordScore = commonWords.length / Math.max(questionWords.length, faqWords.length);

    if (keywordScore > bestScore && keywordScore > 0.70) {
      bestScore = keywordScore;
      bestMatch = faq;
    }
  }

  if (bestMatch) {
    console.log(`✅ FAQ match (${(bestScore * 100).toFixed(0)}%): "${bestMatch.question}"`);
  }

  return bestMatch;
}
