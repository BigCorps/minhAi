'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const T = LEGAL_THEMES.conviteia;
const CONFIRMACAO = 'excluir permanentemente';

export default function ExclusaoConviteIA() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      setUser(user);
      setLoading(false);
    }
    carregar();
    return () => {
      ativo = false;
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
        body: { userId: user?.id, email: user?.email, brand: 'conviteia' },
      });
      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Solicitação registrada. Você recebe a confirmação por e-mail em até 48 horas.',
      });

      setTimeout(async () => {
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
        Você pode pedir a exclusão permanente da sua conta e dos seus dados do Convite IA a qualquer
        momento, conforme a Lei Geral de Proteção de Dados.
      </P>

      <Box variant="danger">
        <P>
          <strong>Esta ação é irreversível.</strong> Os convites publicados saem do ar, os links
          param de funcionar e a lista de confirmações é perdida. Se o seu evento ainda não
          aconteceu, considere baixar ou anotar a lista de convidados antes de prosseguir.
        </P>
      </Box>

      <H2>O que será excluído</H2>
      <UL>
        <LI>
          <strong>Conta:</strong> nome, e-mail, senha e vínculo de login com Google ou Facebook
        </LI>
        <LI>
          <strong>Convites:</strong> todos os convites criados, publicados ou não, e todas as seções
          configuradas
        </LI>
        <LI>
          <strong>Arquivos:</strong> fotos e imagens enviadas para os convites
        </LI>
        <LI>
          <strong>Confirmações de presença:</strong> nomes, e-mails e acompanhantes informados pelos
          seus convidados
        </LI>
        <LI>
          <strong>Recados:</strong> mensagens deixadas pelos convidados
        </LI>
        <LI>
          <strong>Lista de presentes:</strong> itens e valores cadastrados
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> logs de acesso e informações de dispositivo
        </LI>
      </UL>

      <H2>O que não pode ser excluído</H2>
      <Box variant="warn">
        <P>
          <strong>Registros de pagamento.</strong> A legislação fiscal brasileira obriga a guarda de
          comprovantes de transação por prazo determinado. Esses registros são mantidos isolados,
          usados apenas para cumprir a obrigação legal, e não são utilizados para nenhuma outra
          finalidade.
        </P>
        <P>
          <strong>Eventos já criados na agenda dos convidados.</strong> O convite de calendário
          enviado a quem confirmou presença fica na conta Google do próprio convidado e só pode ser
          removido por ele.
        </P>
      </Box>

      <H2>Prazos</H2>
      <Box>
        <OL>
          <LI>
            <strong>Confirmação:</strong> e-mail em até 48 horas
          </LI>
          <LI>
            <strong>Processamento:</strong> até 7 dias úteis
          </LI>
          <LI>
            <strong>Conclusão:</strong> remoção definitiva dos nossos sistemas, incluindo backups na
            rotação seguinte
          </LI>
        </OL>
      </Box>

      {user ? (
        <div className="mt-8 pt-6 border-t border-rose-100">
          <H2>Solicitar exclusão</H2>

          {message && (
            <div
              className={`mb-4 p-4 rounded-xl flex items-start gap-3 border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
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
            <P>
              <strong>Conta:</strong> {user.email}
            </P>
            <P>
              <strong>Nome:</strong> {user.user_metadata?.name || 'não informado'}
            </P>
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
                <label
                  htmlFor="confirmacao"
                  className={`block text-sm font-medium mb-2 ${T.heading}`}
                >
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
                  className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar exclusão'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 pt-6 border-t border-rose-100">
          <H2>Entre para solicitar</H2>
          <P>
            Para excluir sua conta pela plataforma, é preciso estar logado. Se você não tem mais
            acesso ao e-mail cadastrado, escreva para <strong>contato@bigcorps.com.br</strong> com o
            assunto &ldquo;LGPD &mdash; Convite IA&rdquo; e o endereço do convite.
          </P>
          <Link href="/convite/entrar">
            <button
              type="button"
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${T.primaryBtn}`}
            >
              Fazer login
            </button>
          </Link>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-rose-100">
        <H2>Sou convidado, não organizador</H2>
        <P>
          Se você confirmou presença em um convite e quer que seus dados saiam da lista, peça
          diretamente a quem organiza o evento &mdash; é quem controla essa lista. Se preferir,
          escreva para <strong>contato@bigcorps.com.br</strong> informando o endereço do convite e o
          nome usado na confirmação, e nós encaminhamos.
        </P>
      </div>

      <div className="mt-6">
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/aviso', label: 'Aviso de Privacidade' },
            { href: '/termos', label: 'Termos de Uso' },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      </div>
    </LegalShell>
  );
}
