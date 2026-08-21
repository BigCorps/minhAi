'use client';

// app/melhoria/perfil/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Meus dados. Faltava um lugar para a pessoa dizer como se chama e qual é o
// telefone dela.
//
// Uma distinção que a tela deixa explícita, porque confunde:
//
//   · O telefone AQUI é o da própria pessoa. Serve para identificá-la na
//     mensagem que a família recebe, e para contato. Nós não mandamos SMS
//     para ele.
//   · Os telefones que RECEBEM o SMS de emergência ficam em
//     "Quem avisar se eu precisar de ajuda" (/melhoria/emergencia).
//
// Sem isso a pessoa cadastra o próprio número achando que vai receber o
// aviso — e na hora da emergência ninguém é avisado.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Phone, Type, Volume2, ArrowRight } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { Pagina, Carregando } from '@/components/melhoria/Chrome';
import { formatarTelefone, validarTelefone } from '@/lib/melhoria/telefone';
import {
  cor, toque, raio, espaco, type TamanhoFonte,
} from '@/lib/melhoria/tema';

const TAMANHOS: { v: TamanhoFonte; r: string; px: number }[] = [
  { v: 'normal',  r: 'Normal',  px: 20 },
  { v: 'grande',  r: 'Grande',  px: 24 },
  { v: 'gigante', r: 'Gigante', px: 28 },
];

export default function PerfilPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [salvou, setSalvou]         = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [nome, setNome]         = useState('');
  const [telefone, setTelefone] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [tamanho, setTamanho]   = useState<TamanhoFonte>('grande');
  const [falar, setFalar]       = useState(false);
  const [email, setEmail]       = useState('');

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }
    setEmail(sessao.user.email ?? '');

    const { data } = await mel
      .from('perfis')
      .select('id, nome, telefone, data_nascimento, tamanho_fonte, falar_confirmacoes')
      .limit(1);

    const p = data?.[0];
    if (p) {
      setPerfilId(p.id);
      // "Meu perfil" é o nome provisório que a RPC cria. Não faz sentido
      // mostrar isso num campo que pede o nome da pessoa.
      setNome(p.nome === 'Meu perfil' ? '' : (p.nome ?? ''));
      setTelefone(p.telefone ?? '');
      setNascimento(p.data_nascimento ?? '');
      setTamanho((p.tamanho_fonte as TamanhoFonte) ?? 'grande');
      setFalar(!!p.falar_confirmacoes);
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

  if (carregando) {
    return <Pagina voltarPara="/melhoria" semRodape><Carregando /></Pagina>;
  }

  return (
    <Pagina voltarPara="/melhoria">
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

      {/* A confusão mais provável do aplicativo, resolvida no ponto exato onde
          ela aconteceria. */}
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
          onClick={() => router.push('/melhoria/emergencia')}
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

      {/* ── Tamanho da letra ── */}
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
              onClick={() => setTamanho(t.v)}
              aria-pressed={tamanho === t.v}
              style={{
                minHeight: toque.confortavel, textAlign: 'left',
                padding: `${espaco.sm}px ${espaco.md}px`,
                borderRadius: raio.botao,
                border: `3px solid ${tamanho === t.v ? cor.destaque : cor.borda}`,
                background: tamanho === t.v ? cor.destaqueSuave : cor.fundo,
                color: cor.tinta, cursor: 'pointer',
                // Mostra o tamanho no próprio botão: a pessoa vê o resultado
                // antes de escolher, em vez de adivinhar pelo rótulo.
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

      {/* ── Falar confirmações ── */}
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
    </Pagina>
  );
}

const titulo: React.CSSProperties = {
  fontSize: 34, fontWeight: 800, color: cor.tinta,
  margin: `0 0 ${espaco.lg}px`, lineHeight: 1.2,
};
