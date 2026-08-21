'use client';

// app/melhoria/consentimento/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Consentimento específico e destacado para dado de saúde (LGPD art. 11).
//
// Por que esta tela existe separada dos termos: o art. 11 exige consentimento
// "específico e destacado" para dado sensível. Um aceite genérico de "li e
// concordo com os termos" NÃO cobre remédio, receita e exame. Se o
// consentimento estiver enterrado nos termos, ele é frágil — e é o tipo de
// coisa que só aparece quando já virou problema.
//
// Duas consequências de desenho que vêm daí:
//   1. São DOIS aceites separados. Guardar dados de saúde é obrigatório para o
//      aplicativo funcionar. Enviar para a Agenda do Google é opcional e vem
//      desligado — não dá para amarrar os dois num checkbox só.
//   2. Cada aceite grava seu próprio carimbo de tempo em melhoria.perfis
//      (consentiu_saude_em, consentiu_agenda_em). Sem data registrada, não há
//      como provar quando foi dado.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import { cor, fonte, px, toque, raio, espaco } from '@/lib/melhoria/tema';
import { R } from '@/lib/melhoria/rotas';

export default function ConsentimentoPage() {
  const router   = useRouter();
  const supabase = createClient();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const [aceitaSaude, setAceitaSaude]   = useState(false);
  const [aceitaAgenda, setAceitaAgenda] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.replace(R.login()); return; }

      await supabase.rpc('ensure_my_melhoria_company');

      const { data: perfis } = await mel
        .from('perfis')
        .select('consentiu_saude_em')
        .limit(1);

      // Já consentiu: não faz sentido perguntar de novo toda vez.
      if (perfis?.[0]?.consentiu_saude_em) { router.replace(R.app()); return; }
      setCarregando(false);
    })();
  }, [supabase, mel, router]);

  async function continuar() {
    if (!aceitaSaude) return;
    setSalvando(true);
    setErro(null);

    const agora = new Date().toISOString();

    const { data: perfis } = await mel.from('perfis').select('id').limit(1);
    const perfilId = perfis?.[0]?.id;

    if (!perfilId) {
      setErro('Não consegui abrir sua conta. Tente de novo em instantes.');
      setSalvando(false);
      return;
    }

    const { error } = await mel
      .from('perfis')
      .update({
        consentiu_saude_em: agora,
        consentiu_agenda_em: aceitaAgenda ? agora : null,
      })
      .eq('id', perfilId);

    if (error) {
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      setSalvando(false);
      return;
    }

    router.replace(R.app());
  }

  if (carregando) {
    return (
      <main style={pagina}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Loader2 size={56} className="animate-spin" style={{ color: cor.destaque }} />
        </div>
      </main>
    );
  }

  return (
    <main style={pagina}>
      <div style={{ textAlign: 'center', marginBottom: espaco.lg }}>
        <Image
          src="/brands/melhoria/logo.png"
          alt=""
          width={72}
          height={72}
          style={{ borderRadius: 16 }}
        />
        <h1 style={{
          fontSize: 34, fontWeight: 800, color: cor.tinta,
          margin: `${espaco.md}px 0 0`, lineHeight: 1.2,
        }}>
          Antes de começar
        </h1>
      </div>

      <p style={{
        fontSize: px(fonte.corpo, 'grande'), color: cor.tinta,
        lineHeight: 1.5, margin: `0 0 ${espaco.lg}px`,
      }}>
        Para lembrar você dos seus remédios, precisamos guardar quais remédios
        você toma e em que horários. Pela lei brasileira, essa é uma informação
        protegida, e precisamos da sua autorização.
      </p>

      {/* ── Aceite 1: obrigatório ── */}
      <button
        type="button"
        onClick={() => setAceitaSaude((v) => !v)}
        aria-pressed={aceitaSaude}
        style={{
          ...caixaAceite,
          borderColor: aceitaSaude ? cor.destaque : cor.borda,
          background:  aceitaSaude ? cor.destaqueSuave : cor.fundo,
        }}
      >
        <span style={{ ...quadrado, background: aceitaSaude ? cor.destaque : cor.fundo,
                       borderColor: aceitaSaude ? cor.destaque : cor.bordaForte }}>
          {aceitaSaude && <Check size={30} strokeWidth={4} color="#FFFFFF" />}
        </span>
        <span>
          <strong style={{ display: 'block', fontSize: px(fonte.corpo, 'grande'), color: cor.tinta }}>
            Autorizo guardar meus remédios, consultas e exames
          </strong>
          <span style={{
            display: 'block', fontSize: px(fonte.rotulo, 'grande'),
            color: cor.tintaMuted, marginTop: 6, lineHeight: 1.45,
          }}>
            Usamos só para avisar você na hora certa e montar seu histórico.
            Nunca vendemos nem compartilhamos com plano de saúde, farmácia,
            seguradora ou banco. Você pode retirar esta autorização quando
            quiser.
          </span>
        </span>
      </button>

      {/* ── Aceite 2: opcional, desligado ── */}
      <button
        type="button"
        onClick={() => setAceitaAgenda((v) => !v)}
        aria-pressed={aceitaAgenda}
        style={{
          ...caixaAceite,
          borderColor: aceitaAgenda ? cor.destaque : cor.borda,
          background:  aceitaAgenda ? cor.destaqueSuave : cor.fundo,
        }}
      >
        <span style={{ ...quadrado, background: aceitaAgenda ? cor.destaque : cor.fundo,
                       borderColor: aceitaAgenda ? cor.destaque : cor.bordaForte }}>
          {aceitaAgenda && <Check size={30} strokeWidth={4} color="#FFFFFF" />}
        </span>
        <span>
          <strong style={{ display: 'block', fontSize: px(fonte.corpo, 'grande'), color: cor.tinta }}>
            Também quero na Agenda do Google
            <span style={{ color: cor.tintaMuted, fontWeight: 600 }}> (opcional)</span>
          </strong>
          <span style={{
            display: 'block', fontSize: px(fonte.rotulo, 'grande'),
            color: cor.tintaMuted, marginTop: 6, lineHeight: 1.45,
          }}>
            Seus compromissos aparecem também na agenda do seu celular. Atenção:
            quem tiver acesso àquela agenda vai poder ver. Por isso os remédios
            são gravados como “Hora do remédio”, sem o nome do medicamento.
          </span>
        </span>
      </button>

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: px(fonte.corpo, 'grande'),
          fontWeight: 600, margin: `0 0 ${espaco.md}px`,
        }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={continuar}
        disabled={!aceitaSaude || salvando}
        style={{
          minHeight: toque.critico, width: '100%',
          borderRadius: raio.botao, border: 'none',
          background: aceitaSaude ? cor.destaque : cor.borda,
          color: '#FFFFFF', fontSize: 28, fontWeight: 800,
          cursor: aceitaSaude ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {salvando
          ? <><Loader2 size={32} className="animate-spin" aria-hidden="true" /> Salvando...</>
          : <><ShieldCheck size={34} aria-hidden="true" /> Concordar e começar</>}
      </button>

      <p style={{
        fontSize: px(fonte.rotulo, 'grande'), color: cor.tintaMuted,
        textAlign: 'center', margin: `${espaco.lg}px 0 0`, lineHeight: 1.5,
      }}>
        Leia o{' '}
        <a href="/aviso" style={{ color: cor.destaqueTexto, fontWeight: 700 }}>
          aviso de privacidade
        </a>{' '}
        e os{' '}
        <a href="/termos" style={{ color: cor.destaqueTexto, fontWeight: 700 }}>
          termos de uso
        </a>
        .
      </p>
    </main>
  );
}

const pagina: React.CSSProperties = {
  background: cor.fundo, minHeight: '100dvh', maxWidth: 640,
  margin: '0 auto', padding: `${espaco.lg}px ${espaco.md}px ${espaco.xl}px`,
  color: cor.tinta,
};

const caixaAceite: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: espaco.md,
  width: '100%', textAlign: 'left',
  padding: espaco.md, marginBottom: espaco.md,
  borderRadius: raio.card, borderWidth: 3, borderStyle: 'solid',
  cursor: 'pointer',
};

const quadrado: React.CSSProperties = {
  flexShrink: 0, width: 44, height: 44,
  borderRadius: 10, borderWidth: 3, borderStyle: 'solid',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
