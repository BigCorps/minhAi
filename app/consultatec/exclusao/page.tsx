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

const T = LEGAL_THEMES.consultatec;
const CONFIRMACAO = 'excluir permanentemente';

export default function ExclusaoConsultaTec() {
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
        body: { userId: user?.id, email: user?.email, brand: 'consultatec' },
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
        Você pode pedir a exclusão permanente da sua conta e dos seus dados do ConsultaTec a
        qualquer momento, conforme a Lei Geral de Proteção de Dados.
      </P>

      <Box variant="danger">
        <P>
          <strong>Esta ação é irreversível</strong> e afeta a conta no ecossistema minhAi inteiro,
          não só o ConsultaTec &mdash; a conta é a mesma em todos os produtos.
        </P>
      </Box>

      <Box variant="warn">
        <P>
          <strong>Antes de prosseguir, retire seu saldo.</strong> Saldo remanescente não é devolvido
          automaticamente na exclusão. Se houver crédito na conta, escreva para{' '}
          <strong>contato@bigcorps.com.br</strong> solicitando a devolução <em>antes</em> de excluir.
        </P>
      </Box>

      <H2>O que será excluído</H2>
      <UL>
        <LI>
          <strong>Conta:</strong> nome, e-mail, senha, vínculo de login social e credencial de
          biometria
        </LI>
        <LI>
          <strong>Histórico de consultas:</strong> a relação de consultas visível para você no painel
        </LI>
        <LI>
          <strong>Saldo:</strong> o registro de créditos da conta
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> logs de acesso e informações de dispositivo
        </LI>
      </UL>

      <H2>O que não pode ser excluído</H2>
      <Box variant="warn">
        <P>
          <strong>Registro mínimo de auditoria das consultas.</strong> A própria LGPD exige que
          quem trata dados de terceiros consiga demonstrar quem consultou o quê e quando. Por isso, o
          registro de que uma consulta ocorreu é mantido na forma mínima necessária, dissociado do
          seu perfil, mesmo após a exclusão da conta. Isso existe para proteger os titulares
          consultados, inclusive contra uso indevido.
        </P>
        <P>
          <strong>Registros fiscais de pagamento.</strong> A legislação fiscal brasileira obriga a
          guarda de comprovantes de transação por prazo determinado. São mantidos isolados e usados
          apenas para cumprir essa obrigação.
        </P>
        <P>
          <strong>Dados nos bureaus de origem.</strong> Nós não somos a fonte dos dados de crédito.
          Excluir sua conta aqui não altera nada no cadastro que um bureau mantém sobre você ou sobre
          terceiros &mdash; isso precisa ser tratado diretamente com o bureau.
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
        <div className="mt-8 pt-6 border-t border-[#C9BFA0]">
          <H2>Solicitar exclusão</H2>

          {message && (
            <div
              className={`mb-4 p-4 rounded-xl flex items-start gap-3 border ${
                message.type === 'success'
                  ? 'bg-[#E8F0E2] border-[#A8BF9A] text-[#2E4A22]'
                  : 'bg-[#F7E6E2] border-[#C9A0A0] text-[#7A2020]'
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
                  className="flex-1 px-6 py-3 rounded-lg font-medium bg-[#8f2d2d] text-[#FBF6E9] hover:bg-[#742323] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        <div className="mt-8 pt-6 border-t border-[#C9BFA0]">
          <H2>Entre para solicitar</H2>
          <P>
            Para excluir sua conta pela plataforma, é preciso estar logado. Se você usou o
            ConsultaTec <strong>sem cadastro</strong>, não existe conta a excluir &mdash; nesse caso,
            veja a seção abaixo.
          </P>
          <Link href="/consultatec/login">
            <button
              type="button"
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${T.primaryBtn}`}
            >
              Fazer login
            </button>
          </Link>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[#C9BFA0]">
        <H2>Usei sem cadastro</H2>
        <P>
          Consultas avulsas não criam conta. O que existe é o registro da cobrança PIX e o registro
          de auditoria da consulta. Para pedir a remoção do que for removível, escreva para{' '}
          <strong>contato@bigcorps.com.br</strong> com o assunto &ldquo;LGPD &mdash; consulta
          avulsa&rdquo;, informando data, valor e o documento consultado.
        </P>
      </div>

      <div className="mt-8 pt-6 border-t border-[#C9BFA0]">
        <H2>Meu documento foi consultado aqui</H2>
        <P>
          Se você é titular de um CPF ou CNPJ e quer saber se foi consultado nesta plataforma, ou
          pedir a remoção desse registro, escreva para <strong>contato@bigcorps.com.br</strong> com o
          assunto &ldquo;LGPD &mdash; titular consultado&rdquo;. Vamos solicitar comprovação de
          identidade antes de responder, justamente para não expor dados a quem não é o titular.
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
