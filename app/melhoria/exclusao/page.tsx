'use client';

// app/melhoria/exclusao/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Exclusão de conta e dados. Porte fiel do fluxo do ConsultaTec — mesma edge
// function `delete-user-data`, só muda a marca e o tema.
//
// A Play Store EXIGE que esta página seja acessível de duas formas: por dentro
// do aplicativo e por uma URL pública, sem login. Por isso a página abre e
// explica tudo mesmo para quem não está logado — só o botão fica indisponível.
//
// O texto evita a armadilha de tratar exclusão como coisa banal: aqui apagar a
// conta significa parar de ser lembrado de tomar remédio, e a pessoa precisa
// entender isso ANTES de confirmar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import {
  LEGAL_THEMES, LegalShell, LegalFooterLinks, ControladorBox,
  H2, P, UL, LI, Box,
} from '@/components/legal/legal-doc';

const T = LEGAL_THEMES.melhoria;
const CONFIRMACAO = 'apagar minha conta';

export default function ExclusaoMelhorIA() {
  const [user, setUser]                 = useState<any>(null);
  const [carregando, setCarregando]     = useState(true);
  const [apagando, setApagando]         = useState(false);
  const [confirmando, setConfirmando]   = useState(false);
  const [texto, setTexto]               = useState('');
  const [msg, setMsg]                   = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!ativo) return;
      setUser(data?.user ?? null);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [supabase]);

  async function apagar() {
    if (texto.trim().toLowerCase() !== CONFIRMACAO) {
      setMsg({ tipo: 'erro', texto: `Escreva “${CONFIRMACAO}” para confirmar.` });
      return;
    }

    setApagando(true);
    setMsg(null);

    try {
      const { error } = await supabase.functions.invoke('delete-user-data', {
        body: { userId: user?.id, email: user?.email, brand: 'melhoria' },
      });
      if (error) throw error;

      setMsg({
        tipo: 'ok',
        texto: 'Pedido registrado. Você recebe a confirmação por e-mail em até 48 horas.',
      });

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/');
      }, 3000);
    } catch (e: any) {
      setMsg({
        tipo: 'erro',
        texto:
          e?.message ||
          'Não consegui registrar o pedido. Tente de novo ou escreva para contato@bigcorps.com.br.',
      });
    } finally {
      setApagando(false);
    }
  }

  if (carregando) {
    return (
      <div className={`${T.pageBg} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${T.spinner}`} />
      </div>
    );
  }

  return (
    <LegalShell
      theme={T}
      title="Apagar minha conta"
      textoGrande
      scroll={false}
      footer={
        <LegalFooterLinks
          theme={T}
          links={[
            { href: '/aviso', label: 'Aviso de privacidade' },
            { href: '/termos', label: 'Termos de uso' },
            { href: 'mailto:contato@bigcorps.com.br', label: 'Falar com a gente' },
          ]}
        />
      }
    >
      <Box variant="danger">
        <P>
          <strong>Antes de continuar, leia isto.</strong> Ao apagar sua conta,{' '}
          <strong>os lembretes de remédio param de funcionar</strong>. Você não
          vai mais ser avisado na hora de tomar nada, e sua família também não
          será avisada se você esquecer.
        </P>
      </Box>

      <H2>O que é apagado</H2>
      <UL>
        <LI>seus remédios, horários e todo o histórico de doses</LI>
        <LI>suas consultas e exames</LI>
        <LI>fotos de receitas e pedidos de exame que você tenha enviado</LI>
        <LI>seus contatos de emergência</LI>
        <LI>sua lista de compras</LI>
        <LI>seus dados de cadastro e seu acesso</LI>
        <LI>o vínculo com os familiares que você convidou</LI>
      </UL>

      <H2>O que continua guardado</H2>
      <P>
        Registros de pagamento e de emissão fiscal, pelo prazo que a lei
        obriga. Eles ficam separados e não são usados para mais nada.
      </P>
      <P>
        Compromissos que você tenha enviado para a Agenda do Google continuam lá
        — eles são seus, na sua conta Google, e nós não temos como apagá-los.
        Você pode removê-los pela própria Agenda.
      </P>

      <H2>Isto não tem volta</H2>
      <P>
        Depois de confirmado, não conseguimos recuperar nada. Se você só quer
        parar de receber avisos por um tempo, é melhor desativar os remédios
        dentro do aplicativo em vez de apagar a conta.
      </P>

      <Box variant="warn">
        <P>
          <strong>Sua conta é a mesma da plataforma minhAi.</strong> Se você usa
          outro produto nosso com este mesmo e-mail, apagar aqui encerra o
          acesso a todos eles.
        </P>
      </Box>

      <H2>Confirmar</H2>

      {!user && (
        <Box variant="info">
          <P>
            Você não está conectado. Entre na sua conta para apagar seus dados,
            ou escreva para <strong>contato@bigcorps.com.br</strong> pedindo a
            exclusão — atendemos em até 15 dias.
          </P>
        </Box>
      )}

      {user && (
        <>
          <P>
            Conta conectada: <strong>{user.email}</strong>
          </P>

          {!confirmando ? (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className={`w-full mt-4 px-6 py-5 rounded-xl font-bold text-lg transition-colors ${T.dangerBtn}`}
            >
              Quero apagar minha conta
            </button>
          ) : (
            <div className="mt-4">
              <label htmlFor="confirma" className="block font-bold mb-2">
                Para confirmar, escreva: <em>{CONFIRMACAO}</em>
              </label>
              <input
                id="confirma"
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={CONFIRMACAO}
                autoComplete="off"
                className={`w-full px-4 py-4 rounded-xl text-lg ${T.input}`}
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setConfirmando(false); setTexto(''); setMsg(null); }}
                  disabled={apagando}
                  className={`w-full px-6 py-5 rounded-xl font-bold text-lg transition-colors ${T.ghostBtn}`}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={apagar}
                  disabled={apagando}
                  className={`w-full px-6 py-5 rounded-xl font-bold text-lg transition-colors ${T.dangerBtn}`}
                >
                  {apagando ? 'Apagando...' : 'Apagar para sempre'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {msg && (
        <div className={`mt-4 rounded-xl p-4 ${msg.tipo === 'ok' ? T.infoBox : T.dangerBox}`}>
          <P>{msg.texto}</P>
        </div>
      )}

      <H2>Prefere pedir por e-mail?</H2>
      <P>
        Escreva para <strong>contato@bigcorps.com.br</strong> do endereço da sua
        conta, dizendo que quer apagar seus dados da MelhorIA. Respondemos em
        até 15 dias.
      </P>

      <ControladorBox produto="MelhorIA" />
    </LegalShell>
  );
}
