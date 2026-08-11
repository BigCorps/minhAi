'use client';

import { acharTipo } from '@/lib/conviteria/tiposEvento';
import { daEntradaDeData, paraEntradaDeData } from '@/lib/conviteria/wizard';
import { useState } from 'react';
import { AreaTexto, Campo, Texto } from '../Campos';
import { BotaoIA, ListaSugestoes, useSugestao } from '../AjudaIA';
import type { PropsEtapa } from '../Wizard';

/** Iniciais do monograma, a partir do nome exibido. */
function iniciaisDe(nome: string) {
  return nome
    .split(/\s+e\s+|\s*&\s*|\s+/i)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Dados({ estado, despachar }: PropsEtapa) {
  const { cfg } = estado;
  const rotulos = acharTipo(cfg.tipoEventoId).rotulos;

  const frase = useSugestao<{ opcoes: Array<{ texto: string; autor?: string }> }>();
  const conv = useSugestao<{ opcoes: string[] }>();
  const [opcoesFrase, setOpcoesFrase] = useState<Array<{ texto: string; autor?: string }>>([]);
  const [opcoesConv, setOpcoesConv] = useState<string[]>([]);

  async function sugerirFrase() {
    const r = await frase.pedir({
      tipo: 'frase',
      tipoEventoId: cfg.tipoEventoId,
      nomes: cfg.anfitrioes.exibicao,
    });
    setOpcoesFrase(r?.opcoes ?? []);
  }

  async function sugerirConvocacao() {
    const r = await conv.pedir({
      tipo: 'convocacao',
      tipoEventoId: cfg.tipoEventoId,
      nomes: cfg.anfitrioes.exibicao,
    });
    setOpcoesConv(r?.opcoes ?? []);
  }

  return (
    <>
      <Campo rotulo={rotulos.anfitrioes} dica="É o texto grande em destaque.">
        <Texto
          valor={cfg.anfitrioes.exibicao}
          placeholder="Miriam e Ithiel"
          onChange={(v) => {
            despachar({ tipo: 'campo', caminho: 'anfitrioes.exibicao', valor: v });
            // Monograma acompanha o nome enquanto o usuario nao editar a mao.
            if (!cfg.anfitrioes.iniciaisManual) {
              despachar({ tipo: 'campo', caminho: 'anfitrioes.iniciais', valor: iniciaisDe(v) });
            }
          }}
        />
      </Campo>

      <Campo rotulo="Iniciais do lacre" dica="Duas letras. Aparece no selo da capa.">
        <Texto
          valor={cfg.anfitrioes.iniciais}
          maxLength={3}
          placeholder="MI"
          onChange={(v) => {
            despachar({ tipo: 'campo', caminho: 'anfitrioes.iniciais', valor: v.toUpperCase() });
            despachar({ tipo: 'campo', caminho: 'anfitrioes.iniciaisManual', valor: true });
          }}
        />
      </Campo>

      <Campo rotulo="Frase sob os nomes">
        <Texto
          valor={cfg.evento.convocacao ?? ''}
          placeholder={rotulos.convocacao}
          onChange={(v) => despachar({ tipo: 'campo', caminho: 'evento.convocacao', valor: v })}
        />
      </Campo>
      <BotaoIA onClick={sugerirConvocacao} carregando={conv.carregando} />
      {conv.erro && <p className="wz-ia-erro">{conv.erro}</p>}
      <ListaSugestoes
        itens={opcoesConv}
        aoFechar={() => setOpcoesConv([])}
        aoEscolher={(t) => {
          despachar({ tipo: 'campo', caminho: 'evento.convocacao', valor: t });
          setOpcoesConv([]);
        }}
      />

      <Campo rotulo="Data e hora de início">
        <input
          type="datetime-local"
          className="wz-input"
          value={paraEntradaDeData(cfg.evento.dataIso)}
          onChange={(e) => {
            const d = daEntradaDeData(e.target.value);
            if (!d) return;
            despachar({ tipo: 'campo', caminho: 'evento.dataIso', valor: d.dataIso });
            despachar({ tipo: 'campo', caminho: 'evento.dataExtenso', valor: d.dataExtenso });
            despachar({ tipo: 'campo', caminho: 'evento.diaSemana', valor: d.diaSemana });
          }}
        />
      </Campo>

      <Campo rotulo="Horário como aparece no convite" dica="Ex.: das 13h às 18h">
        <Texto
          valor={cfg.evento.horario}
          placeholder="das 13h às 18h"
          onChange={(v) => despachar({ tipo: 'campo', caminho: 'evento.horario', valor: v })}
        />
      </Campo>

      <Campo rotulo="Assinatura no rodapé" dica="Opcional. Nomes completos.">
        <Texto
          valor={cfg.anfitrioes.completo ?? ''}
          placeholder="Miriam Martins & Ithiel Almeida"
          onChange={(v) => despachar({ tipo: 'campo', caminho: 'anfitrioes.completo', valor: v })}
        />
      </Campo>

      <Campo
        rotulo="Frase ou versículo"
        dica="Para quebrar a linha, dê Enter. Aparece exatamente como digitado."
      >
        <AreaTexto
          valor={cfg.textos?.frase ?? ''}
          placeholder={'As muitas águas não podem apagar o amor,\nnem os rios afogá-lo.'}
          onChange={(v) => despachar({ tipo: 'campo', caminho: 'textos.frase', valor: v })}
        />
      </Campo>
      <BotaoIA onClick={sugerirFrase} carregando={frase.carregando} rotulo="Sugerir frase com IA" />
      {frase.erro && <p className="wz-ia-erro">{frase.erro}</p>}
      <ListaSugestoes
        itens={opcoesFrase.map((o) => (o.autor ? `${o.texto} — ${o.autor}` : o.texto))}
        aoFechar={() => setOpcoesFrase([])}
        aoEscolher={(rotulo) => {
          const o = opcoesFrase.find(
            (x) => (x.autor ? `${x.texto} — ${x.autor}` : x.texto) === rotulo
          );
          if (!o) return;
          despachar({ tipo: 'campo', caminho: 'textos.frase', valor: o.texto });
          if (o.autor) {
            despachar({ tipo: 'configSecao', secao: 'frase', chave: 'autor', valor: o.autor });
          }
          setOpcoesFrase([]);
        }}
      />
    </>
  );
}
