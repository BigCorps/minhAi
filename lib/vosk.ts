import * as Vosk from "vosk-browser";

let model: any = null;

export async function loadVosk(onProgress?: (progress: number) => void) {
  if (model) {
    console.log('✅ Modelo Vosk já carregado (cache)');
    return model;
  }
  
  try {
    console.log('📦 Iniciando download do modelo Vosk...');
    console.log('📂 Caminho: /models/vosk-pt/vosk-model-small-pt-0.3');
    
    const startTime = Date.now();
    
    // Criar modelo
    model = await Vosk.createModel("/models/vosk-pt/vosk-model-small-pt-0.3/");
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Modelo carregado em ${loadTime}s`);
    
    if (onProgress) onProgress(100);
    
    return model;
  } catch (error: any) {
    console.error('❌ Erro detalhado ao carregar Vosk:', error);
    console.error('❌ Tipo do erro:', error.constructor.name);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    throw error;
  }
}

// Função auxiliar para simular progresso durante o download
export async function loadVoskWithProgress(onProgress: (progress: number) => void) {
  let progress = 0;
  let estimatedProgress = 0;
  
  // Simular progresso de forma mais realista
  const progressInterval = setInterval(() => {
    if (estimatedProgress < 95) {
      // Progresso mais lento no início, mais rápido no meio
      const increment = estimatedProgress < 30 ? 3 : estimatedProgress < 70 ? 5 : 2;
      estimatedProgress = Math.min(estimatedProgress + increment, 95);
      onProgress(Math.floor(estimatedProgress));
      console.log(`📊 Progresso estimado: ${Math.floor(estimatedProgress)}%`);
    }
  }, 800);

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
    console.error('❌ Falha no loadVoskWithProgress');
    throw error;
  }
}