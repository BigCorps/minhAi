'use client';

// app/melhoria/agenda/novo/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Cadastro de consulta ou exame. Grátis, sem crédito. Mesma estrutura de
// passos do cadastro de remédio: uma pergunta por tela.
//
// O checklist "o que levar" vem pré-marcado com o que quase todo mundo esquece
// — carteirinha, documento, exames antigos e a lista de remédios. Pré-marcar
// é melhor que lista vazia: quem não pensou no assunto sai de casa com as
// coisas certas mesmo assim.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import { cor, fonte, px, toque, raio, espaco } from '@/lib/melhoria/tema';

type Passo = 'tipo' | 'oque' | 'quando' | 'onde' | 'preparo' | 'salvando';
type Tipo  = 'consulta' | 'exame' | 'vacina' | 'retorno';

const TIPOS: { v: Tipo; r: string; a: string }[] = [
  { v: 'consulta', r: 'Consulta',  a: 'Vou ao médico' },
  { v: 'exame',    r: 'Exame',     a: 'Sangue, raio-x, ultrassom...' },
  { v: 'retorno',  r: 'Retorno',   a: 'Volta para mostrar resultado' },
  { v: 'vacina',   r: 'Vacina',    a: 'Gripe, covid, pneumonia...' },
];

const LEVAR_PADRAO = [
  'Carteirinha do plano',
  'Documento com foto',
  'Cartão do SUS',
  'Exames antigos',
  'Lista dos meus remédios',
  'Pedido do médico',
];

export default function NovoCompromissoPage() {
  const router   = useRouter();
  const supabase = createClient();
  const mel      = createMelhoriaClient();

  const [passo, setPasso] = useState<Passo>('tipo');
  const [erro, setErro]   = useState<string | null>(null);

  const [tipo, setTipo]                 = useState<Tipo>('consulta');
  const [titulo, setTitulo]             = useState('');
  const [profissional, setProfissional] = useState('');
  const [data, setData]                 = useState('');
  const [hora, setHora]                 = useState('09:00');
  const [local, setLocal]               = useState('');
  const [endereco, setEndereco]         = useState('');
  const [telefone, setTelefone]         = useState('');
  const [temJejum, setTemJejum]         = useState(false);
  const [jejumHoras, setJejumHoras]     = useState('12');
  const [preparo, setPreparo]           = useState('');
  const [levar, setLevar]               = useState<string[]>([
    'Carteirinha do plano', 'Documento com foto', 'Lista dos meus remédios',
  ]);

  async function salvar() {
    setErro(null);
    setPasso('salvando');

    try {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) { router.replace('/melhoria/login'); return; }

      const { data: perfis } = await mel.from('perfis').select('id').limit(1);
      const perfilId = perfis?.[0]?.id;
      if (!perfilId) throw new Error('perfil');

      // -03:00 explícito: sem isso o navegador interpreta no fuso do aparelho,
      // e quem viaja acaba com o compromisso na hora errada.
      const dataHora = new Date(`${data}T${hora}:00-03:00`).toISOString();

      // O trigger trg_melhoria_agendamento_alertas gera 7d/1d/3h/1h e o
      // alerta de jejum no INSERT, e enfileira o Google se houver conexão.
      const { error } = await mel.from('agendamentos').insert({
        perfil_id: perfilId,
        tipo,
        titulo: titulo.trim(),
        profissional: profissional.trim() || null,
        data_hora: dataHora,
        local: local.trim() || null,
        endereco: endereco.trim() || null,
        telefone_local: telefone.trim() || null,
        jejum_horas: temJejum ? Number(jejumHoras) : null,
        preparo: preparo.trim() || null,
        levar: levar.length ? levar : null,
        origem: 'manual',
      });

      if (error) throw error;
      router.push('/melhoria/agenda');
    } catch (e) {
      console.error(e);
      setErro('Não consegui salvar. Verifique a internet e tente de novo.');
      setPasso('preparo');
    }
  }

  const podeAvancar =
    passo === 'tipo'   ? true
  : passo === 'oque'   ? titulo.trim().length >= 2
  : passo === 'quando' ? !!data && !!hora
  : true;

  function avancar() {
    if (!podeAvancar) return;
    const ordem: Passo[] = ['tipo', 'oque', 'quando', 'onde', 'preparo'];
    const i = ordem.indexOf(passo);
    if (i === ordem.length - 1) return salvar();
    setPasso(ordem[i + 1]);
  }

  function voltar() {
    const ordem: Passo[] = ['tipo', 'oque', 'quando', 'onde', 'preparo'];
    const i = ordem.indexOf(passo);
    if (i <= 0) return router.back();
    setPasso(ordem[i - 1]);
  }

  const numero = { tipo: 1, oque: 2, quando: 3, onde: 4, preparo: 5, salvando: 5 }[passo];

  return (
    <main style={pagina}>
      <button type="button" onClick={voltar} style={btnVoltar}>
        <ArrowLeft size={30} aria-hidden="true" /> Voltar
      </button>

      <p style={{ fontSize: 18, color: cor.tintaMuted, margin: 0 }}>
        Passo {numero} de 5
      </p>

      {/* 1 — tipo */}
      {passo === 'tipo' && (
        <>
          <h1 style={titulo1}>O que você vai marcar?</h1>
          <div style={{ display: 'grid', gap: espaco.sm }}>
            {TIPOS.map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setTipo(t.v)}
                aria-pressed={tipo === t.v}
                style={{
                  minHeight: toque.confortavel, textAlign: 'left', padding: espaco.md,
                  borderRadius: raio.botao,
                  border: `3px solid ${tipo === t.v ? cor.destaque : cor.borda}`,
                  background: tipo === t.v ? cor.destaqueSuave : cor.fundo,
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'block', fontSize: 23, fontWeight: 700, color: cor.tinta }}>
                  {t.r}
                </span>
                <span style={{ display: 'block', fontSize: 19, color: cor.tintaMuted, marginTop: 4 }}>
                  {t.a}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 2 — o quê */}
      {passo === 'oque' && (
        <>
          <h1 style={titulo1}>
            {tipo === 'exame' ? 'Qual exame?' : 'Com quem é?'}
          </h1>
          <CampoComDitado
            rotulo={tipo === 'exame' ? 'Nome do exame' : 'Especialidade ou motivo'}
            ajuda="Pode ditar pelo microfone."
            exemplo={tipo === 'exame' ? 'Exame de sangue' : 'Cardiologista'}
            valor={titulo}
            aoMudar={setTitulo}
            obrigatorio
          />
          <CampoComDitado
            rotulo="Nome do médico ou do profissional"
            ajuda="Opcional."
            exemplo="Dr. Antônio"
            valor={profissional}
            aoMudar={setProfissional}
          />
        </>
      )}

      {/* 3 — quando */}
      {passo === 'quando' && (
        <>
          <h1 style={titulo1}>Que dia e que horas?</h1>
          <CampoComDitado
            rotulo="Dia" tipo="date" semDitado
            valor={data} aoMudar={setData} obrigatorio
          />
          <CampoComDitado
            rotulo="Hora" tipo="time" semDitado
            valor={hora} aoMudar={setHora} obrigatorio
          />
          <p style={{
            background: cor.destaqueSuave, color: cor.destaqueTexto,
            borderRadius: raio.campo, padding: espaco.md,
            fontSize: 19, fontWeight: 600, lineHeight: 1.45, margin: 0,
          }}>
            Vou avisar uma semana antes, um dia antes, três horas antes e uma
            hora antes.
          </p>
        </>
      )}

      {/* 4 — onde */}
      {passo === 'onde' && (
        <>
          <h1 style={titulo1}>Onde vai ser?</h1>
          <CampoComDitado
            rotulo="Nome do lugar" ajuda="Opcional, mas ajuda na hora de sair de casa."
            exemplo="Clínica São Lucas" valor={local} aoMudar={setLocal}
          />
          <CampoComDitado
            rotulo="Endereço" exemplo="Rua das Flores, 100"
            valor={endereco} aoMudar={setEndereco}
          />
          <CampoComDitado
            rotulo="Telefone do lugar"
            ajuda="Fica um botão de ligar no lembrete."
            tipo="tel" semDitado exemplo="(11) 3000-0000"
            valor={telefone} aoMudar={setTelefone}
          />
        </>
      )}

      {/* 5 — preparo */}
      {(passo === 'preparo' || passo === 'salvando') && (
        <>
          <h1 style={titulo1}>Precisa de preparo?</h1>

          <button
            type="button"
            onClick={() => setTemJejum((v) => !v)}
            aria-pressed={temJejum}
            style={{
              minHeight: toque.confortavel, width: '100%', textAlign: 'left',
              padding: espaco.md, marginBottom: espaco.md,
              borderRadius: raio.botao,
              border: `3px solid ${temJejum ? cor.destaque : cor.borda}`,
              background: temJejum ? cor.destaqueSuave : cor.fundo,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 23, fontWeight: 700, color: cor.tinta }}>
              Precisa de jejum
            </span>
          </button>

          {temJejum && (
            <>
              <CampoComDitado
                rotulo="Quantas horas de jejum?" tipo="number" semDitado
                exemplo="12" valor={jejumHoras} aoMudar={setJejumHoras}
              />
              <p style={{
                background: cor.atencaoBg, color: cor.atencaoTexto,
                borderRadius: raio.campo, padding: espaco.md,
                fontSize: 19, fontWeight: 700, lineHeight: 1.45,
                margin: `0 0 ${espaco.lg}px`,
              }}>
                Vou avisar na hora exata de parar de comer, não só na véspera.
              </p>
            </>
          )}

          <CampoComDitado
            rotulo="Outra orientação do médico"
            ajuda="Opcional. Pode ditar."
            exemplo="Beber 1 litro de água antes"
            multilinha valor={preparo} aoMudar={setPreparo}
          />

          <fieldset style={{ border: 'none', padding: 0, margin: `0 0 ${espaco.lg}px` }}>
            <legend style={{ fontSize: 23, fontWeight: 700, color: cor.tinta, padding: 0, marginBottom: espaco.xs }}>
              O que levar
            </legend>
            <div style={{ display: 'grid', gap: espaco.xs }}>
              {LEVAR_PADRAO.map((item) => {
                const marcado = levar.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setLevar(marcado ? levar.filter((x) => x !== item) : [...levar, item])
                    }
                    aria-pressed={marcado}
                    style={{
                      minHeight: toque.min, display: 'flex', alignItems: 'center',
                      gap: espaco.sm, padding: `0 ${espaco.md}px`, textAlign: 'left',
                      borderRadius: raio.botao,
                      border: `3px solid ${marcado ? cor.destaque : cor.borda}`,
                      background: marcado ? cor.destaqueSuave : cor.fundo,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 36, height: 36, borderRadius: 8,
                      border: `3px solid ${marcado ? cor.destaque : cor.bordaForte}`,
                      background: marcado ? cor.destaque : cor.fundo,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {marcado && <Check size={24} strokeWidth={4} color="#FFFFFF" />}
                    </span>
                    <span style={{ fontSize: 21, fontWeight: 600, color: cor.tinta }}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}

      {erro && (
        <p role="alert" style={{
          background: cor.perigoBg, color: cor.perigoTexto,
          border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
          padding: espaco.md, fontSize: 20, fontWeight: 600, marginBottom: espaco.md,
        }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar || passo === 'salvando'}
        style={{
          minHeight: toque.critico, width: '100%', marginTop: espaco.md,
          borderRadius: raio.botao, border: 'none',
          background: podeAvancar ? cor.destaque : cor.borda,
          color: '#FFFFFF', fontSize: 26, fontWeight: 800,
          cursor: podeAvancar ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
        }}
      >
        {passo === 'salvando'
          ? <><Loader2 size={32} className="animate-spin" aria-hidden="true" /> Salvando...</>
          : passo === 'preparo'
            ? <><Check size={34} strokeWidth={3} aria-hidden="true" /> Salvar</>
            : <>Continuar <ArrowRight size={32} aria-hidden="true" /></>}
      </button>
    </main>
  );
}

const pagina: React.CSSProperties = {
  background: cor.fundo, minHeight: '100dvh', maxWidth: 640,
  margin: '0 auto', padding: `${espaco.lg}px ${espaco.md}px ${espaco.xl}px`,
  color: cor.tinta,
};

const btnVoltar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: espaco.xs,
  minHeight: toque.min, background: 'none', border: 'none',
  color: cor.destaqueTexto, fontSize: 21, fontWeight: 700,
  cursor: 'pointer', padding: 0, marginBottom: espaco.md,
};

const titulo1: React.CSSProperties = {
  fontSize: 36, fontWeight: 800, color: cor.tinta,
  margin: `${espaco.xs}px 0 ${espaco.lg}px`, lineHeight: 1.2,
};
