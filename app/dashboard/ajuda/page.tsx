// app/dashboard/ajuda/page.tsx
'use client';

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase-browser';
import { 
  LifeBuoy, 
  Instagram, 
  UserCheck, 
  Youtube, 
  BookOpen, 
  Lightbulb,
  Send,
  Loader2,
  FileText,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react';

type AjudaCard = {
  id: string;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  acao: {
    tipo: 'link' | 'toast' | 'dialog';
    valor: string;
  };
  textoBotao: string;
};

// Lista de cards de ajuda
const cardsDeAjuda: AjudaCard[] = [
  { 
    id: 'suporte', 
    titulo: 'Suporte', 
    descricao: 'Precisa de ajuda urgente? Nossa equipe de suporte técnico está pronta para te auxiliar.', 
    icone: <LifeBuoy className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: 'https://api.whatsapp.com/send/?phone=5511926828418&text=Preciso%20de%20suporte%20URGENTE%20no%20minhAi%20App&type=phone_number&app_absent=0' }, 
    textoBotao: 'Contatar Suporte' 
  },
  { 
    id: 'ia-suporte', 
    titulo: 'Assistente de Suporte', 
    descricao: 'Tire suas dúvidas instantaneamente com nossa IA treinada para te ajudar com o minhAi.', 
    icone: <UserCheck className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: 'https://suporte.suaia.app' }, 
    textoBotao: 'Falar com a IA' 
  },
  { 
    id: 'tour', 
    titulo: 'Tour pelo minhAi', 
    descricao: 'Conheça todas as funcionalidades do minhAi em um tour interativo guiado passo a passo.', 
    icone: <BookOpen className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: 'https://minhai.app/tour' }, 
    textoBotao: 'Iniciar Tour' 
  },
  { 
    id: 'youtube', 
    titulo: 'Canal no YouTube', 
    descricao: 'Assista tutoriais, demonstrações e novidades do minhAi diretamente no nosso canal.', 
    icone: <Youtube className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: 'https://www.youtube.com/@appminhai' }, 
    textoBotao: 'Acessar Canal' 
  },
  { 
    id: 'instagram', 
    titulo: 'Nosso Instagram', 
    descricao: 'Acompanhe todas as nossas dicas, vídeos, promoções e novidades em nossa rede social.', 
    icone: <Instagram className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: 'https://instagram.com/bigcorps' }, 
    textoBotao: 'Seguir no Instagram' 
  },
  { 
    id: 'sugestoes', 
    titulo: 'Sugestões', 
    descricao: 'Precisa de uma função que não encontrou? Ajude-nos a melhorar minhAi com suas idéias!', 
    icone: <Lightbulb className="w-6 h-6" />, 
    acao: { tipo: 'dialog', valor: 'sugestoes' }, 
    textoBotao: 'Enviar Sugestão' 
  },
  { 
    id: 'exclusion', 
    titulo: 'Exclusão de Dados', 
    descricao: 'Solicite a exclusão permanente da sua conta e de todos os seus dados.', 
    icone: <Trash2 className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: '/exclusao' }, 
    textoBotao: 'Ver Instruções' 
  },
  { 
    id: 'terms', 
    titulo: 'Termos de Uso', 
    descricao: 'Leia os termos e condições que regem o uso do nosso aplicativo.', 
    icone: <FileText className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: '/termos' }, 
    textoBotao: 'Ler Termos' 
  },
  { 
    id: 'privacy', 
    titulo: 'Aviso de Privacidade', 
    descricao: 'Entenda como coletamos, usamos e protegemos suas informações pessoais.', 
    icone: <ShieldCheck className="w-6 h-6" />, 
    acao: { tipo: 'link', valor: '/aviso' }, 
    textoBotao: 'Ler Aviso' 
  },
];

export default function AjudaPage() {
  const { toast } = useToast();
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleCardClick = (acao: AjudaCard['acao']) => {
    if (acao.tipo === 'link') {
      if (acao.valor.startsWith('http')) {
        window.open(acao.valor, '_blank', 'noopener,noreferrer');
      } else {
        window.open(window.location.origin + acao.valor, '_blank');
      }
    } else if (acao.tipo === 'toast') {
      toast({
        title: "Novidades a Caminho!",
        description: acao.valor,
      });
    } else if (acao.tipo === 'dialog') {
      setIsSuggestionOpen(true);
    }
  };

  const handleSendSuggestion = async () => {
    if (suggestionText.trim().length < 10) {
      toast({
        title: "Sugestão muito curta",
        description: "Por favor, descreva sua sugestão com mais detalhes.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-suggestion', {
        body: { suggestion: suggestionText },
      });

      if (error) throw error;

      toast({
        title: "Sugestão Enviada!",
        description: "Obrigado! Sua opinião é muito importante para nós.",
      });
      setSuggestionText('');
      setIsSuggestionOpen(false);

    } catch (error: any) {
      toast({
        title: "Erro ao enviar sugestão",
        description: error.message || "Não foi possível enviar sua sugestão. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Central de Ajuda</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Como podemos ajudá-lo hoje?</p>
        </div>
        
        {/* Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cardsDeAjuda.map((card) => (
            <div 
              key={card.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-white/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                  {card.icone}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {card.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {card.descricao}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleCardClick(card.acao)}
                className="w-full px-4 py-3 bg-[#b0cb1f] text-white rounded-xl hover:bg-[#8ca214] transition font-bold shadow-lg shadow-[#b0cb1f]/20"
              >
                {card.textoBotao}
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Dialog para sugestões */}
      {isSuggestionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enviar Sugestão</h2>
              <button
                onClick={() => setIsSuggestionOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Adoramos ouvir suas ideias! Descreva sua sugestão de melhoria ou nova funcionalidade para minhAi.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="suggestion-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sua sugestão
                </label>
                <textarea
                  id="suggestion-text"
                  placeholder="Ex: Gostaria de uma integração com o banco X ou um relatório de Y..."
                  rows={6}
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsSuggestionOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendSuggestion}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-[#b0cb1f] text-white rounded-xl hover:bg-[#8ca214] transition font-bold disabled:opacity-50 shadow-lg shadow-[#b0cb1f]/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
