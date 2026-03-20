// =========================================================
// Detecção de Ciclos - Client Side (validação preventiva)
// =========================================================
// Nota: O backend também valida, isso é só UX

import { createClient } from '@/lib/supabase-browser';

interface ItemNode {
  id: string;
  componentes: string[]; // IDs dos ingredientes que compõem este item
}

export class CicloDetector {
  private grafo: Map<string, ItemNode> = new Map();
  
  async carregarGrafo(companyId: string): Promise<void> {
    const supabase = createClient();
    
    // Carregar todas as fichas e seus componentes
    const { data: fichas } = await supabase
      .from('producao_fichas')
      .select(`
        id,
        producao_ficha_itens (
          ingrediente_id
        )
      `)
      .eq('company_id', companyId);
    
    // Mapear ingredientes que são gerados por fichas
    const { data: ingredientes } = await supabase
      .from('producao_ingredientes')
      .select('id, ficha_origem_id')
      .eq('company_id', companyId)
      .not('ficha_origem_id', 'is', null);
    
    // Construir grafo
    this.grafo.clear();
    
    fichas?.forEach(ficha => {
      // Encontrar qual ingrediente esta ficha gera
      const ingredienteGerado = ingredientes?.find(
        i => i.ficha_origem_id === ficha.id
      );
      
      if (ingredienteGerado) {
        this.grafo.set(ingredienteGerado.id, {
          id: ingredienteGerado.id,
          componentes: ficha.producao_ficha_itens?.map(
            (item: any) => item.ingrediente_id
          ) || [],
        });
      }
    });
  }
  
  detectarCiclo(itemId: string, novoComponenteId: string): boolean {
    const visitados = new Set<string>();
    
    const dfs = (currentId: string): boolean => {
      // Se chegou no item original, é ciclo!
      if (currentId === itemId) return true;
      
      // Se já visitou, não precisa verificar de novo
      if (visitados.has(currentId)) return false;
      
      visitados.add(currentId);
      
      // Buscar componentes deste item
      const node = this.grafo.get(currentId);
      if (!node) return false;
      
      // Verificar cada componente recursivamente
      for (const compId of node.componentes) {
        if (dfs(compId)) return true;
      }
      
      return false;
    };
    
    return dfs(novoComponenteId);
  }
  
  buscarCadeia(ingredienteId: string): string[] {
    const cadeia: string[] = [ingredienteId];
    const visitados = new Set<string>();
    
    let currentId = ingredienteId;
    while (true) {
      if (visitados.has(currentId)) break;
      visitados.add(currentId);
      
      const node = this.grafo.get(currentId);
      if (!node || node.componentes.length === 0) break;
      
      currentId = node.componentes[0]; // Pegar primeiro componente
      cadeia.push(currentId);
    }
    
    return cadeia;
  }
}

// Instância singleton
let detectorInstance: CicloDetector | null = null;

export async function getDetector(companyId: string): Promise<CicloDetector> {
  if (!detectorInstance) {
    detectorInstance = new CicloDetector();
  }
  await detectorInstance.carregarGrafo(companyId);
  return detectorInstance;
}
