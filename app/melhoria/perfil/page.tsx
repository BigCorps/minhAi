'use client';

// app/melhoria/perfil/page.tsx
// Meus dados + retirada do consentimento específico de saúde.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, Loader2, Phone, Type, Volume2, ArrowRight, LogOut, Coins,
  ShieldX, AlertTriangle,
} from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { Pagina, Carregando } from '@/components/melhoria/Chrome';
import { aplicarEscala } from '@/components/melhoria/EscalaTexto';
import { R } from '@/lib/melhoria/rotas';
import { formatarTelefone, validarTelefone } from '@/lib/melhoria/telefone';
import {
  cor, toque, raio, espaco, descreverCreditos, type TamanhoFonte,
} from '@/lib/melhoria/tema';

const TAMANHOS: { v: TamanhoFonte; r: string; px: number }[] = [
  { v: 'normal', r: 'Normal', px: 20 },
  { v: 'grande', r: 'Grande', px: 24 },
  { v: 'gigante', r: 'Gigante', px: 28 },
];

const FRASE_REVOGAR = 'RETIRAR AUTORIZAÇÃO';

export default function PerfilPage() {
  const router = useRouter();
  const supabase = melhoriaAuth();
  const mel = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvou, setSalvou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [tamanho, setTamanho] = useState<TamanhoFonte>('grande');
  const [falar, setFalar] = useState(false);
  const [email, setEmail] = useState('');
  const [saldo, setSaldo] = useState<number | null>(null);
  const [saindo, setSaindo] = useState(false);

  const [consentiuSaude, setConsentiuSaude] = useState(false);
  const [confirmarRevogacao, setConfirmarRevogacao] = useState(false);
  const [textoRevogacao, setTextoRevogacao] = useState('');
  const [revogando, setRevogando] = useState(false);
  const [msgRevogacao, setMsgRevogacao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace(R.login()); return; }
    setEmail(sessao.user.email ?? '');

    supabase
      .from('user_credits')
      .select('available_credits')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }: { data: { available_credits: number } | null }) =>
        setSaldo(data?.available_credits ?? 0));

    const { data } = await mel
      .from('perfis')
      .select('id, nome, telefone, data_nascimento, tamanho_fonte, falar_confirmacoes, consentiu_saude_em')
      .limit(1);

    const p = data?.[0];
    if (p) {
      setPerfilId(p.id);
      setNome(p.nome === 'Meu perfil' ? '' : (p.nome ?? ''));
      setTelefone(p.telefone ?? '');
      setNascimento(p.data_nascimento ?? '');
      const doBanco = (p.tamanho_fonte as TamanhoFonte) ?? 'grande';
      setTamanho(doBanco);
      aplicarEscala(doBanco);
      setFalar(!!p.falar_confirmacoes);
      setConsentiuSaude(!!p.consentiu_saude_em);
    }
    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar() {
    setErro(null);

    if (nome.trim().length < 2) {
      setErro('Escreva seu nome.');
      return;
    }

    if (telefone.trim()) {
      const v = validarTelefone(telefone);
      if (!v.valido) { setErro(v.erro ?? 'Telefone inválido.'); return; }
    }

    if (!perfilId) {
      setErro('Ainda estou carregando sua conta. Tente de novo em instantes.');
      return;
    }

    setSalvando(true);

    const { error } = await mel
      .from('perfis')
      .update({
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, '') || null,
        data_nascimento: nascimento || null,
        tamanho_fonte: tamanho,
        falar_confirmacoes: falar,
        onboarding_completo: true,
      })
      .eq('id', perfilId);

    if (error) {
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      setSalvando(false);
      return;
    }

    setSalvou(true);
    setSalvando(false);
    setTimeout(() => setSalvou(false), 4000);
  }

  async function revogarConsentimento() {
    if (textoRevogacao.trim().toUpperCase() !== FRASE_REVOGAR) {
      setMsgRevogacao(`Escreva “${FRASE_REVOGAR}” para confirmar.`);
      return;
    }

    setRevogando(true);
    setMsgRevogacao(null);

    try {
      const r = await fetch('/api/melhoria/revogar-consentimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacao: FRASE_REVOGAR }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.erro ?? 'falhou');

      setConsentiuSaude(false);
      setConfirmarRevogacao(false);
      setTextoRevogacao('');
      setMsgRevogacao(
        'Autorização retirada. Seus remédios, doses, consultas, exames e documentos de saúde foram apagados do MelhorIA.'
      );
    } catch (e: any) {
      setMsgRevogacao(
        e?.message || 'Não consegui concluir agora. Tente novamente em instantes.'
      );
    } finally {
      setRevogando(false);
    }
  }

  if (carregando) {
    return <Pagina voltarPara={R.app()} semRodape><Carregando /></Pagina>;
  }

  return (
    <Pagina voltarPara={R.app()}>
      <h1 style={titulo}>Meus dados</h1>

      <CampoComDitado
        rotulo="Como você quer ser chamado"
        ajuda="É o nome que aparece quando você abre o aplicativo."
        exemplo="Maria"
        valor={nome}
        aoMudar={setNome}
        obrigatorio
      />

      <CampoComDitado
        rotulo="Seu celular"
        ajuda="Opcional. Serve para a gente saber falar com você."
        tipo="tel"
        semDitado
        exemplo="(11) 98765-4321"
        valor={formatarTelefone(telefone)}
        aoMudar={(v) => { setTelefone(v); setErro(null); }}
      />

      <div style={{
        background: cor.destaqueSuave, border: `2px solid ${cor.destaque}`,
        borderRadius: raio.card, padding: espaco.md, margin: `0 0 ${espaco.lg}px`,
      }}>
        <p style={{
          display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
          fontSize: 20, color: cor.destaqueTexto, fontWeight: 600,
          margin: `0 0 ${espaco.sm}px`, lineHeight: 1.45,
        }}>
          <Phone size={26} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Este número é <strong>o seu</strong>. Ele não recebe o aviso de
            emergência. Quem recebe são os telefones que você cadastrar em
            “Quem avisar se eu precisar de ajuda”.
          </span>
        </p>

        <button
          type="button"
          onClick={() => router.push(R.emergencia())}
          style={{
            minHeight: toque.min, width: '100%',
            borderRadius: raio.botao, border: `2px solid ${cor.destaque}`,
            background: cor.fundo, color: cor.destaqueTexto,
            fontSize: 20, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          Quem recebe o aviso de emergência
          <ArrowRight size={24} aria-hidden="true" />
        </button>
      </div>

      <CampoComDitado
        rotulo="Data de nascimento"
        ajuda="Opcional. Aparece no relatório que você leva ao médico."
        tipo="date"
        semDitado
        valor={nascimento}
        aoMudar={setNascimento}
      />

      <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${espaco.lg}px` }}>
        <legend style={{
          display: 'flex', alignItems: 'center', gap: espaco.xs,
          fontSize: 22, fontWeight: 700, color: cor.tinta,
          padding: 0, marginBottom: espaco.xs,
        }}>
          <Type size={26} style={{ color: cor.destaque }} aria-hidden="true" />
          Tamanho da letra
        </legend>

        <div style={{ display: 'grid', gap: espaco.sm }}>
          {TAMANHOS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => {
                setTamanho(t.v);
                aplicarEscala(t.v);
                if (perfilId) {
                  mel.from('perfis').update({ tamanho_fonte: t.v }).eq('id', perfilId);
                }
              }}
              aria-pressed={tamanho === t.v}
              style={{
                minHeight: toque.confortavel, textAlign: 'left',
                padding: `${espaco.sm}px ${espaco.md}px`,
                borderRadius: raio.botao,
                border: `3px solid ${tamanho === t.v ? cor.destaque : cor.borda}`,
                background: tamanho === t.v ? cor.destaqueSuave : cor.fundo,
                color: cor.tinta, cursor: 'pointer',
                fontSize: t.px, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              {t.r}
              {tamanho === t.v && <Check size={28} strokeWidth={3} style={{ color: cor.destaque }} />}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => setFalar((v) => !v)}
        aria-pressed={falar}
        style={{
          minHeight: toque.confortavel, width: '100%', textAlign: 'left',
          padding: espaco.md, marginBottom: espaco.lg,
          borderRadius: raio.card,
          border: `3px solid ${falar ? cor.destaque : cor.borda}`,
          background: falar ? cor.destaqueSuave : cor.fundo,
          cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: espaco.sm,
        }}
      >
        <Volume2 size={30} style={{ color: cor.destaque, flexShrink: 0 }} aria-hidden="true" />
        <span>
          <span style={{ display: 'block', fontSize: 22, fontWeight: 700, color: cor.tinta }}>
            Falar quando eu confirmar
          </span>
          <span style={{ display: 'block', fontSize: 19, color: cor.tintaMuted, marginTop: 4, lineHeight: 1.4 }}>
            O aplicativo diz “anotado” em voz alta ao marcar um remédio.
            {falar ? ' Está ligado.' : ' Está desligado.'}
          </span>
        </span>
      </button>

      {saldo !== null && (
        <button
          type="button"
          onClick={() => router.push(R.creditos())}
          style={{
            minHeight: toque.confortavel, width: '100%',
            marginBottom: espaco.md, padding: `${espaco.sm}px ${espaco.md}px`,
            borderRadius: raio.card,
            border: `2px solid ${saldo <= 5 ? '#D97706' : cor.borda}`,
            background: saldo <= 5 ? cor.atencaoBg : cor.fundoSuave,
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: espaco.sm,
          }}
        >
          <Coins
            size={30}
            style={{ color: saldo <= 5 ? cor.atencaoTexto : cor.destaque, flexShrink: 0 }}
            aria-hidden="true"
          />
          <span style={{ flex: 1 }}>
            <span style={{
              display: 'block', fontSize: 21, fontWeight: 700,
              color: saldo <= 5 ? cor.atencaoTexto : cor.tinta,
            }}>
              {descreverCreditos(saldo)}
            </span>
            <span style={{ display: 'block', fontSize: 18, color: cor.tintaMuted, marginTop: 2 }}>
              Usados só na câmera, na conversa com a IA e no SMS
            </span>
          </span>
          <ArrowRight size={26} style={{ color: cor.tintaMuted, flexShrink: 0 }} aria-hidden="true" />
        </button>
      )}

      <p style={{
        fontSize: 19, color: cor.tintaMuted, lineHeight: 1.5,
        margin: `0 0 ${espaco.lg}px`,
      }}>
        Sua conta: <strong style={{ color: cor.tinta }}>{email}</strong>
      </p>

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: 20, fontWeight: 600,
          lineHeight: 1.4, margin: `0 0 ${espaco.md}px`,
        }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        style={{
          minHeight: toque.critico, width: '100%',
          borderRadius: raio.botao, border: 'none',
          background: salvou ? '#16A34A' : cor.destaque,
          color: '#FFFFFF', fontSize: 24, fontWeight: 800,
          cursor: salvando ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {salvando
          ? <><Loader2 size={30} className="animate-spin" aria-hidden="true" /> Salvando...</>
          : salvou
            ? <><Check size={32} strokeWidth={3} aria-hidden="true" /> Salvo</>
            : 'Salvar'}
      </button>

      <div style={{ borderTop: `2px solid ${cor.borda}`, marginTop: espaco.xl, paddingTop: espaco.lg }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.sm}px` }}>
          Privacidade dos dados de saúde
        </h2>

        {consentiuSaude ? (
          <>
            <p style={{ fontSize: 19, color: cor.tintaMuted, lineHeight: 1.5, margin: `0 0 ${espaco.md}px` }}>
              Você pode retirar a autorização a qualquer momento. Isso apaga do MelhorIA seus remédios,
              histórico de doses, consultas, exames e documentos de saúde. Sua conta, créditos e contatos
              de emergência continuam existindo.
            </p>

            {!confirmarRevogacao ? (
              <button
                type="button"
                onClick={() => { setConfirmarRevogacao(true); setMsgRevogacao(null); }}
                style={{
                  minHeight: toque.confortavel, width: '100%',
                  borderRadius: raio.botao, border: `2px solid ${cor.perigo}`,
                  background: cor.perigoBg, color: cor.perigoTexto,
                  fontSize: 20, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
                }}
              >
                <ShieldX size={28} aria-hidden="true" /> Retirar autorização de saúde
              </button>
            ) : (
              <div style={{
                border: `2px solid ${cor.perigo}`,
                background: cor.perigoBg,
                borderRadius: raio.card,
                padding: espaco.md,
              }}>
                <p style={{
                  display: 'flex', gap: espaco.xs, alignItems: 'flex-start',
                  color: cor.perigoTexto, fontSize: 19, fontWeight: 700,
                  lineHeight: 1.45, margin: `0 0 ${espaco.md}px`,
                }}>
                  <AlertTriangle size={26} style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span>Os lembretes de remédio e de consultas vão parar. Esta exclusão dos dados de saúde não tem volta.</span>
                </p>
                <label htmlFor="revogar-saude" style={{ display: 'block', fontSize: 18, fontWeight: 700, color: cor.tinta, marginBottom: 6 }}>
                  Para confirmar, escreva: {FRASE_REVOGAR}
                </label>
                <input
                  id="revogar-saude"
                  value={textoRevogacao}
                  onChange={(e) => setTextoRevogacao(e.target.value)}
                  autoComplete="off"
                  style={{
                    minHeight: toque.min, width: '100%', padding: `0 ${espaco.sm}px`,
                    borderRadius: raio.campo, border: `2px solid ${cor.bordaForte}`,
                    background: cor.fundo, color: cor.tinta, fontSize: 20,
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: espaco.sm, marginTop: espaco.md }}>
                  <button
                    type="button"
                    onClick={() => { setConfirmarRevogacao(false); setTextoRevogacao(''); setMsgRevogacao(null); }}
                    disabled={revogando}
                    style={{
                      minHeight: toque.min, borderRadius: raio.botao,
                      border: `2px solid ${cor.borda}`, background: cor.fundo,
                      color: cor.tinta, fontSize: 19, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={revogarConsentimento}
                    disabled={revogando}
                    style={{
                      minHeight: toque.min, borderRadius: raio.botao,
                      border: 'none', background: cor.perigo,
                      color: '#FFFFFF', fontSize: 19, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    {revogando ? 'Apagando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{
            background: cor.destaqueSuave, color: cor.destaqueTexto,
            borderRadius: raio.card, padding: espaco.md,
            fontSize: 19, fontWeight: 600, lineHeight: 1.45,
          }}>
            A autorização para guardar dados de saúde está desativada. Para voltar a usar
            lembretes e histórico, entre em “Meu dia” e autorize novamente.
          </p>
        )}

        {msgRevogacao && (
          <p role="status" style={{
            marginTop: espaco.md, padding: espaco.md,
            borderRadius: raio.card, background: consentiuSaude ? cor.atencaoBg : cor.destaqueSuave,
            color: consentiuSaude ? cor.atencaoTexto : cor.destaqueTexto,
            fontSize: 19, fontWeight: 700, lineHeight: 1.45,
          }}>
            {msgRevogacao}
          </p>
        )}
      </div>

      <div style={{ borderTop: `2px solid ${cor.borda}`, marginTop: espaco.xl, paddingTop: espaco.lg }}>
        <button
          type="button"
          onClick={async () => {
            setSaindo(true);
            await supabase.auth.signOut();
            router.replace(R.landing());
          }}
          disabled={saindo}
          style={{
            minHeight: toque.confortavel, width: '100%',
            borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
            background: cor.fundo, color: cor.perigoTexto,
            fontSize: 21, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          {saindo
            ? <><Loader2 size={28} className="animate-spin" aria-hidden="true" /> Saindo...</>
            : <><LogOut size={28} aria-hidden="true" /> Sair da minha conta</>}
        </button>
      </div>
    </Pagina>
  );
}

const titulo: React.CSSProperties = {
  fontSize: 34, fontWeight: 800, color: cor.tinta,
  margin: `0 0 ${espaco.lg}px`, lineHeight: 1.2,
};
