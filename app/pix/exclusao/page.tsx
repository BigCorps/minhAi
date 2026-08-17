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
        body: { userId: user?.id, email: user?.email, brand: 'pix' },
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
        Você pode pedir a exclusão permanente da sua conta e dos seus dados do Pix Wiki a qualquer
        momento, conforme a Lei Geral de Proteção de Dados.
      </P>

      <Box variant="danger">
        <P>
          <strong>Saque seu saldo antes de prosseguir.</strong> Valores disponíveis não são
          transferidos automaticamente no encerramento, e a ação é irreversível. Se houver saldo,
          faça o saque pelo painel e só depois solicite a exclusão.
        </P>
      </Box>

      <Box variant="warn">
        <P>
          <strong>Seu link de cobrança sai do ar.</strong> Clientes que tiverem o link salvo passam a
          ver uma página inexistente. Se você divulgou o endereço em cartão, vitrine ou rede social,
          avise antes. O endereço curto pode ser tomado por outra pessoa depois da liberação.
        </P>
        <P>
          A exclusão afeta a conta no ecossistema minhAi inteiro, não só o Pix Wiki &mdash; a conta é
          a mesma em todos os produtos.
        </P>
      </Box>

      <H2>O que será excluído</H2>
      <UL>
        <LI>
          <strong>Conta:</strong> nome, e-mail, senha, vínculo de login social e credencial de
          biometria
        </LI>
        <LI>
          <strong>Contato:</strong> telefone e WhatsApp cadastrados
        </LI>
        <LI>
          <strong>Documento e chave PIX:</strong> CPF ou CNPJ e a chave de recebimento
        </LI>
        <LI>
          <strong>Link de cobrança:</strong> o endereço curto e a página pública do negócio
        </LI>
        <LI>
          <strong>Configurações:</strong> preferências de notificação e de pagamento
        </LI>
        <LI>
          <strong>Assistente:</strong> histórico de interações com o assistente de voz incluído
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> logs de acesso e informações de dispositivo
        </LI>
      </UL>

      <H2>O que não pode ser excluído</H2>
      <Box variant="warn">
        <P>
          <strong>Histórico de movimentação financeira.</strong> Registros de cobranças liquidadas,
          saques e taxas têm retenção obrigatória pela legislação fiscal e pelas regras do arranjo de
          pagamentos PIX. Ficam mantidos isolados, usados apenas para cumprir essa obrigação e para
          responder a eventual questionamento de autoridade competente.
        </P>
        <P>
          Isso não é escolha nossa: vale para qualquer serviço que intermedeie pagamento. Não é
          possível dispensar a pedido.
        </P>
        <P>
          <strong>Registros no seu banco.</strong> As transações PIX ficam no extrato da sua
          instituição financeira, que não temos como alterar.
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
            rotação seguinte, exceto os registros de retenção obrigatória acima
          </LI>
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
                  className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        <div className="mt-8 pt-6 border-t border-slate-800">
          <H2>Entre para solicitar</H2>
          <P>
            Para excluir sua conta pela plataforma, é preciso estar logado. Se você não tem mais
            acesso ao e-mail cadastrado, escreva para <strong>contato@bigcorps.com.br</strong> com o
            assunto &ldquo;LGPD &mdash; Pix Wiki&rdquo; e o endereço do seu link.
          </P>
          <Link href="/login">
            <button
              type="button"
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${T.primaryBtn}`}
            >
              Fazer login
            </button>
          </Link>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-800">
        <H2>Eu só paguei um link</H2>
        <P>
          Pagar não cria conta, então não há conta a excluir. O que existe é o registro da transação,
          de retenção obrigatória. Para saber o que consta sobre você, escreva para{' '}
          <strong>contato@bigcorps.com.br</strong> com data, valor e o endereço do link que você
          pagou.
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
