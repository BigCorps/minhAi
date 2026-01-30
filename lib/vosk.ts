import * as Vosk from "vosk-browser";

let model: any = null;

export async function loadVosk(onProgress?: (progress: number) => void) {
  if (model) {
    console.log('✅ Modelo Vosk já carregado (cache)');
    return model;
  }
  
  try {
    // ✅ USANDO ALPHACEPHEI (SERVIDOR OFICIAL DO VOSK)
    // Este é o servidor oficial que hospeda todos os modelos completos
    const modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip";
    
    console.log('📦 Iniciando download do modelo Vosk...');
    console.log('📂 URL:', modelUrl);
    console.log('⏳ Download pode demorar (modelo ~40MB)...');
    
    const startTime = Date.now();
    
    // O Vosk vai baixar e extrair automaticamente o ZIP
    model = await Vosk.createModel(modelUrl);
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Modelo carregado em ${loadTime}s`);
    
    if (onProgress) onProgress(100);
    
    return model;
  } catch (error: any) {
    console.error('❌ Erro ao carregar Vosk:', error);
    console.error('❌ Mensagem:', error.message);
    
    // Tentar fallback para servidor alternativo
    console.log('🔄 Tentando servidor alternativo...');
    try {
      const fallbackUrl = "https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-model-small-pt-0.3.zip";
      console.log('📂 Fallback URL:', fallbackUrl);
      
      model = await Vosk.createModel(fallbackUrl);
      console.log('✅ Modelo carregado via fallback');
      
      if (onProgress) onProgress(100);
      return model;
    } catch (fallbackError: any) {
      console.error('❌ Fallback também falhou:', fallbackError.message);
      throw error;
    }
  }
}

export async function loadVoskWithProgress(onProgress: (progress: number) => void) {
  let estimatedProgress = 0;
  
  const progressInterval = setInterval(() => {
    if (estimatedProgress < 95) {
      const increment = estimatedProgress < 30 ? 3 : estimatedProgress < 70 ? 5 : 2;
      estimatedProgress = Math.min(estimatedProgress + increment, 95);
      onProgress(Math.floor(estimatedProgress));
      console.log(`📊 Progresso: ${Math.floor(estimatedProgress)}%`);
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
    throw error;
  }
}