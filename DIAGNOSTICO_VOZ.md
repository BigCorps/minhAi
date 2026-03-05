# Relatório de Diagnóstico: Sistema de Reconhecimento de Voz eAi

Após uma análise detalhada do repositório BigCorps/eAi, identifiquei os seguintes pontos críticos que explicam por que algumas funções por voz não estão sendo reconhecidas corretamente e como podemos melhorá-las.

## 1. Problemas Identificados

### 1.1. Reconhecimento da Palavra "FIM"
No componente `SendEmailModal.tsx`, a detecção da palavra "fim" é feita através de expressões regulares simples:
- O sistema busca por `\bfim\b`, `fim$`, `^fim\b`.
- **Falha:** Transcrições comuns como "enfim", "in", "sim", "fim de papo" ou variações fonéticas não são capturadas de forma robusta.
- **Consequência:** O usuário dita o e-mail e o sistema continua gravando, ou entende "enfim" como parte do texto e não encerra a captura.

### 1.2. Confirmações por Voz (Pagamento, E-mail, Agenda)
- **E-mail e Agenda:** Já possuem listeners para os eventos `confirmSendEmail` e `confirmCreateEvent`. No entanto, os gatilhos no arquivo `voiceCommandDetector.ts` são limitados e baseados em `includes` simples, o que pode falhar se a transcrição tiver pequenos erros.
- **Pagamento (Link e NFC):** O componente `InfinitePayDisplay.tsx` **não possui** um listener para confirmação por voz. Atualmente, ele só aceita o clique manual no botão "Confirmar pagamento recebido".
- **Gatilhos de Confirmação:** Os gatilhos atuais em `voiceCommandDetector.ts` são estáticos e não cobrem variações naturais da fala (ex: "pode cobrar", "já pagou", "confirma o débito").

### 1.3. Fechamento de Modais
- O sistema possui uma função `detectStopCommand` em `textUtils.ts`, mas ela não está integrada de forma a disparar o fechamento do `activeModal` no `VoiceAssistantWithWakeWord.tsx` de maneira global para todos os modais.
- Alguns modais capturam o foco do áudio e impedem que o assistente "ouça" o comando de fechar enquanto estão abertos.

### 1.4. Feedback Visual (O que o assistente entendeu)
- O usuário mencionou que antes aparecia no F12 (console), mas agora não aparece mais.
- Não existe um componente visual que mostre em tempo real o que o Google Speech está transcrevendo (o "interim transcript"), dificultando para o cliente saber se precisa falar mais pausadamente.

---

## 2. Plano de Melhorias

### 2.1. Melhoria no Reconhecimento de "FIM"
- Implementar uma lista de variações fonéticas e semânticas: `["fim", "fim.", "enfim", "terminar", "encerrar", "concluir", "pronto"]`.
- Usar uma função de limpeza mais agressiva para remover essas palavras do corpo do e-mail após a detecção.

### 2.2. Implementação de Confirmação para Pagamentos
- Adicionar um listener de evento `confirmPayment` no `InfinitePayDisplay.tsx`.
- Atualizar o `voiceCommandDetector.ts` para reconhecer comandos de confirmação de pagamento quando o modal da InfinitePay estiver aberto.

### 2.3. Feedback Visual em Tempo Real
- Adicionar um "Card de Transcrição" acima do `TextInputChat.tsx` que mostre o `lastTranscript` e o `interimTranscript`.
- Este card ajudará o usuário a entender por que o assistente não respondeu (ex: entendeu uma palavra errada).

### 2.4. Fechamento Global de Modais
- Garantir que qualquer comando de "parar", "fechar" ou "cancelar" limpe o estado `activeModal` no orquestrador principal.

### 2.5. Melhoria na Precisão (Fuzzy Matching)
- Introduzir uma lógica de correção de erros fonéticos mais abrangente no `textUtils.ts` para termos comuns do sistema.
