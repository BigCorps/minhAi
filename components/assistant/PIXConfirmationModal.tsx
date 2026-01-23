  // ========================================
  // 🎯 COMANDOS DE VOZ PARA QR CODES E PIX
  // ========================================

  async function detectVoiceCommand(transcript: string): Promise<boolean> {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    console.log('🔍 Detectando comandos de voz:', lowerTranscript);
    
    // 📱 COMANDO: WHATSAPP
    const whatsappTriggers = [
      'mostre o whatsapp',
      'qual o whatsapp',
      'qual é o whatsapp',
      'me passa o whatsapp',
      'whatsapp da empresa',
      'número do whatsapp',
      'quero o whatsapp'
    ];
    
    if (whatsappTriggers.some(trigger => lowerTranscript.includes(trigger))) {
      console.log('📱 Comando WhatsApp detectado!');
      await handleWhatsAppCommand();
      return true;
    }
    
    // 📸 COMANDO: INSTAGRAM
    const instagramTriggers = [
      'mostre o instagram',
      'qual o instagram',
      'qual é o instagram',
      'me passa o instagram',
      'instagram da empresa',
      'arroba do instagram',
      'quero o instagram'
    ];
    
    if (instagramTriggers.some(trigger => lowerTranscript.includes(trigger))) {
      console.log('📸 Comando Instagram detectado!');
      await handleInstagramCommand();
      return true;
    }
    
    // 💰 COMANDO: GERAR PIX COM CENTAVOS
    // ✅ DETECTAR FORMATO: "10 e 50" = R$ 10,50
    const pixWithCentsRegex = /(?:gerar|gera|cria|criar|faça|faz|fazer|fazer\s+um|fazer\s+uma|gerar\s+uma|gerar\s+um|fazer\s+o|fazer\s+a)\s+(?:um\s+|uma\s+)?(?:pix|pics|pic|picks|pixs|pagamento|cobrança|cobranca)(?:\s+de)?(?:\s+r\$)?(?:\s+reais?)?\s+(\d+)\s+e\s+(\d+)/i;
    const pixWithCentsMatch = lowerTranscript.match(pixWithCentsRegex);
    
    if (pixWithCentsMatch) {
      const reais = pixWithCentsMatch[1];
      let centavos = pixWithCentsMatch[2];
      
      // ✅ GARANTIR 2 DÍGITOS: "5" vira "50", "50" fica "50"
      if (centavos.length === 1) {
        centavos = centavos + '0'; // "5" → "50"
      } else if (centavos.length > 2) {
        centavos = centavos.slice(0, 2); // "500" → "50"
      }
      
      const amount = parseFloat(`${reais}.${centavos}`);
      
      if (amount > 0) {
        console.log('💰 Comando PIX com centavos detectado!');
        console.log('   📝 Reais:', reais, '| Centavos:', centavos, '| Total:', amount);
        await handlePixCommand(amount);
        return true;
      }
    }
    
    // 💰 COMANDO: GERAR PIX NORMAL
    // ✅ REGEX MELHORADA: aceita "pix", "pics", "pic", "picks" + verbos de pagamento
    const pixRegex = /(?:gerar|gera|cria|criar|faça|faz|fazer|fazer\s+um|fazer\s+uma|gerar\s+uma|gerar\s+um|fazer\s+o|fazer\s+a)\s+(?:um\s+|uma\s+)?(?:pix|pics|pic|picks|pixs|pagamento|cobrança|cobranca)(?:\s+de)?(?:\s+r\$)?(?:\s+reais?)?(?:\s+)?([\d]+(?:[,.]\d{1,2})?)/i;
    const pixMatch = lowerTranscript.match(pixRegex);
    
    if (pixMatch) {
      const amountStr = pixMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0) {
        console.log('💰 Comando PIX detectado! Valor:', amount);
        await handlePixCommand(amount);
        return true;
      }
    }
    
    // 💰 FALLBACK: Detectar apenas se tem "pix/pics/pagamento/cobrança" + número
    const pixFallbackRegex = /(?:pix|pics|pic|picks|pixs|pagamento|cobrança|cobranca).*?([\d]+(?:[,.]\d{1,2})?)/i;
    const pixFallbackMatch = lowerTranscript.match(pixFallbackRegex);
    
    if (pixFallbackMatch) {
      const amountStr = pixFallbackMatch[1].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0) {
        console.log('💰 Comando PIX detectado (fallback)! Valor:', amount);
        await handlePixCommand(amount);
        return true;
      }
    }
    
    return false;
  }
