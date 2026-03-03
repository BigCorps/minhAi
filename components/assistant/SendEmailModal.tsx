# Correções no SendEmailModal.tsx — Item 2.1

## Bloco 1: Detecção do "FIM" (dentro do recognition.onresult)

**ANTES:**
```tsx
const fimPatterns = [
  /\bfim\b/i,
  /fim$/i,
  /^fim\b/i,
  /\bfim\s*$/i,
];

const hasFim = fimPatterns.some(pattern => pattern.test(lowerTranscript));
```

**DEPOIS:**
```tsx
// Lista de palavras/frases que encerram a gravação
const FIM_TRIGGERS = [
  'fim', 'pronto', 'terminar', 'encerrar', 'concluir',
  'acabou', 'pode enviar', 'é isso', 'é isso aí',
];

// Divide em palavras para evitar falso positivo em "enfim", "afim", etc.
const words = lowerTranscript
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
  .split(/\s+/);

// "fim" só é válido se for a última palavra isolada
const lastWord = words[words.length - 1];
const hasFim =
  lastWord === 'fim' ||
  FIM_TRIGGERS.slice(1).some(t => lowerTranscript.endsWith(t)) ||
  FIM_TRIGGERS.slice(1).some(t => lowerTranscript.includes(t));
```

---

## Bloco 2: Limpeza do texto (dentro do recognition.onend)

**ANTES:**
```tsx
let cleanedBody = finalTranscriptRef.current
  .replace(/\s*fim\s*$/gi, '')
  .replace(/^fim\s*/gi, '')
  .replace(/\s+fim\s+/gi, ' ')
  .trim();
```

**DEPOIS:**
```tsx
const FIM_TRIGGERS_CLEAN = [
  'fim', 'pronto', 'terminar', 'encerrar', 'concluir',
  'acabou', 'pode enviar', 'é isso', 'é isso aí',
];

let cleanedBody = finalTranscriptRef.current;

// Remove apenas se o trigger estiver NO FINAL da frase
for (const trigger of FIM_TRIGGERS_CLEAN) {
  // Escapa caracteres especiais para usar no regex
  const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  cleanedBody = cleanedBody.replace(
    new RegExp(`\\s*${escaped}\\s*$`, 'gi'),
    ''
  );
}

cleanedBody = cleanedBody.trim();
```

---

## O que muda na prática

| Fala do usuário | Antes | Depois |
|---|---|---|
| "...meu pedido. FIM" | ✅ encerrava | ✅ encerra |
| "enfim precisamos..." | ✅ encerrava errado | ✅ ignora (não é fim isolado) |
| "fim de semana" | ✅ encerrava errado | ✅ ignora (não é última palavra) |
| "PRONTO" | ❌ não encerrava | ✅ encerra |
| "pode enviar" | ❌ não encerrava | ✅ encerra |
| "É ISSO" | ❌ não encerrava | ✅ encerra |
