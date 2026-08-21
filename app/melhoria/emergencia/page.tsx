'use client';

// app/melhoria/emergencia/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Contatos de emergência e mensagem do botão.
//
// A formatação e a validação do telefone vêm do lib/melhoria/telefone.ts, que
// é o formatarTelefone do EnviarSmsDisplay da minhAi portado.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Phone, Check, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { melhoriaAuth, createMelhoriaClient } from '@/lib/melhoria/supabase';
import CampoComDitado from '@/components/melhoria/CampoComDitado';
import {
  formatarTelefone, validarTelefone, mensagemPanicoPadrao,
  montarSmsPanico, contarSms,
} from '@/lib/melhoria/telefone';
import { cor, toque, raio, espaco } from '@/lib/melhoria/tema';
import { Pagina, Carregando } from '@/components/melhoria/Chrome';

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  parentesco: string | null;
  ordem: number;
}

export default function EmergenciaPage() {
  const router   = useRouter();
  const supabase = melhoriaAuth();
  const mel      = createMelhoriaClient();

  const [carregando, setCarregando] = useState(true);
  const [contatos, setContatos]     = useState<Contato[]>([]);
  const [perfilId, setPerfilId]     = useState<string | null>(null);
  const [nomePerfil, setNomePerfil] = useState('');
  const [mensagem, setMensagem]     = useState('');
  const [avisos, setAvisos]         = useState<number | null>(null);

  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel]   = useState('');
  const [novoPar, setNovoPar]   = useState('');
  const [erroTel, setErroTel]   = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvouMsg, setSalvouMsg] = useState(false);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao?.user) { router.replace('/melhoria/login'); return; }

    const [{ data: perfis }, { data: lista }, { data: saldo }] = await Promise.all([
      mel.from('perfis').select('id, nome, mensagem_panico').limit(1),
      mel.from('contatos_emergencia').select('id, nome, telefone, parentesco, ordem')
         .eq('ativo', true).order('ordem', { ascending: true }),
      supabase.rpc('melhoria_avisos_disponiveis'),
    ]);

    const p = perfis?.[0];
    if (p) {
      setPerfilId(p.id);
      setNomePerfil(p.nome);
      setMensagem(p.mensagem_panico ?? '');
    }
    setContatos((lista as any) ?? []);
    const s = Array.isArray(saldo) ? saldo[0] : saldo;
    setAvisos(s?.avisos_completos ?? null);
    setCarregando(false);
  }, [supabase, mel, router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    const v = validarTelefone(novoTel);
    if (!v.valido) { setErroTel(v.erro ?? 'Telefone inválido.'); return; }
    if (novoNome.trim().length < 2) { setErroTel('Escreva o nome da pessoa.'); return; }
    if (!perfilId) return;

    setErroTel(null);
    setSalvando(true);

    const { error } = await mel.from('contatos_emergencia').insert({
      perfil_id: perfilId,
      nome: novoNome.trim(),
      telefone: v.numeros,
      parentesco: novoPar.trim() || null,
      ordem: contatos.length + 1,
    });

    if (!error) {
      setNovoNome(''); setNovoTel(''); setNovoPar('');
      await carregar();
    }
    setSalvando(false);
  }

  async function remover(id: string) {
    await mel.from('contatos_emergencia').update({ ativo: false }).eq('id', id);
    await carregar();
  }

  async function mover(id: string, direcao: -1 | 1) {
    const i = contatos.findIndex((c) => c.id === id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= contatos.length) return;

    const a = contatos[i], b = contatos[j];
    await Promise.all([
      mel.from('contatos_emergencia').update({ ordem: b.ordem }).eq('id', a.id),
      mel.from('contatos_emergencia').update({ ordem: a.ordem }).eq('id', b.id),
    ]);
    await carregar();
  }

  async function salvarMensagem() {
    if (!perfilId) return;
    setSalvando(true);
    await mel.from('perfis')
      .update({ mensagem_panico: mensagem.trim() || null })
      .eq('id', perfilId);
    setSalvouMsg(true);
    setTimeout(() => setSalvouMsg(false), 4000);
    setSalvando(false);
  }

  if (carregando) {
    return (
      <Pagina voltarPara="/melhoria">
        <Carregando />
      </Pagina>
    );
  }

  const textoFinal = montarSmsPanico(
    mensagem.trim() || mensagemPanicoPadrao(nomePerfil),
    { latitude: -23.5505, longitude: -46.6333 },
  );
  const custoPorContato = contarSms(textoFinal) * 2;

  return (
    <Pagina voltarPara="/melhoria">
      <h1 style={{ fontSize: 36, fontWeight: 800, color: cor.tinta, margin: `0 0 ${espaco.md}px`, lineHeight: 1.2 }}>
        Quem avisar se eu precisar de ajuda
      </h1>

      {/* O que o botão faz e o que NÃO faz — antes de qualquer outra coisa */}
      <p style={{
        background: cor.perigoBg, color: cor.perigoTexto,
        border: `2px solid ${cor.perigo}`, borderRadius: raio.card,
        padding: espaco.md, fontSize: 20, fontWeight: 600,
        lineHeight: 1.45, margin: `0 0 ${espaco.lg}px`,
      }}>
        O botão de ajuda avisa <strong>as pessoas que você cadastrar aqui</strong>.
        Ele <strong>não</strong> chama o SAMU (192) nem a Polícia (190). Numa
        emergência grave, ligue você mesmo para esses números.
      </p>

      {contatos.length === 0 && (
        <p style={{
          background: cor.atencaoBg, color: cor.atencaoTexto,
          border: '2px solid #D97706', borderRadius: raio.card,
          padding: espaco.md, fontSize: 21, fontWeight: 700,
          lineHeight: 1.45, margin: `0 0 ${espaco.lg}px`,
        }}>
          Você ainda não cadastrou ninguém. Se apertar o botão agora, não temos
          para quem mandar a mensagem.
        </p>
      )}

      {contatos.map((c, i) => (
        <article key={c.id} style={{
          background: cor.fundoCard, border: `2px solid ${cor.borda}`,
          borderRadius: raio.card, padding: espaco.md, marginBottom: espaco.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: espaco.sm }}>
            <span style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
              background: cor.destaque, color: '#FFFFFF',
              fontSize: 24, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {i + 1}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: cor.tinta, margin: 0, lineHeight: 1.25 }}>
                {c.nome}
                {c.parentesco && (
                  <span style={{ fontWeight: 500, color: cor.tintaMuted }}> — {c.parentesco}</span>
                )}
              </p>
              <p style={{ fontSize: 21, color: cor.tintaMuted, margin: '2px 0 0' }}>
                {formatarTelefone(c.telefone)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: espaco.xs, marginTop: espaco.sm }}>
            <BotaoIcone rotulo={`Subir ${c.nome}`} onClick={() => mover(c.id, -1)} desabilitado={i === 0}>
              <ArrowUp size={26} />
            </BotaoIcone>
            <BotaoIcone rotulo={`Descer ${c.nome}`} onClick={() => mover(c.id, 1)} desabilitado={i === contatos.length - 1}>
              <ArrowDown size={26} />
            </BotaoIcone>
            <a href={`tel:${c.telefone}`} style={{ ...estiloIcone, textDecoration: 'none', color: cor.destaqueTexto }}>
              <Phone size={26} />
            </a>
            <BotaoIcone rotulo={`Remover ${c.nome}`} onClick={() => remover(c.id)} perigo>
              <Trash2 size={26} />
            </BotaoIcone>
          </div>
        </article>
      ))}

      {/* Novo contato */}
      <section style={{
        background: cor.fundoSuave, border: `2px dashed ${cor.borda}`,
        borderRadius: raio.card, padding: espaco.md, marginTop: espaco.lg,
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.md}px` }}>
          Adicionar alguém
        </h2>

        <CampoComDitado rotulo="Nome" exemplo="João" valor={novoNome} aoMudar={setNovoNome} />
        <CampoComDitado
          rotulo="Celular com DDD"
          ajuda="Só celular. Mensagem não chega em telefone fixo."
          tipo="tel" semDitado exemplo="(11) 98765-4321"
          valor={formatarTelefone(novoTel)}
          aoMudar={(v) => { setNovoTel(v); setErroTel(null); }}
          erro={erroTel}
        />
        <CampoComDitado rotulo="Quem é essa pessoa" ajuda="Opcional." exemplo="Meu filho"
                        valor={novoPar} aoMudar={setNovoPar} />

        <button
          type="button"
          onClick={adicionar}
          disabled={salvando}
          style={{
            minHeight: toque.confortavel, width: '100%',
            borderRadius: raio.botao, border: 'none',
            background: cor.destaque, color: '#FFFFFF',
            fontSize: 23, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          <Plus size={30} strokeWidth={3} aria-hidden="true" /> Adicionar
        </button>
      </section>

      {/* Mensagem personalizada */}
      <section style={{ marginTop: espaco.xl }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: cor.tinta, margin: `0 0 ${espaco.xs}px` }}>
          O que a mensagem vai dizer
        </h2>
        <p style={{ fontSize: 19, color: cor.tintaMuted, margin: `0 0 ${espaco.md}px`, lineHeight: 1.45 }}>
          Deixe em branco para usar a mensagem padrão. Se você tem alguma
          condição de saúde importante, vale escrever aqui — numa emergência
          isso ajuda muito.
        </p>

        <CampoComDitado
          rotulo="Sua mensagem"
          exemplo={mensagemPanicoPadrao(nomePerfil)}
          multilinha valor={mensagem} aoMudar={setMensagem}
        />

        <p style={{
          background: cor.fundoCard, border: `2px solid ${cor.borda}`,
          borderRadius: raio.campo, padding: espaco.sm,
          fontSize: 18, color: cor.tintaMuted, lineHeight: 1.5, margin: `0 0 ${espaco.md}px`,
        }}>
          Vai sair assim, com sua localização no final:<br />
          <span style={{ color: cor.tinta, fontWeight: 600 }}>{textoFinal}</span>
        </p>

        <button
          type="button"
          onClick={salvarMensagem}
          disabled={salvando}
          style={{
            minHeight: toque.confortavel, width: '100%',
            borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
            background: salvouMsg ? cor.okBg : cor.fundo,
            color: salvouMsg ? cor.okTexto : cor.tinta,
            fontSize: 21, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
          }}
        >
          {salvouMsg
            ? <><Check size={28} strokeWidth={3} aria-hidden="true" /> Salvo</>
            : 'Salvar mensagem'}
        </button>
      </section>

      {/* Saldo em português claro, e para o cuidador */}
      {contatos.length > 0 && (
        <p style={{
          background: avisos === 0 ? cor.atencaoBg : cor.fundoSuave,
          color: avisos === 0 ? cor.atencaoTexto : cor.tintaMuted,
          border: `2px solid ${avisos === 0 ? '#D97706' : cor.borda}`,
          borderRadius: raio.card, padding: espaco.md,
          fontSize: 20, fontWeight: 600, lineHeight: 1.45, marginTop: espaco.xl,
        }}>
          {avisos === 0 ? (
            <>
              <AlertTriangle size={26} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Seus usos acabaram, então a <strong>mensagem de celular</strong> não
              vai sair. O aviso pelo aplicativo continua funcionando normalmente.
            </>
          ) : (
            <>
              Dá para mandar mensagem para todos os seus {contatos.length} contatos{' '}
              <strong>{avisos} {avisos === 1 ? 'vez' : 'vezes'}</strong>.
              {' '}Cada envio usa {custoPorContato} por pessoa.
            </>
          )}
        </p>
      )}
    </Pagina>
  );
}

function BotaoIcone({
  children, rotulo, onClick, desabilitado = false, perigo = false,
}: {
  children: React.ReactNode; rotulo: string;
  onClick: () => void; desabilitado?: boolean; perigo?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={desabilitado} aria-label={rotulo}
      style={{
        ...estiloIcone,
        color: perigo ? cor.perigo : cor.tinta,
        opacity: desabilitado ? 0.35 : 1,
        cursor: desabilitado ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const estiloIcone: React.CSSProperties = {
  minWidth: toque.min, minHeight: toque.min,
  borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
  background: cor.fundo,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};


