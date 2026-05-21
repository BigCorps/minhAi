'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import AssistenteClient from '../assistente-client';
import { Maximize2, X } from 'lucide-react';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function WidgetPage({ params }: PageProps) {
  const { slug } = use(params);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompany() {
      const supabase = createClient();
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (data) {
        setCompany(data);
      }
      setLoading(false);
    }
    loadCompany();
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );

  if (!company) return <div>Empresa não encontrada</div>;

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col">
      {/* Header Compacto para o Widget */}
      <div className="bg-background/80 backdrop-blur-md border-b px-4 py-2 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.name} className="w-6 h-6 rounded-full object-contain" />
          )}
          <span className="font-bold text-sm truncate max-w-[150px]">{company.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.open(`https://${slug}.minhai.com.br`, '_blank')}
            className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
            title="Abrir versão completa"
          >
            <Maximize2 size={18} />
          </button>
          <button 
            onClick={() => window.close()}
            className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Assistente */}
      <div className="flex-1 relative">
        <AssistenteClient company={company} widgetMode />
      </div>

      {/* Estilos específicos para forçar o modo widget no AssistenteClient se necessário */}
      <style jsx global>{`
        /* Esconder rodapés padrão ou elementos desnecessários no modo popup */
        header, footer { display: none !important; }
        .widget-header { display: flex !important; }
        
        /* Ajustar o container do chat para ocupar o espaço correto */
        main { padding-top: 0 !important; }
      `}</style>
    </div>
  );
}
