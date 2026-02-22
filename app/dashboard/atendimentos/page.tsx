'use client';
// ARQUIVO: app/dashboard/atendimentos/page.tsx
import { useState, useEffect } from 'react';
import { ConnectionManager } from './_components/ConnectionManager';
import { QuickActionsPanel } from './_components/QuickActionsPanel';
import { createClient } from '@/lib/supabase-browser';
import { HelpCircle, X, ExternalLink, Smartphone, Monitor, ChevronRight } from 'lucide-react';

export default function AtendimentosPage() {
  const supabase = createClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('companies')
        .select('id').eq('user_id', user.id).eq('is_active', true).order('name').limit(1);
      if (data?.[0]) setSelectedCompanyId(data[0].id);
    }
    load();
  }, []);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        {/* Cabeçalho com botão Ajuda */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Serviços Meta</h1>
            <p className="text-muted-foreground mt-1">
              Configure seus assistentes ao WhatsApp, Instagram e Facebook.
            </p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1 border rounded-md px-3 py-1.5 hover:bg-muted"
          >
            <HelpCircle className="w-4 h-4" />
            Ajuda
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <ConnectionManager onCompanyChange={setSelectedCompanyId} />
        <QuickActionsPanel selectedCompanyId={selectedCompanyId} />
      </div>

      {/* Modal de Ajuda */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}
        >
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
              <div>
                <h2 className="text-lg font-semibold">Como configurar o Meta Business Suite</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Siga os passos para conectar WhatsApp, Instagram e Facebook
                </p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Intro */}
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                O <strong className="text-foreground">Meta Business Suite</strong> é a plataforma gratuita da Meta que centraliza
                a gestão de contas empresariais do Facebook, Instagram e WhatsApp Business.
                Você precisa configurá-lo antes de conectar suas contas aqui.
              </div>

              {/* Via App */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Pelo aplicativo (celular)</h3>
                </div>
                <ol className="space-y-2.5 text-sm">
                  {[
                    <>Baixe o app <strong>Meta Business Suite</strong> na App Store ou Google Play.</>,
                    <>Faça login com sua conta do Facebook que administra a Página da empresa.</>,
                    <>Toque em <strong>Menu</strong> (☰) → <strong>Configurações</strong> → <strong>Contas vinculadas</strong>.</>,
                    <>Em <strong>Instagram</strong>: toque em <strong>Conectar conta</strong> e autorize a conta profissional/comercial.</>,
                    <>Em <strong>WhatsApp</strong>: toque em <strong>Adicionar número</strong>, insira o número e confirme o código SMS.<br/>
                      <span className="text-muted-foreground text-xs">⚠️ O número não pode estar ativo em outro WhatsApp pessoal.</span></>,
                    <>Confirme que a Página do Facebook está como <strong>Conta principal</strong> no painel.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <hr className="border-border" />

              {/* Via Site */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Pelo navegador (computador)</h3>
                </div>
                <ol className="space-y-2.5 text-sm">
                  {[
                    <>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">business.facebook.com <ExternalLink className="w-3 h-3" /></a> e faça login.</>,
                    <>No menu lateral, clique em <strong>Configurações</strong> → <strong>Contas</strong>.</>,
                    <>Em <strong>Contas do Instagram</strong>: clique em <strong>Adicionar</strong> e siga o fluxo de autorização.</>,
                    <>Em <strong>Contas do WhatsApp</strong>: clique em <strong>Adicionar</strong>, insira o número e confirme o código.<br/>
                      <span className="text-muted-foreground text-xs">⚠️ O número precisa ser um chip disponível, nunca usado em WhatsApp pessoal.</span></>,
                    <>Vá em <strong>Páginas</strong> e confirme que a Página da empresa está vinculada ao portfólio.</>,
                    <>Volte aqui e clique em <strong>Conectar conta Meta</strong> — o sistema detectará automaticamente as contas configuradas.</>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <hr className="border-border" />

              {/* Dicas */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Dúvidas frequentes</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { q: 'Por que o WhatsApp não aparece após conectar?', a: 'O número precisa estar vinculado a uma conta WhatsApp Business Account no Business Suite antes de conectar aqui. Siga os passos acima e reconecte a conta.' },
                    { q: 'Posso usar meu WhatsApp pessoal?', a: 'Não. O Meta exige um número exclusivo para o WhatsApp Business. Use um chip novo ou um número fixo que nunca teve WhatsApp.' },
                    { q: 'O Instagram não aparece na conexão.', a: 'A conta do Instagram precisa ser do tipo Profissional ou Comercial. Acesse o Instagram → Configurações → Conta → Mudar para conta profissional.' },
                  ].map(({ q, a }, i) => (
                    <details key={i} className="group border rounded-lg">
                      <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-muted/50 rounded-lg transition-colors">
                        <span className="font-medium text-sm">{q}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                      </summary>
                      <p className="px-3 pb-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
                    </details>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  Entendido
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
