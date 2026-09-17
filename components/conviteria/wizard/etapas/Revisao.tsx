'use client';

import { acharTema } from '@/lib/conviteria/temas';
import { acharFonte } from '@/lib/conviteria/fontes';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { ETAPAS, pendencias } from '@/lib/conviteria/wizard';
import { brl } from '@/lib/conviteria/precos';
import { paresParecidos, usaFotoDoCatalogo } from '@/lib/conviteria/duplicados';
import type { PropsEtapa } from '../Wizard';

/** Índice da etapa de presentes, para os atalhos "Revisar lista". */
const ETAPA_PRESENTES = ETAPAS.findIndex((e) => e.id === 'presentes');

const RECURSOS_GESTAO = [
  ['👥', 'Convidados e famílias'],
  ['💌', 'Convites para padrinhos'],
  ['🪑', 'Organização das mesas'],
  ['✅', 'Check-in com QR Code'],
  ['🗓️', 'Programação e informações'],
  ['🎨', 'Papelaria personalizada'],
] as const;

export default function Revisao({ estado, despachar, modo }: PropsEtapa) {
  const { cfg } = estado;
  const ativas = cfg.secoes.filter((s) => s.ativo).length;
  const presentes = cfg.presentesEscolhidos ?? [];
  const secaoPresentes = cfg.secoes.some((s) => s.tipo === 'presentes' && s.ativo);

  // Junta as pendencias de todas as etapas, com atalho para corrigir.
  const problemas = ETAPAS.flatMap((e, i) =>
    pendencias(estado, i).map((texto) => ({ texto, etapa: i, titulo: e.titulo }))
  );

  const duplicatas = paresParecidos(presentes);

  // Só vale sinalizar foto padrão quando a pessoa claramente estava trocando
  // as fotos. Num convite que usa o catálogo inteiro, todas são padrão — e
  // aí o aviso seria ruído puro.
  const comFotoPropria = presentes.filter((p) => !usaFotoDoCatalogo(p)).length;
  const fotoPadrao =
    comFotoPropria > 0 && comFotoPropria < presentes.length
      ? presentes.filter((p) => usaFotoDoCatalogo(p))
      : [];

  const linhas: Array<[string, string]> = [
    ['Tipo', acharTipo(cfg.tipoEventoId).nome],
    ['Nomes', cfg.anfitrioes.exibicao || '—'],
    ['Data', `${cfg.evento.dataExtenso}, ${cfg.evento.horario}`],
    ['Local', cfg.local?.nome || cfg.local?.logradouro || '—'],
    ['Tema', acharTema(cfg.temaId).nome],
    ['Fontes', acharFonte(cfg.fonteId).nome],
    ['Seções ativas', String(ativas)],
  ];

  const irParaPresentes = () =>
    despachar({ tipo: 'ir', etapa: ETAPA_PRESENTES });

  return (
    <>
      {problemas.length > 0 && (
        <div className="wz-problemas">
          <p>Antes de publicar:</p>
          <ul>
            {problemas.map((p) => (
              <li key={`${p.etapa}-${p.texto}`}>
                {p.texto}{' '}
                <button type="button" onClick={() => despachar({ tipo: 'ir', etapa: p.etapa })}>
                  Ir para {p.titulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="wz-resumo">
        {linhas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {modo !== 'editar' && (
        <section className="mt-5 rounded-2xl border border-[#d8609040] bg-[#fff7fa] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm"
              aria-hidden="true"
            >
              ✨
            </div>
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a04a63]">
                Tudo para organizar seu evento
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#40232c]">
                Seu convite vai além do convite
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#7c5560]">
                Depois de criar seu convite, o painel do evento terá ferramentas para organizar tudo em um só lugar.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RECURSOS_GESTAO.map(([icone, titulo]) => (
              <div
                key={titulo}
                className="flex items-center gap-2 rounded-xl border border-[#d8609026] bg-white px-3 py-2.5 text-sm font-semibold text-[#40232c]"
              >
                <span className="text-base" aria-hidden="true">{icone}</span>
                <span>{titulo}</span>
              </div>
            ))}
          </div>

          <p className="mb-0 mt-4 rounded-xl bg-white px-3 py-2.5 text-xs leading-5 text-[#7c5560]">
            <strong className="text-[#a04a63]">Você não precisa configurar isso agora.</strong>{' '}
            Esses recursos ficam disponíveis depois no painel do seu evento.
          </p>
        </section>
      )}

      {/* A lista de presentes não aparecia em lugar nenhum antes de publicar.
          Com 20 ou mais itens, a pessoa nunca via os escolhidos juntos — e foi
          assim que um convite real foi ao ar com dois itens duplicados, um do
          catálogo e outro criado por ela. */}
      {secaoPresentes && presentes.length > 0 && (
        <section className="wz-revisao-presentes">
          <div className="wz-revisao-topo">
            <h3>
              Presentes <span>({presentes.length})</span>
            </h3>
            <button type="button" className="wz-btn-mini" onClick={irParaPresentes}>
              Revisar lista
            </button>
          </div>

          {duplicatas.length > 0 && (
            <div className="wz-alerta">
              <p>
                {duplicatas.length === 1
                  ? 'Dois presentes parecem repetidos:'
                  : 'Alguns presentes parecem repetidos:'}
              </p>
              <ul>
                {duplicatas.map(([a, b]) => (
                  <li key={`${a.catalogoId}-${b.catalogoId}`}>
                    <strong>{a.titulo}</strong> e <strong>{b.titulo}</strong>
                  </li>
                ))}
              </ul>
              <p className="wz-alerta-acao">
                Se você criou um novo em vez de editar o original, remova o que
                sobrou.{' '}
                <button type="button" onClick={irParaPresentes}>
                  Revisar lista
                </button>
              </p>
            </div>
          )}

          {fotoPadrao.length > 0 && (
            <div className="wz-alerta wz-alerta-leve">
              <p>
                {fotoPadrao.length === 1
                  ? 'Um presente ainda está com a foto padrão:'
                  : `${fotoPadrao.length} presentes ainda estão com a foto padrão:`}
              </p>
              <ul>
                {fotoPadrao.slice(0, 6).map((p) => (
                  <li key={p.catalogoId}>{p.titulo}</li>
                ))}
                {fotoPadrao.length > 6 && <li>e mais {fotoPadrao.length - 6}…</li>}
              </ul>
            </div>
          )}

          <ul className="wz-revisao-grade">
            {presentes.map((p) => (
              <li key={p.catalogoId}>
                {p.imagemUrl ? (
                  <img src={p.imagemUrl} alt="" loading="lazy" />
                ) : (
                  <span className="wz-presente-vazio">🎁</span>
                )}
                <span className="wz-revisao-titulo">{p.titulo}</span>
                <span className="wz-revisao-valor">
                  {p.valorCentavos > 0 ? brl(p.valorCentavos) : 'Valor livre'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="wz-aviso">
        A escolha do endereço do convite e o pagamento vêm na próxima etapa.
      </p>
    </>
  );
}
