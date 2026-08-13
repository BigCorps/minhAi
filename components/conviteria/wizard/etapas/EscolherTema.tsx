'use client';

import { useState } from 'react';
import { acharTema, TEMAS } from '@/lib/conviteria/temas';
import Textura, { TEXTURAS, TEXTURA_PADRAO } from '../../Texturas';
import { acharFonte } from '@/lib/conviteria/fontes';
import { Cartoes } from '../Campos';
import { BotaoIA, useSugestao } from '../AjudaIA';
import type { PropsEtapa } from '../Wizard';

export default function EscolherTema({ estado, despachar }: PropsEtapa) {
  const ia = useSugestao<{ temaId: string; fonteId: string; porque: string }>();
  const [descricao, setDescricao] = useState('');
  const [porque, setPorque] = useState('');

  async function sugerir() {
    if (!descricao.trim()) return;
    const r = await ia.pedir({
      tipo: 'estilo',
      tipoEventoId: estado.cfg.tipoEventoId,
      contexto: descricao.trim(),
    });
    if (!r) return;
    // Sugere tema E fonte de uma vez: a combinacao e que define o resultado.
    despachar({ tipo: 'trocarTema', id: r.temaId });
    despachar({ tipo: 'trocarFonte', id: r.fonteId });
    setPorque(`${r.porque} Fonte: ${acharFonte(r.fonteId).nome}.`);
  }

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
          maxLength={160}
          placeholder="casamento de dia no campo, clima leve e rústico"
          onChange={(e) => setDescricao(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sugerir()}
        />
        <BotaoIA onClick={sugerir} carregando={ia.carregando} rotulo="Sugerir cores e fontes" />
        {ia.erro && <p className="wz-ia-erro">{ia.erro}</p>}
        {porque && <p className="wz-ia-porque">{porque}</p>}
      </div>

      <p className="wz-intro">Ou escolha a paleta na mão. A prévia atualiza na hora.</p>
      <Cartoes
        itens={TEMAS}
        selecionado={estado.cfg.temaId}
        onSelecionar={(id) => despachar({ tipo: 'trocarTema', id })}
        render={(t) => (
          <>
            <span className="wz-faixa">
              <i style={{ background: t.papel }} />
              <i style={{ background: t.acento }} />
              <i style={{ background: t.bloco }} />
              <i style={{ background: t.tinta }} />
            </span>
            <span className="wz-cartao-nome">{t.nome}</span>
          </>
        )}
      />

      {/* Textura fica aqui, e nao em etapa propria: e escolha visual da mesma
          familia da paleta, e a previa mostra as duas juntas — separar faria a
          pessoa ir e voltar para ver o efeito combinado. */}
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
              onClick={() => despachar({ tipo: 'campo', caminho: 'texturaId', valor: t.id })}
            >
              {/* Amostra recortada da textura real, nas cores do tema atual:
                  um icone genarico nao mostraria como ela fica neste convite. */}
              <span className="wz-textura-amostra" style={{ background: tema.papel }}>
                <span className="wz-textura-svg">
                  <Textura
                    texturaId={t.id}
                    cor={tema.floral.petalaEscura}
                    papel={tema.papel}
                    opacidade={0.55}
                    /* Sem `cantos`: em 34px a mascara radial nao deixaria
                       ver o desenho. */
                  />
                </span>
              </span>
              {t.nome}
            </button>
          );
        })}
      </div>

      {/* Onde a textura aparece. So tem sentido com textura escolhida. */}
      {(estado.cfg.texturaId ?? TEXTURA_PADRAO) !== 'nenhuma' && (
        <>
          <p className="wz-intro">Onde a textura aparece.</p>
          {([
            ['papel',   'No convite',   'Atrás do texto. Aparece em qualquer tela.'],
            ['externa', 'Ao redor',     'Só na área em volta do papel. No celular o papel ocupa a largura toda, então ela não aparece.'],
            ['ambas',   'Nos dois',     'Dentro e fora do papel.'],
          ] as const).map(([id, nome, dica]) => {
            const sel = (estado.cfg.texturaOnde ?? 'papel') === id;
            return (
              <label className="wz-escolha" key={id}>
                <input
                  type="radio"
                  name="texturaOnde"
                  checked={sel}
                  onChange={() => despachar({ tipo: 'campo', caminho: 'texturaOnde', valor: id })}
                />
                <span>
                  <strong>{nome}</strong>
                  <br />
                  <small style={{ opacity: 0.75 }}>{dica}</small>
                </span>
              </label>
            );
          })}
        </>
      )}
    </>
  );
}
