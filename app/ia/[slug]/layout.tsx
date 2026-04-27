import { createAdminClient } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, assistant_role, webapp_theme_color')
    .eq('slug', slug)
    .single();
  
  if (error || !company) notFound();
  
return (
    <div className="min-h-screen flex flex-col">
      <style>{`
        /* Kiosk: desabilita seleção de texto, menu de contexto e arraste */
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        /* Exceção: campos de texto continuam funcionando */
        input, textarea, [contenteditable="true"] {
          -webkit-user-select: text;
          -moz-user-select: text;
          user-select: text;
        }
        /* Desabilita arraste de imagens */
        img, svg {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        /* Reabilita pointer-events em botões e links */
        button, a, [role="button"] {
          pointer-events: auto;
        }
      `}</style>
      <main
        className="flex-1"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </main>
    </div>
  );
}
