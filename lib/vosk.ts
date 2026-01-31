// lib/vosk.ts
import * as Vosk from "vosk-browser";

let model: any = null;
let isDownloading = false;

export async function loadVosk(onProgress?: (progress: number) => void) {
  if (model) {
    console.log('✅ Modelo Vosk já carregado (cache)');
    if (onProgress) onProgress(100);
    return model;
  }
  
  try {
    const modelUrl = "/api/vosk-proxy";
    
    console.log('🔍 Verificando cache do Vosk...');
    
    // Verificar se já está no cache do navegador
    const cacheCheck = await checkVoskCache(modelUrl);
    
    if (cacheCheck.inCache) {
      console.log('✅ Modelo encontrado no cache! Carregando instantaneamente...');
      isDownloading = false;
      
      // Carrega do cache (rápido)
      model = await Vosk.createModel(modelUrl);
      
      if (onProgress) onProgress(100);
      console.log('✅ Modelo carregado do cache');
      return model;
    }
    
    // Não está no cache, vai baixar
    console.log('📦 Cache não encontrado. Iniciando download...');
    console.log('⏳ Primeira vez pode demorar ~30-60s (download de 40MB)...');
    isDownloading = true;
    
    const startTime = Date.now();
    
    // Progresso estimado durante download
    let estimatedProgress = 0;
    const progressInterval = setInterval(() => {
      if (isDownloading && estimatedProgress < 95) {
        const increment = estimatedProgress < 30 ? 2 : estimatedProgress < 70 ? 4 : 1;
        estimatedProgress = Math.min(estimatedProgress + increment, 95);
        if (onProgress) onProgress(Math.floor(estimatedProgress));
      }
    }, 1000);
    
    // Download
    model = await Vosk.createModel(modelUrl);
    
    clearInterval(progressInterval);
    isDownloading = false;
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Modelo baixado e carregado em ${loadTime}s`);
    
    if (onProgress) onProgress(100);
    
    return model;
    
  } catch (error: any) {
    isDownloading = false;
    console.error('❌ Erro ao carregar Vosk:', error);
    console.error('❌ Mensagem:', error.message);
    throw error;
  }
}

/**
 * Verifica se o modelo Vosk está no cache do navegador
 */
async function checkVoskCache(url: string): Promise<{ inCache: boolean }> {
  try {
    // Tentar abrir o cache do navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(url);
        
        if (cachedResponse) {
          console.log('✅ Cache encontrado:', cacheName);
          return { inCache: true };
        }
      }
    }
    
    return { inCache: false };
    
  } catch (error) {
    console.log('⚠️ Erro ao verificar cache, assumindo não cached');
    return { inCache: false };
  }
}

/**
 * Wrapper com callback de progresso
 */
export async function loadVoskWithProgress(
  onProgress: (progress: number, downloading: boolean) => void
): Promise<any> {
  
  // Callback wrapper que indica se está baixando
  const progressCallback = (progress: number) => {
    onProgress(progress, isDownloading);
  };
  
  return loadVosk(progressCallback);
}

/**
 * Limpar cache do Vosk (para debug/teste)
 */
export async function clearVoskCache() {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🗑️ Cache limpo:', cacheName);
      }
      
      console.log('✅ Todo cache limpo');
      model = null;
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
  }
}