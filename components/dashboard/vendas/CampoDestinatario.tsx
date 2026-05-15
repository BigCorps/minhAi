// components/dashboard/vendas/CampoDestinatario.tsx
// Campo de destinatário com autocomplete de clientes e busca de CEP

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, CheckCircle2, User, X } from 'lucide-react';
import { useBuscaCEP } from '@/hooks/useBuscaCEP';
import { useClienteFiscal } from '@/hooks/useClienteFiscal';

interface DadosDestinatario {
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
  cod_municipio?: string;
}

interface CampoDestinatarioProps {
  companyId: string;
  dados: DadosDestinatario;
  onChange: (dados: DadosDestinatario) => void;
  theme?: 'dark' | 'light';
  required?: boolean;
}

export default function CampoDestinatario({
  companyId,
  dados,
  onChange,
  theme = 'dark',
  required = false,
}: CampoDestinatarioProps) {
  const isDark = theme === 'dark';
  const { buscarCEP, isLoading: loadingCEP, error: errorCEP } = useBuscaCEP();
  const {
    buscarPorCpfCnpj,
    buscarPorNome,
    formatarCpfCnpj,
    isLoading: loadingCliente,
  } = useClienteFiscal();

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputNomeRef = useRef<HTMLInputElement>(null);

  const C = {
    bg: isDark ? '#1e293b' : '#ffffff',
    bgSecondary: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    accent: '#3b82f6',
    success: '#22c55e',
  };

  // Fechar autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar sugestões ao digitar nome
  useEffect(() => {
    const buscarSugestoes = async () => {
      if (!dados.nome || dados.nome.length < 2) {
        setSugestoes([]);
        return;
      }

      setBuscandoSugestoes(true);
      const resultados = await buscarPorNome(companyId, dados.nome, 8);
      setSugestoes(resultados);
      setBuscandoSugestoes(false);

      if (resultados.length > 0) {
        setShowAutocomplete(true);
      }
    };

    const timer = setTimeout(buscarSugestoes, 300);
    return () => clearTimeout(timer);
  }, [dados.nome, companyId, buscarPorNome]);

  // Buscar cliente ao sair do campo CPF/CNPJ
  const handleCpfCnpjBlur = useCallback(async () => {
    if (!dados.cpf_cnpj || dados.cpf_cnpj.length < 11) return;

    const cliente = await buscarPorCpfCnpj(companyId, dados.cpf_cnpj);

    if (cliente) {
      // Preencher todos os campos com dados do cliente
      onChange({
        nome: cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj,
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cep: cliente.cep || '',
        logradouro: cliente.logradouro || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        uf: cliente.uf || '',
        endereco_completo: cliente.endereco_completo || '',
        cod_municipio: endereco.ibge || undefined,
      });

      // Mostrar feedback visual
      if (inputNomeRef.current) {
        inputNomeRef.current.classList.add('border-green-500');
        setTimeout(() => {
          inputNomeRef.current?.classList.remove('border-green-500');
        }, 2000);
      }
    }
  }, [dados.cpf_cnpj, companyId, buscarPorCpfCnpj, onChange]);

  // Selecionar sugestão do autocomplete
  const handleSelecionarSugestao = useCallback((cliente: any) => {
    onChange({
      nome: cliente.nome,
      cpf_cnpj: cliente.cpf_cnpj,
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cep: cliente.cep || '',
      logradouro: cliente.logradouro || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || '',
      endereco_completo: cliente.endereco_completo || '',
    });
    setShowAutocomplete(false);
  }, [onChange]);

  // Buscar CEP
  const handleBuscarCEP = useCallback(async () => {
    if (!dados.cep || dados.cep.length < 8) return;

    const endereco = await buscarCEP(dados.cep);

    if (endereco) {
      onChange({
        ...dados,
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
        endereco_completo: endereco.endereco_completo,
        cod_municipio: endereco.ibge || undefined, 
      });
    }
  }, [dados, buscarCEP, onChange]);

  // Limpar formulário
  const handleLimpar = useCallback(() => {
    onChange({
      nome: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      endereco_completo: '',
      cod_municipio: '', 
    });
    setSugestoes([]);
  }, [onChange]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: C.accent }} />
          <h3 className="text-sm font-bold" style={{ color: C.text }}>
            Dados do Destinatário
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>
        {dados.nome && (
          <button
            type="button"
            onClick={handleLimpar}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: C.textMuted }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Nome (com autocomplete) */}
      <div className="relative" ref={autocompleteRef}>
        <label className="block mb-1.5">
          <span className="text-sm font-medium" style={{ color: C.text }}>
            Nome {required && <span className="text-red-500">*</span>}
          </span>
        </label>
        <div className="relative">
          <input
            ref={inputNomeRef}
            type="text"
            value={dados.nome}
            onChange={(e) => onChange({ ...dados, nome: e.target.value })}
            placeholder="Digite o nome do cliente"
            className="w-full px-3 py-2 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
          {buscandoSugestoes && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: C.textMuted }} />
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showAutocomplete && sugestoes.length > 0 && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
            style={{ backgroundColor: C.bg, borderColor: C.border }}
          >
            {sugestoes.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => handleSelecionarSugestao(cliente)}
                className="w-full px-3 py-2 text-left hover:bg-opacity-50 transition-colors border-b last:border-b-0"
                style={{ borderColor: C.border }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                      {cliente.nome}
                    </p>
                    <p className="text-xs" style={{ color: C.textMuted }}>
                      {formatarCpfCnpj(cliente.cpf_cnpj)}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: C.success }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label className="block mb-1.5">
          <span className="text-sm font-medium" style={{ color: C.text }}>
            CPF/CNPJ {required && <span className="text-red-500">*</span>}
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={dados.cpf_cnpj}
            onChange={(e) => {
              const valor = e.target.value.replace(/\D/g, '');
              onChange({ ...dados, cpf_cnpj: valor });
            }}
            onBlur={handleCpfCnpjBlur}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            className="w-full px-3 py-2 pr-10 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
          {loadingCliente && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: C.textMuted }} />
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: C.textMuted }}>
          Digite o CPF/CNPJ para buscar dados salvos
        </p>
      </div>

      {/* Email */}
      <div>
        <label className="block mb-1.5">
          <span className="text-sm font-medium" style={{ color: C.text }}>
            Email (para envio da DANFE)
          </span>
        </label>
        <input
          type="email"
          value={dados.email || ''}
          onChange={(e) => onChange({ ...dados, email: e.target.value })}
          placeholder="exemplo@email.com"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
          style={{
            backgroundColor: C.bg,
            borderColor: C.border,
            color: C.text,
          }}
        />
      </div>

      {/* CEP */}
      <div>
        <label className="block mb-1.5">
          <span className="text-sm font-medium" style={{ color: C.text }}>
            CEP
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={dados.cep || ''}
            onChange={(e) => {
              const valor = e.target.value.replace(/\D/g, '');
              onChange({ ...dados, cep: valor });
            }}
            placeholder="00000-000"
            maxLength={9}
            className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: C.bg,
              borderColor: C.border,
              color: C.text,
            }}
          />
          <button
            type="button"
            onClick={handleBuscarCEP}
            disabled={loadingCEP || !dados.cep || dados.cep.length < 8}
            className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              backgroundColor: C.accent,
              color: '#ffffff',
            }}
          >
            {loadingCEP ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            Buscar
          </button>
        </div>
        {errorCEP && (
          <p className="text-xs mt-1 text-red-500">{errorCEP}</p>
        )}
      </div>

      {/* Endereço (se preenchido via CEP ou manualmente) */}
{(dados.cep || dados.logradouro || dados.cidade) && (
  <div className="grid grid-cols-2 gap-3">
    <div className="col-span-2">
      <label className="block mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>Logradouro</span>
      </label>
      <input
        type="text"
        value={dados.logradouro || ''}
        onChange={(e) => onChange({ ...dados, logradouro: e.target.value })}
        placeholder="Rua, Avenida, etc"
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
        style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
      />
    </div>

    <div>
      <label className="block mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>Número</span>
      </label>
      <input
        type="text"
        value={dados.numero || ''}
        onChange={(e) => onChange({ ...dados, numero: e.target.value })}
        placeholder="123"
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
        style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
      />
    </div>

    <div>
      <label className="block mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>Bairro</span>
      </label>
      <input
        type="text"
        value={dados.bairro || ''}
        onChange={(e) => onChange({ ...dados, bairro: e.target.value })}
        placeholder="Centro"
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
        style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
      />
    </div>

    <div>
      <label className="block mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>Cidade</span>
      </label>
      <input
        type="text"
        value={dados.cidade || ''}
        onChange={(e) => onChange({ ...dados, cidade: e.target.value })}
        placeholder="São Paulo"
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
        style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
      />
    </div>

    <div>
      <label className="block mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>UF</span>
      </label>
      <input
        type="text"
        value={dados.uf || ''}
        onChange={(e) => onChange({ ...dados, uf: e.target.value.toUpperCase() })}
        placeholder="SP"
        maxLength={2}
        className="w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase focus:outline-none focus:ring-2 transition-colors"
        style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
      />
    </div>
  </div>
)}
    </div>
  );
}
