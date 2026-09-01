'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

interface CompanyContactsFormProps {
  companyId: string;
  theme?: 'dark' | 'light';
  initialData?: {
    whatsapp_number?: string;
    instagram_username?: string;
    pix_key?: string;
    pix_key_type?: string;
  };
}

export default function CompanyContactsForm({ companyId, theme = 'light', initialData }: CompanyContactsFormProps) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsapp_number || '');
  const [instagramUsername, setInstagramUsername] = useState(initialData?.instagram_username || '');
  const [pixKey, setPixKey] = useState(initialData?.pix_key || '');
  const [pixKeyType, setPixKeyType] = useState(initialData?.pix_key_type || 'phone');

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatInstagram = (value: string) => {
    return value.replace(/[@\s]/g, '').toLowerCase();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (whatsappNumber && whatsappNumber.replace(/\D/g, '').length < 10) {
        alert('WhatsApp inválido. Use formato: (11) 99999-9999');
        return;
      }

      if (instagramUsername && instagramUsername.length < 3) {
        alert('Instagram inválido. Mínimo 3 caracteres');
        return;
      }

      if (pixKey && pixKey.length < 5) {
        alert('Chave PIX inválida');
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update({
          whatsapp_number: whatsappNumber.replace(/\D/g, '') || null,
          instagram_username: instagramUsername || null,
          pix_key: pixKey || null,
          pix_key_type: pixKey ? pixKeyType : null,
        })
        .eq('id', companyId);

      if (error) throw error;

      alert('✅ Informações de contato atualizadas!');
      window.location.reload();

    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border p-6 space-y-6 ${
      theme === 'dark'
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200'
    }`}>
      
      {/* Header */}
      <div>
        <h3 className={`text-xl font-bold mb-1 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          📱 Contatos e Pagamentos
        </h3>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Configure os contatos da empresa para o assistente mostrar QR Codes
        </p>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        }`} htmlFor="whatsapp">
          WhatsApp da Empresa
        </label>
        <input
          id="whatsapp"
          type="tel"
          placeholder="(11) 99999-9999"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(formatWhatsApp(e.target.value))}
          maxLength={15}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
        <p className={`text-xs ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          💡 Cliente pode pedir: "mostre o WhatsApp" ou "quero falar no WhatsApp"
        </p>
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        }`} htmlFor="instagram">
          Instagram da Empresa
        </label>
        <div className="flex items-center gap-2">
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>@</span>
          <input
            id="instagram"
            placeholder="username"
            value={instagramUsername}
            onChange={(e) => setInstagramUsername(formatInstagram(e.target.value))}
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <p className={`text-xs ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          💡 Cliente pode pedir: "mostre o Instagram" ou "qual o Instagram?"
        </p>
      </div>

      {/* Divisor */}
      <div className={`border-t pt-6 ${
        theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <h4 className={`font-semibold text-sm mb-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        }`}>
          💰 Chave PIX para Recebimentos
        </h4>
        <p className={`text-xs mb-4 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Esta chave será usada quando o assistente gerar PIX para seus clientes
        </p>
      </div>

      {/* Tipo de Chave PIX */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        }`} htmlFor="pix-type">
          Tipo de Chave PIX
        </label>
        <select
          id="pix-type"
          value={pixKeyType}
          onChange={(e) => setPixKeyType(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">E-mail</option>
          <option value="phone">Telefone</option>
          <option value="random">Chave Aleatória</option>
        </select>
      </div>

      {/* Chave PIX */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        }`} htmlFor="pix-key">
          Chave PIX
        </label>
        <input
          id="pix-key"
          placeholder={
            pixKeyType === 'cpf' ? '000.000.000-00' :
            pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
            pixKeyType === 'email' ? 'email@example.com' :
            pixKeyType === 'phone' ? '11999999999' :
            'chave-aleatoria'
          }
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
        <p className={`text-xs ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          💡 Cliente pode pedir: "gerar PIX de R$ 50,00"
        </p>
      </div>

      {/* Botão Salvar */}
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar Configurações'
        )}
      </button>
    </div>
  );
}
