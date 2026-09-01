'use client';

// components/melhoria/CartaoCompromisso.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Um compromisso por cartão. O que a pessoa precisa saber ANTES de sair de
// casa vem em destaque: jejum, o que levar e o telefone do local.
//
// O telefone é botão de ligar, não texto. Copiar número de tela pequena com
// dedo trêmulo é justamente o que este público não consegue fazer.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CalendarDays, Clock, MapPin, Phone, UtensilsCrossed,
  ClipboardList, Stethoscope, Syringe, FlaskConical,
} from 'lucide-react';
import {
  cor, fonte, px, toque, raio, espaco, type TamanhoFonte,
} from '@/lib/melhoria/tema';

export interface Compromisso {
  id: string;
  tipo: 'consulta' | 'exame' | 'vacina' | 'retorno';
  titulo: string;
  especialidade: string | null;
  profissional: string | null;
  local: string | null;
  endereco: string | null;
  telefone_local: string | null;
  data_hora: string;
  preparo: string | null;
  jejum_horas: number | null;
  levar: string[] | null;
  status: string;
}

const ICONE = {
  consulta: Stethoscope,
  exame:    FlaskConical,
  vacina:   Syringe,
  retorno:  Stethoscope,
} as const;

const ROTULO = {
  consulta: 'Consulta',
  exame:    'Exame',
  vacina:   'Vacina',
  retorno:  'Retorno',
} as const;

const TZ = 'America/Sao_Paulo';

export default function CartaoCompromisso({
  c, escala = 'grande',
}: {
  c: Compromisso; escala?: TamanhoFonte;
}) {
  const Icone = ICONE[c.tipo] ?? Stethoscope;
  const quando = new Date(c.data_hora);
  const agora  = new Date();

  const emDias = Math.ceil((quando.getTime() - agora.getTime()) / 86_400_000);
  const hoje   = emDias === 0 && quando > agora;
  const amanha = emDias === 1;
  const passou = quando < agora;

  const dataTexto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ,
  }).format(quando);

  const horaTexto = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(quando);

  // Hora em que o jejum começa — o dado que realmente importa, e que a pessoa
  // teria que calcular de cabeça se mostrássemos só "12 horas de jejum".
  const inicioJejum = c.jejum_horas
    ? new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ,
      }).format(new Date(quando.getTime() - c.jejum_horas * 3_600_000))
    : null;

  const destaque = hoje || amanha;

  return (
    <article style={{
      background: passou ? cor.fundoSuave : cor.fundoCard,
      border: `3px solid ${destaque ? cor.destaque : cor.borda}`,
      borderRadius: raio.card,
      padding: espaco.md,
      marginBottom: espaco.md,
      opacity: passou ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: espaco.xs, marginBottom: espaco.xs }}>
        <Icone size={28} style={{ color: cor.destaque }} aria-hidden="true" />
        <span style={{
          fontSize: px(fonte.rotulo, escala), fontWeight: 700,
          color: cor.destaqueTexto, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {ROTULO[c.tipo] ?? 'Compromisso'}
        </span>

        {hoje && <Etiqueta texto="hoje" escala={escala} />}
        {amanha && <Etiqueta texto="amanhã" escala={escala} />}
      </div>

      <h3 style={{
        fontSize: px(fonte.titulo, escala), fontWeight: 700,
        color: cor.tinta, margin: 0, lineHeight: 1.25,
      }}>
        {c.titulo}
      </h3>

      {(c.profissional || c.especialidade) && (
        <p style={{
          fontSize: px(fonte.corpo, escala), color: cor.tintaMuted,
          margin: '4px 0 0',
        }}>
          {[c.profissional, c.especialidade].filter(Boolean).join(' — ')}
        </p>
      )}

      <Linha icone={<CalendarDays size={26} />} escala={escala}>
        <span style={{ textTransform: 'capitalize' }}>{dataTexto}</span>
      </Linha>

      <Linha icone={<Clock size={26} />} escala={escala} forte>
        {horaTexto}
      </Linha>

      {(c.local || c.endereco) && (
        <Linha icone={<MapPin size={26} />} escala={escala}>
          {c.local}{c.endereco && c.local ? ' — ' : ''}{c.endereco}
        </Linha>
      )}

      {/* Jejum em destaque próprio: é a informação que estraga o exame se
          passar batido. */}
      {c.jejum_horas ? (
        <div style={{
          background: cor.atencaoBg, border: '2px solid #D97706',
          borderRadius: raio.campo, padding: espaco.sm, marginTop: espaco.md,
        }}>
          <p style={{
            display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
            fontSize: px(fonte.corpo, escala), fontWeight: 700,
            color: cor.atencaoTexto, margin: 0, lineHeight: 1.4,
          }}>
            <UtensilsCrossed size={26} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              Jejum de {c.jejum_horas} horas.
              {inicioJejum && (
                <> Pare de comer <strong style={{ textTransform: 'capitalize' }}>{inicioJejum}</strong>.</>
              )}
            </span>
          </p>
        </div>
      ) : null}

      {c.preparo && (
        <p style={{
          fontSize: px(fonte.corpo, escala), color: cor.tinta,
          margin: `${espaco.sm}px 0 0`, lineHeight: 1.4,
        }}>
          <strong>Preparo:</strong> {c.preparo}
        </p>
      )}

      {c.levar && c.levar.length > 0 && (
        <div style={{ marginTop: espaco.md }}>
          <p style={{
            display: 'flex', alignItems: 'center', gap: espaco.xs,
            fontSize: px(fonte.corpo, escala), fontWeight: 700,
            color: cor.tinta, margin: `0 0 ${espaco.xs}px`,
          }}>
            <ClipboardList size={26} style={{ color: cor.destaque }} aria-hidden="true" />
            Levar
          </p>
          <ul style={{ margin: 0, paddingLeft: 34 }}>
            {c.levar.map((item, i) => (
              <li key={i} style={{
                fontSize: px(fonte.corpo, escala), color: cor.tinta,
                lineHeight: 1.6,
              }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ligar com um toque, em vez de copiar número da tela. */}
      {c.telefone_local && (
        <a
          href={`tel:${c.telefone_local.replace(/\D/g, '')}`}
          style={{
            minHeight: toque.min, marginTop: espaco.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: espaco.xs,
            borderRadius: raio.botao, border: `2px solid ${cor.borda}`,
            background: cor.fundo, color: cor.destaqueTexto,
            fontSize: px(fonte.corpo, escala), fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <Phone size={26} aria-hidden="true" />
          Ligar para o local
        </a>
      )}
    </article>
  );
}

function Etiqueta({ texto, escala }: { texto: string; escala: TamanhoFonte }) {
  return (
    <span style={{
      background: cor.destaque, color: '#FFFFFF',
      fontSize: px(fonte.rotulo, escala) - 2, fontWeight: 800,
      padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase',
    }}>
      {texto}
    </span>
  );
}

function Linha({
  icone, children, escala, forte = false,
}: {
  icone: React.ReactNode; children: React.ReactNode;
  escala: TamanhoFonte; forte?: boolean;
}) {
  return (
    <p style={{
      display: 'flex', alignItems: 'flex-start', gap: espaco.xs,
      fontSize: px(fonte.corpo, escala),
      fontWeight: forte ? 700 : 500,
      color: cor.tinta, margin: `${espaco.sm}px 0 0`, lineHeight: 1.4,
    }}>
      <span style={{ color: cor.destaque, flexShrink: 0, display: 'flex' }} aria-hidden="true">
        {icone}
      </span>
      <span>{children}</span>
    </p>
  );
}
