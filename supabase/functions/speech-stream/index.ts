import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log("🚀 Edge Function iniciada - Versão Otimizada");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type, upgrade",
      },
    });
  }

  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    const audioChunks: Uint8Array[] = [];
    let accessToken: string | null = null;
    let isProcessing = false;
    let chunkCount = 0;
    let config: any = null;
    
    // ✅ OTIMIZAÇÃO 1: Chunks maiores para capturar frases completas
    const CHUNKS_PER_PROCESS = 16; // ~1s de áudio (melhor contexto)

    socket.onopen = async () => {
      console.log("✅ WebSocket conectado");
      
      try {
        const apiKey = Deno.env.get("GOOGLE_API_KEY");
        if (!apiKey) {
          console.error("❌ GOOGLE_API_KEY não configurada");
          socket.close(1008, "API Key não encontrada");
          return;
        }
        
        accessToken = apiKey;
        console.log("✅ API Key configurada");
      } catch (error) {
        console.error("❌ Erro ao obter API Key:", error);
        socket.close(1011, "Erro de configuração");
      }
    };

    socket.onmessage = async (event) => {
      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);
          
          if (data.type === "config") {
            config = data.config;
            console.log("⚙️ Config:", config);
            
            socket.send(JSON.stringify({
              type: "ready",
              config: config
            }));
            console.log("✅ Ready enviado");
          }
        } else {
          // ✅ ArrayBuffer - áudio bruto
          const bytes = new Uint8Array(event.data);
          audioChunks.push(bytes);
          chunkCount++;
          
          if (chunkCount % 50 === 0) {
            const totalBytes = audioChunks.reduce((sum, c) => sum + c.length, 0);
            console.log(`📦 ${chunkCount} chunks (${totalBytes} bytes)`);
          }
        }

        if (audioChunks.length >= CHUNKS_PER_PROCESS && !isProcessing && accessToken) {
          isProcessing = true;
          
          const totalBytes = audioChunks.reduce((sum, c) => sum + c.length, 0);
          console.log(`🔄 PROCESSANDO ${audioChunks.length} chunks (${totalBytes} bytes)`);
          
          const result = await processAudio(audioChunks, accessToken);
          
          if (result.success && result.transcript) {
            console.log(`✅ "${result.transcript}"`);
            socket.send(JSON.stringify({
              type: "transcript",
              text: result.transcript,
              isFinal: true
            }));
          } else {
            console.log("⚠️ Sem transcrição");
          }

          audioChunks.length = 0;
          isProcessing = false;
        }
      } catch (error) {
        console.error("❌ Erro:", error);
        isProcessing = false;
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log(`🔌 Desconectado (${chunkCount} chunks)`);
    };

    return response;
  }

  return new Response("WebSocket endpoint", { status: 200 });
});

async function processAudio(
  chunks: Uint8Array[],
  apiKey: string
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  try {
    // Combinar chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log(`🎤 Processando ${combinedAudio.length} bytes`);
    
    // Construir string binária
    let binaryString = "";
    const CHUNK_SIZE = 8192;
    
    for (let i = 0; i < combinedAudio.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, combinedAudio.length);
      const slice = combinedAudio.subarray(i, end);
      
      for (let j = 0; j < slice.length; j++) {
        binaryString += String.fromCharCode(slice[j]);
      }
    }
    
    const base64Audio = btoa(binaryString);
    console.log(`✅ Base64: ${base64Audio.length} chars`);

    // ✅ OTIMIZAÇÃO 2: Configuração avançada com Speech Contexts
    const requestBody = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "pt-BR",
        
        // ✅ OTIMIZAÇÃO 3: Usar modelo otimizado para comandos
        model: "command_and_search", // Melhor para comandos curtos
        
        // ✅ OTIMIZAÇÃO 4: Habilitar recursos avançados
        enableAutomaticPunctuation: true,
        useEnhanced: true, // Modelo neural melhorado
        
        // ✅ OTIMIZAÇÃO 5: Speech Contexts - Prioriza palavras-chave
        speechContexts: [
          {
            phrases: [
              // Comandos PIX (incluindo variações de erro)
              "pix",
              "PIX",
              "picos", // Erro comum do Speech-to-Text
              "picks",
              "gerar pix",
              "criar pix",
              "fazer pix",
              "gerar PIX",
              "criar PIX",
              "fazer PIX",
              "cobrança",
              "cobranca",
              
              // Valores monetários
              "reais",
              "real",
              "centavos",
              "R$",
              
              // Números por extenso
              "um", "dois", "três", "quatro", "cinco",
              "seis", "sete", "oito", "nove", "dez",
              "onze", "doze", "treze", "quatorze", "quinze",
              "vinte", "trinta", "quarenta", "cinquenta",
              "cem", "cento", "duzentos", "trezentos",
              "mil",
              
              // Comandos de confirmação
              "confirmar",
              "confirmado",
              "paguei",
              "já paguei",
              "cancelar",
              "cancela",
              
              // Outros comandos
              "WhatsApp",
              "Instagram",
              "insta",
              "zap",
            ],
            boost: 15.0, // Aumenta prioridade dessas palavras (máximo: 20)
          },
          {
            // ✅ CONTEXTO ESPECÍFICO PARA PIX com boost máximo
            phrases: [
              "PIX",
              "pix",
            ],
            boost: 20.0, // Boost máximo para a palavra PIX
          },
          {
            // Padrões numéricos
            phrases: [
              "$OOV_CLASS_DIGIT_SEQUENCE", // Sequências de dígitos
              "$FULLPHONENUM", // Números de telefone
            ],
            boost: 10.0,
          },
        ],
        
        // ✅ OTIMIZAÇÃO 6: Metadados para melhor contexto
        metadata: {
          interactionType: "VOICE_COMMAND",
          microphoneDistance: "NEARFIELD",
          originalMediaType: "AUDIO",
          recordingDeviceType: "SMARTPHONE",
        },
      },
      audio: {
        content: base64Audio,
      },
    };

    console.log("📡 Chamando Google Speech API...");

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ API error:", JSON.stringify(result, null, 2));
      return {
        success: false,
        error: result.error?.message,
      };
    }

    if (result.results && result.results.length > 0) {
      const transcript = result.results[0].alternatives[0].transcript;
      const confidence = result.results[0].alternatives[0].confidence || 0;
      
      console.log(`🎯 Confiança: ${(confidence * 100).toFixed(1)}%`);
      
      return { success: true, transcript };
    }

    return { success: false };
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    console.error("Stack:", error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}
