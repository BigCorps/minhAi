import * as Vosk from "vosk-browser";

let model: any = null;

export async function loadVosk(onProgress?: (progress: number) => void) {
  if (model) {
    console.log('✅ Modelo Vosk já carregado (cache)');
    return model;
  }
  
  try {
    // ✅ USANDO PROXY NEXT.JS PARA CONTORNAR CORS
    // O Next.js baixa o modelo do servidor oficial e serve para o cliente
    const modelUrl = "/api/vosk-proxy";
    
    console.log('📦 Iniciando download do modelo Vosk via proxy...');
    console.log('📂 URL:', modelUrl);
    console.log('⏳ Primeira vez pode demorar ~30-60s (download de 40MB)...');
    
    const startTime = Date.now();
    
    // O Vosk vai baixar e extrair automaticamente
    model = await Vosk.createModel(modelUrl);
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Modelo carregado em ${loadTime}s`);
    
    if (onProgress) onProgress(100);
    
    return model;
  } catch (error: any) {
    console.error('❌ Erro ao carregar Vosk:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    
    throw error;
  }
}

export async function loadVoskWithProgress(onProgress: (progress: number) => void) {
  let estimatedProgress = 0;
  
  const progressInterval = setInterval(() => {
    if (estimatedProgress < 95) {
      // Progresso mais lento no início (download)
      const increment = estimatedProgress < 30 ? 2 : estimatedProgress < 70 ? 4 : 1;
      estimatedProgress = Math.min(estimatedProgress + increment, 95);
      onProgress(Math.floor(estimatedProgress));
      console.log(`📊 Progresso: ${Math.floor(estimatedProgress)}%`);
    }
  }, 1000);

  try {
    const result = await loadVosk((p) => {
      if (p === 100) {
        clearInterval(progressInterval);
        onProgress(100);
      }
    });
    clearInterval(progressInterval);
    onProgress(100);
    return result;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}