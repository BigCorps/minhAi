// hooks/useClienteFiscal.ts
// Hook para gerenciar clientes que recebem notas fiscais

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface ClienteFiscal {
  id: string;
  company_id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  endereco_completo?: string;
  created_at?: string;
  updated_at?: string;
  ultimo_uso_at?: string;
}

interface SalvarClienteParams {
  company_id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  endereco_completo?: string;
}

export function useClienteFiscal() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar cliente por CPF/CNPJ
   */
  const buscarPorCpfCnpj = useCallback(async (
    companyId: string,
    cpfCnpj: string
  ): Promise<ClienteFiscal | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');

      if (!cpfCnpjLimpo || cpfCnpjLimpo.length < 11) {
        return null;
      }

      const { data, error: queryError } = await supabase
        .from('clientes_fiscal')
        .select('*')
        .eq('company_id', companyId)
        .eq('cpf_cnpj', cpfCnpjLimpo)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // Não encontrado - não é erro
          return null;
        }
        throw queryError;
      }

      // Atualizar ultimo_uso_at
      if (data) {
        await supabase
          .from('clientes_fiscal')
          .update({ ultimo_uso_at: new Date().toISOString() })
          .eq('id', data.id);
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar cliente';
      setError(errorMsg);
      console.error('Erro ao buscar cliente:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Buscar clientes por nome (autocomplete)
   */
  const buscarPorNome = useCallback(async (
    companyId: string,
    nome: string,
    limit: number = 10
  ): Promise<ClienteFiscal[]> => {
    if (!nome || nome.length < 2) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('clientes_fiscal')
        .select('*')
        .eq('company_id', companyId)
        .ilike('nome', `%${nome}%`)
        .order('ultimo_uso_at', { ascending: false })
        .limit(limit);

      if (queryError) {
        throw queryError;
      }

      return data || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar clientes';
      setError(errorMsg);
      console.error('Erro ao buscar clientes:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Listar clientes recentes (últimos 20)
   */
  const listarRecentes = useCallback(async (
    companyId: string,
    limit: number = 20
  ): Promise<ClienteFiscal[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('clientes_fiscal')
        .select('*')
        .eq('company_id', companyId)
        .order('ultimo_uso_at', { ascending: false })
        .limit(limit);

      if (queryError) {
        throw queryError;
      }

      return data || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao listar clientes';
      setError(errorMsg);
      console.error('Erro ao listar clientes:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Salvar ou atualizar cliente
   */
  const salvarCliente = useCallback(async (
    params: SalvarClienteParams
  ): Promise<ClienteFiscal | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const cpfCnpjLimpo = params.cpf_cnpj.replace(/\D/g, '');

      if (!cpfCnpjLimpo || cpfCnpjLimpo.length < 11) {
        setError('CPF/CNPJ inválido');
        return null;
      }

      if (!params.nome || params.nome.trim().length < 3) {
        setError('Nome inválido');
        return null;
      }

      // Montar endereço completo se tiver dados
      let endereco_completo = params.endereco_completo;
      if (!endereco_completo && params.logradouro) {
        const partes = [
          params.logradouro,
          params.numero,
          params.bairro,
          params.cidade,
          params.uf,
        ].filter(Boolean);
        endereco_completo = partes.join(', ');
      }

      const clienteData = {
        company_id: params.company_id,
        nome: params.nome.trim(),
        cpf_cnpj: cpfCnpjLimpo,
        email: params.email?.trim() || null,
        telefone: params.telefone?.replace(/\D/g, '') || null,
        cep: params.cep?.replace(/\D/g, '') || null,
        logradouro: params.logradouro?.trim() || null,
        numero: params.numero?.trim() || null,
        complemento: params.complemento?.trim() || null,
        bairro: params.bairro?.trim() || null,
        cidade: params.cidade?.trim() || null,
        uf: params.uf?.toUpperCase() || null,
        endereco_completo: endereco_completo || null,
        updated_at: new Date().toISOString(),
        ultimo_uso_at: new Date().toISOString(),
      };

      // Upsert: insere ou atualiza se já existe
      const { data, error: upsertError } = await supabase
        .from('clientes_fiscal')
        .upsert(clienteData, {
          onConflict: 'company_id,cpf_cnpj',
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar cliente';
      setError(errorMsg);
      console.error('Erro ao salvar cliente:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Deletar cliente
   */
  const deletarCliente = useCallback(async (
    clienteId: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('clientes_fiscal')
        .delete()
        .eq('id', clienteId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao deletar cliente';
      setError(errorMsg);
      console.error('Erro ao deletar cliente:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Formatar CPF/CNPJ para exibição
   */
  const formatarCpfCnpj = useCallback((cpfCnpj: string): string => {
    const limpo = cpfCnpj.replace(/\D/g, '');

    if (limpo.length === 11) {
      // CPF: 000.000.000-00
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    if (limpo.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return cpfCnpj;
  }, []);

  return {
    buscarPorCpfCnpj,
    buscarPorNome,
    listarRecentes,
    salvarCliente,
    deletarCliente,
    formatarCpfCnpj,
    isLoading,
    error,
  };
}
