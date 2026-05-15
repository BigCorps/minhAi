// hooks/useBuscaCEP.ts
// Hook para buscar endereço via CEP usando ViaCEP API

import { useState, useCallback } from 'react';

interface EnderecoViaCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  erro?: boolean;
}

interface EnderecoFormatado {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  ibge: string;  
  endereco_completo: string;
}

export function useBuscaCEP() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarCEP = useCallback(async (cep: string): Promise<EnderecoFormatado | null> => {
    // Limpar CEP (remover tudo que não é número)
    const cepLimpo = cep.replace(/\D/g, '');

    // Validar formato
    if (cepLimpo.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }

      const data: EnderecoViaCEP = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      // Formatar endereco_completo
      const endereco_completo = [
        data.logradouro,
        data.bairro,
        data.localidade,
        data.uf
      ].filter(Boolean).join(', ');

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
        ibge: (data as any).ibge ?? '', 
        endereco_completo,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar CEP';
      setError(errorMsg);
      console.error('Erro ao buscar CEP:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    buscarCEP,
    isLoading,
    error,
  };
}
