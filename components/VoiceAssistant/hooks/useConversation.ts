// components/VoiceAssistant/hooks/useConversation.ts

import { useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useConversation(companyId: string) {
  const conversationIdRef = useRef<string | null>(null);
  const supabase = createClient();

  const createOrGetConversation = async (): Promise<string | null> => {
    // Se já tem conversa, retornar
    if (conversationIdRef.current) {
      return conversationIdRef.current;
    }

    try {
      console.log('🆕 Criando nova conversa...');
      
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          company_id: companyId,
          started_at: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar conversa:', error);
        return null;
      }

      if (newConversation) {
        conversationIdRef.current = newConversation.id;
        console.log('✅ Conversa criada:', newConversation.id);
        return newConversation.id;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro criar conversa:', error);
      return null;
    }
  };

  const saveMessage = async (
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> => {
    try {
      // Garantir que tem conversa
      let currentConversationId = conversationIdRef.current;

      if (!currentConversationId) {
        currentConversationId = await createOrGetConversation();
        if (!currentConversationId) {
          console.log('⚠️ Não foi possível criar conversa');
          return;
        }
      }

      console.log(`💾 Salvando mensagem ${role}:`, content.substring(0, 50) + '...');

      const { error } = await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role,
        content
      });

      if (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
      } else {
        console.log('✅ Mensagem salva');
      }
    } catch (error) {
      console.error('❌ Erro saveMessage:', error);
    }
  };

  return {
    conversationIdRef,
    createOrGetConversation,
    saveMessage,
  };
}
