'use client';

// app/funcionaria/exclusao/page.tsx
//
// Exclusão de conta e dados da FuncionarIA (funcionaria.net).
//
// Esta página é requisito do Google Play: todo app que permite criar conta
// precisa de um caminho de exclusão acessível por URL pública. É a URL que vai
// no campo de exclusão de dados do Play Console.
//
// Reusa a Edge Function 'delete-user-data' já usada pelas outras marcas,
// passando brand: 'funcionaria'.
//
// Aviso deliberado na seção "O que não pode ser excluído": excluir a conta
// aqui derruba a assistente que está atendendo os clientes do usuário. Num
// produto B2B isso é operacionalmente grave, e o usuário precisa ler antes de
// confirmar — não depois.

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

const T = LEGAL_THEMES.funcionaria;
const CONFIRMACAO = 'excluir permanentemente';

export default function ExclusaoFuncionarIA() {
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
        body: { userId: user?.id, email: user?.email, brand: 'funcionaria' },
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
        Você pode pedir a exclusão permanente da sua conta e dos seus dados da FuncionarIA a
        qualquer momento, conforme a Lei Geral de Proteção de Dados.
      </P>

      <Box variant="danger">
        <P>
          <strong>Esta ação é irreversível</strong> e afeta a conta no ecossistema minhAi inteiro,
          não só a FuncionarIA &mdash; a conta é a mesma em todos os produtos.
        </P>
      </Box>

      <Box variant="warn">
        <P>
          <strong>Sua assistente para de atender.</strong> Ao excluir a conta, a FuncionarIA sai do
          ar imediatamente e deixa de responder seus clientes em todos os canais conectados,
          inclusive WhatsApp. Se você quer apenas pausar, cancele o plano em vez de excluir.
        </P>
        <P>
          <strong>Exporte o que precisar antes.</strong> Histórico de atendimentos e base de
          conhecimento não são recuperáveis depois da exclusão.
        </P>
      </Box>

      <H2>O que será excluído</H2>
      <UL>
        <LI>
          <strong>Conta:</strong> nome, e-mail, senha, telefone e vínculo de login social
        </LI>
        <LI>
          <strong>Dados da empresa:</strong> perfil, CPF ou CNPJ e informações de cadastro
        </LI>
        <LI>
          <strong>Sua assistente:</strong> identidade, personalidade, habilidades ativadas,
          instruções e base de conhecimento
        </LI>
        <LI>
          <strong>Atendimentos:</strong> o histórico de conversas visível para você no painel
        </LI>
        <LI>
          <strong>Canais conectados:</strong> a integração com WhatsApp e demais canais
        </LI>
        <LI>
          <strong>Notificações:</strong> identificador de dispositivo e preferências de aviso
        </LI>
        <LI>
          <strong>Registros técnicos:</strong> logs de acesso e informações de dispositivo
        </LI>
      </UL>

      <H2>O que não pode ser excluído</H2>
      <Box variant="warn">
        <P>
          <strong>Registros fiscais de pagamento.</strong> A legislação fiscal brasileira obriga a
          guarda de comprovantes de transação por prazo determinado. São mantidos isolados e usados
          apenas para cumprir essa obrigação.
        </P>
        <P>
          <strong>Dados que seus clientes já receberam.</strong> Se a assistente enviou uma
          mensagem para o cliente, aquela mensagem está no aparelho dele. Excluir sua conta aqui não
          apaga o que já foi entregue.
        </P>
        <P>
          <strong>Mensagens na infraestrutura do canal.</strong> Conversas que passaram pelo
          WhatsApp também existem nos servidores da Meta, sujeitas às políticas dela. Isso precisa
          ser tratado diretamente com o canal.
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
        <div className="mt-8 pt-6 border-t border-violet-200">
          <H2>Solicitar exclusão</H2>

          {message && (
            <div
              className={`mb-4 p-4 rounded-xl flex items-start gap-3 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
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
                  className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
        <div className="mt-8 pt-6 border-t border-violet-200">
          <H2>Entre para solicitar</H2>
          <P>
            Para excluir sua conta pela plataforma, é preciso estar logado. Se você não conseguir
            acessar a conta, escreva para <strong>contato@bigcorps.com.br</strong> com o assunto
            &ldquo;LGPD &mdash; exclusão de conta&rdquo;.
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

      <div className="mt-8 pt-6 border-t border-violet-200">
        <H2>Sou cliente de uma empresa que usa a FuncionarIA</H2>
        <P>
          Se você conversou com a assistente de uma empresa e quer acessar ou excluir os seus dados,
          o pedido precisa ser feito <strong>à empresa</strong>, não a nós. Perante a LGPD, ela é a
          controladora desses dados e nós apenas operamos a plataforma por conta dela.
        </P>
        <P>
          Se você não souber como contatá-la, escreva para{' '}
          <strong>contato@bigcorps.com.br</strong> com o assunto &ldquo;LGPD &mdash; titular de
          atendimento&rdquo; e encaminhamos o pedido à empresa responsável.
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
