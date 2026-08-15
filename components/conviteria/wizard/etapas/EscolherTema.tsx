'use client';

import { useMemo, useState } from 'react';
import {
  acharTema,
  TEMAS,
  temasRecomendados,
} from '@/lib/conviteria/temas';
import { acharTipo } from '@/lib/conviteria/tiposEvento';
import Textura, { TEXTURAS, TEXTURA_PADRAO } from '../../Texturas';
import { acharFonte } from '@/lib/conviteria/fontes';
import { Cartoes } from '../Campos';
import { BotaoIA, useSugestao } from '../AjudaIA';
import type { PropsEtapa } from '../Wizard';

const NOME_ORNAMENTO: Record<string, string> = {
  floral: 'Floral',
  classico: 'Clássico',
  geometrico: 'Geométrico',
  minimal: 'Minimalista',
  festivo: 'Festivo',
  rustico: 'Rústico',
};

function exemploDoTipo(tipoEventoId: string) {
  switch (tipoEventoId) {
    case 'aniversario-infantil':
      return 'festa infantil alegre e colorida, tons pastel';
    case 'aniversario':
      return '40 anos à noite, elegante, masculino e moderno';
    case 'debutante':
      return '15 anos glamouroso, lavanda com brilho e elegância';
    case 'formatura':
      return 'formatura elegante, preto e dourado, moderna e sofisticada';
    case 'happy-hour':
      return 'happy hour descontraído à noite, bar, grafite e âmbar';
    case 'confraternizacao':
      return 'evento da empresa moderno, profissional e clean';
    case 'vaquinha':
      return 'campanha acolhedora, positiva e confiável';
    default:
      return 'evento elegante, leve e com clima romântico';
  }
}

export default function EscolherTema({ estado, despachar }: PropsEtapa) {
  const ia = useSugestao<{
    temaId: string;
    fonteId: string;
    ornamentoId: string;
    porque: string;
  }>();

  const [descricao, setDescricao] = useState('');
  const [porque, setPorque] = useState('');
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const tipo = acharTipo(estado.cfg.tipoEventoId);

  const recomendados = useMemo(() => {
    const base = temasRecomendados(estado.cfg.tipoEventoId, 8);

    if (base.some((t) => t.id === estado.cfg.temaId)) {
      return base;
    }

    return [
      acharTema(estado.cfg.temaId),
      ...base.filter((t) => t.id !== estado.cfg.temaId),
    ].slice(0, 9);
  }, [estado.cfg.temaId, estado.cfg.tipoEventoId]);

  const idsRecomendados = new Set(recomendados.map((t) => t.id));
  const outros = TEMAS.filter((t) => !idsRecomendados.has(t.id));

  async function sugerir() {
    if (!descricao.trim()) return;

    const r = await ia.pedir({
      tipo: 'estilo',
      tipoEventoId: estado.cfg.tipoEventoId,
      contexto: descricao.trim(),
    });

    if (!r) return;

    despachar({ tipo: 'trocarTema', id: r.temaId });
    despachar({ tipo: 'trocarFonte', id: r.fonteId });
    despachar({
      tipo: 'campo',
      caminho: 'ornamentoId',
      valor: r.ornamentoId,
    });

    setPorque(
      `${r.porque} Fonte: ${acharFonte(r.fonteId).nome}. Estilo visual: ${
        NOME_ORNAMENTO[r.ornamentoId] ?? r.ornamentoId
      }.`
    );
  }

  const renderTema = (t: (typeof TEMAS)[number]) => (
    <>
      <span className="wz-faixa">
        <i style={{ background: t.papel }} />
        <i style={{ background: t.acento }} />
        <i style={{ background: t.bloco }} />
        <i style={{ background: t.tinta }} />
      </span>

      <span className="wz-cartao-nome">{t.nome}</span>

      <small
        style={{
          display: 'block',
          marginTop: 4,
          fontSize: '.66rem',
          lineHeight: 1.35,
          opacity: .72,
        }}
      >
        {t.descricao}
      </small>
    </>
  );

  return (
    <>
      <div className="wz-ia-caixa">
        <label className="wz-campo-rotulo" htmlFor="wz-desc">
          Descreva o clima do seu evento
        </label>

        <input
          id="wz-desc"
          type="text"
          className="wz-input"
          value={descricao}
          maxLength={180}
          placeholder={exemploDoTipo(estado.cfg.tipoEventoId)}
          onChange={(e) => setDescricao(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sugerir()}
        />

        <BotaoIA
          onClick={sugerir}
          carregando={ia.carregando}
          rotulo="Sugerir estilo com IA"
        />

        {ia.erro && <p className="wz-ia-erro">{ia.erro}</p>}
        {porque && <p className="wz-ia-porque">{porque}</p>}
      </div>

      <p className="wz-intro">
        Recomendados para <strong>{tipo.nome}</strong>. A IA e o tipo de evento
        agora influenciam paleta, fonte e estilo visual.
      </p>

      <Cartoes
        itens={recomendados}
        selecionado={estado.cfg.temaId}
        onSelecionar={(id) => despachar({ tipo: 'trocarTema', id })}
        render={renderTema}
      />

      {outros.length > 0 && (
        <>
          <button
            type="button"
            className="wz-btn wz-btn-fantasma"
            style={{ marginTop: '1rem', width: '100%' }}
            onClick={() => setMostrarTodas((v) => !v)}
          >
            {mostrarTodas
              ? 'Ocultar outras paletas'
              : `Ver todas as outras paletas (${outros.length})`}
          </button>

          {mostrarTodas && (
            <>
              <p className="wz-intro" style={{ marginTop: '1rem' }}>
                Outras combinações
              </p>

              <Cartoes
                itens={outros}
                selecionado={estado.cfg.temaId}
                onSelecionar={(id) => despachar({ tipo: 'trocarTema', id })}
                render={renderTema}
              />
            </>
          )}
        </>
      )}

      <p className="wz-intro">Textura de fundo do convite.</p>

      <div className="wz-texturas">
        {TEXTURAS.map((t) => {
          const sel = (estado.cfg.texturaId ?? TEXTURA_PADRAO) === t.id;
          const tema = acharTema(estado.cfg.temaId);

          return (
            <button
              key={t.id}
              type="button"
              className={`wz-textura${sel ? ' sel' : ''}`}
              aria-pressed={sel}
              onClick={() =>
                despachar({
                  tipo: 'campo',
                  caminho: 'texturaId',
                  valor: t.id,
                })
              }
            >
              <span
                className="wz-textura-amostra"
                style={{ background: tema.papel }}
              >
                <span className="wz-textura-svg">
                  <Textura
                    texturaId={t.id}
                    cor={tema.floral.petalaEscura}
                    papel={tema.papel}
                    opacidade={0.55}
                  />
                </span>
              </span>
              {t.nome}
            </button>
          );
        })}
      </div>

      {(estado.cfg.texturaId ?? TEXTURA_PADRAO) !== 'nenhuma' && (
        <>
          <p className="wz-intro">Onde a textura aparece.</p>

          {([
            ['papel', 'No convite', 'Atrás do texto. Aparece em qualquer tela.'],
            ['externa', 'Ao redor', 'Só na área em volta do papel. No celular o papel ocupa a largura toda.'],
            ['ambas', 'Nos dois', 'Dentro e fora do papel.'],
          ] as const).map(([id, nome, dica]) => {
            const sel = (estado.cfg.texturaOnde ?? 'papel') === id;

            return (
              <label className="wz-escolha" key={id}>
                <input
                  type="radio"
                  name="texturaOnde"
                  checked={sel}
                  onChange={() =>
                    despachar({
                      tipo: 'campo',
                      caminho: 'texturaOnde',
                      valor: id,
                    })
                  }
                />

                <span>
                  <strong>{nome}</strong>
                  <br />
                  <small style={{ opacity: .75 }}>{dica}</small>
                </span>
              </label>
            );
          })}
        </>
      )}
    </>
  );
}
