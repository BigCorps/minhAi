'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import {
  LEGAL_THEMES,
  LegalShell,
  LegalFooterLinks,
  H2,
  P,
  UL,
  LI,
  OL,
  Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.pix;
const CONFIRMACAO = 'excluir permanentemente';

export default function ExclusaoPixWiki() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUser(user);
      setLoading(false);
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleDelete() {
    if (confirmText.trim().toLowerCase() !== CONFIRMACAO) {
      setMessage({ type: 'error', text: `Digite "${CONFIRMACAO}" para confirmar.` });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const { error } = await supabase.functions.invoke('delete-user-data', {
        body: { userId: user?.id, email: user?.email, brand: 'pix' },
      });
      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Solicitação registrada. Você recebe a confirmação por e-mail em até 48 horas.',
      });

      window.setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text:
          err?.message ||
          'Não foi possível registrar a solicitação. Tente novamente ou escreva para contato@bigcorps.com.br.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className={`${T.pageBg} flex items-center justify-center`}>
        <Loader2 className={`w-8 h-8 animate-spin ${T.spinner}`} />
      </div>
    );
  }

  return (
    <LegalShell theme={T} title="Exclusão de Dados" scroll={false}>
      <H2>O que a exclusão faz</H2>
      <P>
        Você pode solicitar a exclusão da sua conta e dos dados do PixWiki conforme a LGPD.
        A solicitação passa por revisão porque a autenticação é compartilhada com o ecossistema
        minhAi e pode existir uso do mesmo login em outros produtos.
      </P>

      <Box variant="info">
        <P>
          <strong>O PixWiki não guarda dinheiro.</strong> Não existe saldo PixWiki para sacar antes
          da exclusão. Seus recursos financeiros permanecem na sua conta Mercado Pago e não são
          movimentados pelo encerramento do PixWiki.
        </P>
      </Box>

      <Box variant="warn">
        <P>
          <strong>Links PixWiki podem deixar de funcionar.</strong> Se você usa um endereço
          `seunome.pix.wiki`, ele poderá ser desativado quando a exclusão for concluída.
        </P>
        <P>
          Se o mesmo login estiver vinculado a outros produtos minhAi, informe isso ao responder o
          e-mail de confirmação para que o escopo do pedido seja tratado corretamente.
        </P>
      </Box>

      <H2>Dados que entram no pedido</H2>
      <UL>
        <LI>dados da conta e autenticação relacionados ao PixWiki</LI>
        <LI>recebedores/empresas e configurações PixWiki</LI>
        <LI>chave Pix e configurações de pagamento</LI>
        <LI>conexão e tokens Mercado Pago mantidos pelo PixWiki</LI>
        <LI>preferências e inscrições de notificações</LI>
        <LI>chaves API e Webhooks PixWiki</LI>
        <LI>dados técnicos que não precisem ser preservados por segurança ou obrigação legal</LI>
      </UL>

      <H2>Registros que podem precisar ser preservados</H2>
      <Box variant="warn">
        <P>
          Alguns registros de transação, auditoria, segurança e suporte podem ser mantidos pelo
          período necessário para cumprimento de obrigação legal, prevenção a fraude ou exercício
          regular de direitos. Quando possível, esses registros são minimizados e separados do uso
          operacional da conta.
        </P>
        <P>
          <strong>Registros do Mercado Pago não são controlados pelo PixWiki.</strong> Para excluir
          ou alterar dados mantidos pelo Mercado Pago, use os canais do próprio provedor.
        </P>
      </Box>

      <H2>Prazos</H2>
      <Box>
        <OL>
          <LI><strong>Confirmação da solicitação:</strong> até 48 horas</LI>
          <LI><strong>Análise do escopo:</strong> verifica vínculos com outros produtos compartilhados</LI>
          <LI><strong>Processamento:</strong> conforme a complexidade e os prazos legais aplicáveis</LI>
        </OL>
      </Box>

      {user ? (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <H2>Solicitar exclusão</H2>

          {message && (
            <div
              className={`mb-4 p-4 rounded-xl flex items-start gap-3 border ${
                message.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/50 border-red-900 text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <Box>
            <P><strong>Conta:</strong> {user.email}</P>
            <P><strong>Nome:</strong> {user.user_metadata?.name || 'não informado'}</P>
          </Box>

          {!showConfirmation ? (
            <button
              type="button"
              onClick={() => setShowConfirmation(true)}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${T.dangerBtn}`}
            >
              Continuar com a exclusão
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="confirmacao" className={`block text-sm font-medium mb-2 ${T.heading}`}>
                  Para confirmar, digite: <strong>{CONFIRMACAO}</strong>
                </label>
                <input
                  id="confirmacao"
                  type="text"
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMACAO}
                  className={`w-full px-4 py-3 rounded-lg outline-none transition-shadow ${T.input}`}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmText('');
                    setMessage(null);
                  }}
                  disabled={isDeleting}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${T.ghostBtn} disabled:opacity-50`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmText.trim().toLowerCase() !== CONFIRMACAO}
                  className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar exclusão'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Box variant="info">
          <P>
            Para solicitar pela plataforma, entre na sua conta. Você também pode escrever para
            <strong> contato@bigcorps.com.br</strong> usando o e-mail cadastrado.
          </P>
        </Box>
      )}

      <div className="mt-6">
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/termos', label: 'Termos de Uso' },
            { href: '/aviso', label: 'Aviso de Privacidade' },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      </div>
    </LegalShell>
  );
}
