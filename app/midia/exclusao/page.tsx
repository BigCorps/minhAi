'use client';

// app/midia/exclusao/page.tsx
//
// Exclusão de conta e dados do Midia.Pro (midia.pro).
//
// Requisito do Google Play: todo app com criação de conta precisa de caminho
// de exclusão acessível por URL pública. É a URL do campo de exclusão de dados
// no Play Console.
//
// Reusa a Edge Function 'delete-user-data' das outras marcas, com
// brand: 'midia'. CONFIRMAR que a função trata esse valor — se houver switch
// por marca, 'midia' precisa estar lá, senão a exclusão falha em silêncio.
//
// O aviso de saldo vem ANTES do botão de propósito: diferente dos outros
// produtos da casa, aqui o usuário RECEBE dinheiro, e saldo não sacado não é
// devolvido automaticamente no encerramento. Descobrir isso depois de
// confirmar a exclusão seria prejuízo direto.

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

const T = LEGAL_THEMES.midia;
const CONFIRMACAO = 'excluir permanentemente';

export default function ExclusaoMidiaPro() {
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
        body: { userId: user?.id, email: user?.email, brand: 'midia' },
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
        Você pode pedir a exclusão permanente da sua conta e dos seus dados do Midia.Pro a qualquer
        momento, conforme a Lei Geral de Proteção de Dados.
      </P>

      <Box variant="danger">
        <P>
          <strong>Saque seu saldo antes de excluir.</strong> Saldo remanescente não é devolvido
          automaticamente no encerramento. Verifique o valor disponível no painel e faça o saque
          primeiro — depois da exclusão não há como recuperar.
        </P>
      </Box>

      <Box variant="danger">
        <P>
          <strong>Esta ação é irreversível</strong> e afeta a conta no ecossistema minhAi inteiro,
          não só o Midia.Pro &mdash; a conta é a mesma em todos os produtos.
        </P>
      </Box>

      <Box variant="warn">
        <P>
          <strong>Suas telas param de exibir.</strong> Ao excluir a conta, todas as telas pareadas
          são desvinculadas e deixam de reproduzir conteúdo, inclusive os anúncios que estavam
          gerando crédito. Se você quer apenas pausar, desative as telas em vez de excluir.
        </P>
      </Box>

      <H2>O que será excluído</H2>
      <UL>
        <LI>
          <strong>Conta:</strong> nome, e-mail, senha, telefone e vínculo de login social
        </LI>
        <LI>
          <strong>Dados do estabelecimento:</strong> CPF ou CNPJ, endereço e informações de
          cadastro
        </LI>
        <LI>
          <strong>Telas:</strong> cadastro, pareamento, tokens de dispositivo e programação
        </LI>
        <LI>
          <strong>Suas mídias:</strong> imagens, vídeos e textos enviados para exibição
        </LI>
        <LI>
          <strong>Dados de saque:</strong> chave PIX cadastrada e preferências de recebimento
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
          <strong>Métricas de exibição dos anúncios.</strong> Os anunciantes têm direito à
          comprovação de que as peças pagas foram veiculadas. Esses registros são mantidos de forma
          agregada, dissociados do seu perfil, mesmo após a exclusão da conta.
        </P>
        <P>
          <strong>Registros financeiros e fiscais.</strong> A legislação fiscal brasileira obriga a
          guarda de comprovantes de transação e repasse por prazo determinado. São mantidos
          isolados e usados apenas para cumprir essa obrigação.
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
            <strong>Conclusão:</strong> remoção definitiva dos nossos sistemas, incluindo backups
            na rotação seguinte
          </LI>
        </OL>
      </Box>

      {user ? (
        <div className="mt-8 pt-6 border-t border-blue-200">
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
        <div className="mt-8 pt-6 border-t border-blue-200">
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
