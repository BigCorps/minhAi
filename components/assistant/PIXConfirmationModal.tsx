'use client';

import { useState } from 'react';
import { Check, X, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface PIXConfirmationModalProps {
  transactionId: string;
  amount: string;
  qrCodeUrl: string;
  pixCode: string;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}

export default function PIXConfirmationModal({
  transactionId,
  amount,
  qrCodeUrl,
  pixCode,
  onConfirm,
  onCancel,
}: PIXConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      console.log('✅ Confirmando PIX:', transactionId);
      
      // ✅ Chamar Edge Function com o nome correto do parâmetro
      const { data, error } = await supabase.functions.invoke('confirmar-pix-assistente', {
        body: { transaction_id: transactionId } // ← Nome correto!
      });
      
      if (error) {
        console.error('❌ Erro ao confirmar:', error);
        throw error;
      }
      
      // Verificar se retornou erro de status 400 (não pago)
      if (!data.success) {
        console.log('⏳ PIX ainda não foi pago:', data.status);
        alert(`⏳ ${data.message || 'PIX ainda não foi confirmado pelo banco. Aguarde alguns segundos e tente novamente.'}`);
        return; // Não fecha o modal
      }
      
      console.log('✅ PIX confirmado:', data);
      alert(`✅ Pagamento confirmado! Saldo atualizado: R$ ${data.new_balance}`);
      
      // Chamar callback do pai (fecha modal)
      await onConfirm();
    } catch (error: any) {
      console.error('Erro ao confirmar:', error);
      
      // Extrair mensagem amigável do erro
      const errorMessage = error.context?.body?.message || 
                          error.message || 
                          'Erro ao confirmar pagamento';
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      console.log('❌ Cancelando PIX:', transactionId);
      
      // ✅ Chamar Edge Function com o nome correto do parâmetro
      const { data, error } = await supabase.functions.invoke('cancelar-pix-assistente', {
        body: { transaction_id: transactionId } // ← Nome correto!
      });
      
      if (error) {
        console.error('❌ Erro ao cancelar:', error);
        throw error;
      }
      
      console.log('✅ PIX cancelado:', data);
      
      // Chamar callback do pai (fecha modal)
      await onCancel();
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      alert('❌ Erro ao cancelar PIX: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Container Quadrado */}
        <div className="relative w-full aspect-square bg-white dark:bg-slate-900">
          
          {/* QR Code */}
          <div className="absolute inset-0 pt-4 pb-36 px-6">
            <div className="w-full h-full bg-white rounded-xl p-3 shadow-sm">
              <img
                src={qrCodeUrl}
                alt="QR Code PIX"
                className="w-full h-full object-contain"
              />
            </div>
            
            {copied && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Check className="w-10 h-10" />
                  <span className="font-bold">Copiado!</span>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Info + Botões */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700">
            
            {/* Linha 1: Valor + Botões Confirmar/Cancelar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex-1">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-tight">
                  R$ {amount}
                </p>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Botão Confirmar */}
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || isCancelling}
                  className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition flex items-center justify-center"
                  title="Confirmar Pagamento"
                >
                  {isConfirming ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </button>

                {/* Botão Cancelar */}
                <button
                  onClick={handleCancel}
                  disabled={isConfirming || isCancelling}
                  className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition flex items-center justify-center"
                  title="Cancelar PIX"
                >
                  {isCancelling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Linha 2: Nome Empresa + Banco */}
            <div className="px-3 py-1.5 border-b border-gray-200 dark:border-slate-700">
              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
                INTERMEDIAÇÕES DE PAGAMENTOS BIGCORPS
              </p>
              <p className="text-[9px] text-gray-500 dark:text-gray-500 leading-tight">
                Banco Inter
              </p>
            </div>

            {/* Linha 3: Código PIX + Botão Copiar */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div 
                className="flex-1 text-left py-1.5 px-2 bg-gray-100 dark:bg-slate-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                onClick={handleCopy}
              >
                <p className="text-[10px] font-mono text-gray-900 dark:text-white truncate">
                  {pixCode.substring(0, 35)}...
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`flex-shrink-0 p-2 rounded transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={copied ? 'Copiado!' : 'Copiar Código PIX'}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
