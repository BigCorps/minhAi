'use client';

import { useState } from 'react';
import { Campo, Texto } from '../Campos';
import { ACABAMENTOS, ACABAMENTO_PADRAO } from '../../secoes/Foto';
import type { PropsEtapa } from '../Wizard';

/** Aceita url completa ou id puro do YouTube. */
function idDoYoutube(entrada: string): string {
  const t = entrada.trim();
  const m = t.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : '';
}

export default function Midia({ estado, despachar, aoEnviarArquivo }: PropsEtapa) {
  const m = estado.cfg.midia?.musica;
  const origem = m?.origem ?? 'upload';

  // O campo mostra o texto cru; o config guarda so o id de 11 caracteres.
  // Antes o `valor` do input era o proprio id extraido, entao digitar "h"
  // virava '' e o campo se apagava a cada tecla — so colar funcionava, e o
  // link colado aparecia mutilado na tela.
  const [linkVideo, setLinkVideo] = useState(
    m?.youtubeVideoId ? `https://youtu.be/${m.youtubeVideoId}` : ''
  );
  const idAtual = idDoYoutube(linkVideo);

  return (
    <>
      <Campo rotulo="Foto principal" dica="Vertical funciona melhor. Máximo 5 MB.">
        <input
          type="file"
          accept="image/*"
          className="wz-input wz-arquivo"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f || !aoEnviarArquivo) return;
            const url = await aoEnviarArquivo('foto', f);
            despachar({ tipo: 'campo', caminho: 'midia.fotoPrincipal', valor: url });
          }}
        />
      </Campo>

      {/* So aparece com foto escolhida: escolher acabamento sem imagem na tela
          e escolher no escuro. */}
      {estado.cfg.midia?.fotoPrincipal && (
        <Campo rotulo="Acabamento da foto" dica="Veja o resultado na prévia ao lado.">
          <div className="wz-acabamentos">
            {ACABAMENTOS.map((a) => {
              const sel = (estado.cfg.midia?.acabamento ?? ACABAMENTO_PADRAO) === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`wz-acabamento${sel ? ' sel' : ''}`}
                  aria-pressed={sel}
                  onClick={() => despachar({ tipo: 'campo', caminho: 'midia.acabamento', valor: a.id })}
                >
                  <span className={`wz-acab-mini wz-acab-${a.id}`} aria-hidden="true" />
                  {a.nome}
                </button>
              );
            })}
          </div>
        </Campo>
      )}
      {estado.cfg.midia?.fotoPrincipal && (
        <p className="wz-ok">Foto carregada.</p>
      )}


      <fieldset className="wz-grupo">
        <legend>Música</legend>
        <div className="wz-opcoes">
          {(['upload', 'youtube'] as const).map((o) => (
            <button
              key={o}
              type="button"
              className={`wz-opcao${origem === o ? ' sel' : ''}`}
              aria-pressed={origem === o}
              onClick={() => despachar({ tipo: 'campo', caminho: 'midia.musica.origem', valor: o })}
            >
              {o === 'upload' ? 'Enviar arquivo' : 'Vídeo do YouTube'}
            </button>
          ))}
        </div>

        {origem === 'upload' ? (
          <Campo rotulo="Arquivo MP3" dica="Máximo 8 MB. Toca em segundo plano no convite.">
            <input
              type="file"
              accept="audio/mpeg,audio/mp3"
              className="wz-input wz-arquivo"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !aoEnviarArquivo) return;
                const url = await aoEnviarArquivo('musica', f);
                despachar({ tipo: 'campo', caminho: 'midia.musica.arquivoUrl', valor: url });
              }}
            />
          </Campo>
        ) : (
          <Campo
            rotulo="Link da música no YouTube"
            dica="Toca como música de fundo, com os controles do convite."
          >
            <Texto
              valor={linkVideo}
              placeholder="https://youtu.be/..."
              maxLength={200}
              onChange={(v) => {
                setLinkVideo(v);
                despachar({ tipo: 'campo', caminho: 'midia.musica.youtubeVideoId', valor: idDoYoutube(v) });
              }}
            />
            {linkVideo.trim() !== '' && (
              idAtual
                ? <p className="wz-status ok">Vídeo reconhecido.</p>
                : <p className="wz-status erro">Não reconheci o link. Cole o endereço completo do vídeo.</p>
            )}
          </Campo>
        )}

        {origem === 'youtube' && idAtual && (
          <Campo
            rotulo="Como aparece no convite"
            dica="A maioria prefere só a música. O vídeo ocupa espaço e desvia a atenção."
          >
            <label className="wz-escolha">
              <input
                type="radio"
                name="mostrarVideo"
                checked={!m?.mostrarVideo}
                onChange={() => despachar({ tipo: 'campo', caminho: 'midia.musica.mostrarVideo', valor: false })}
              />
              <span>Só a música, com os controles do convite</span>
            </label>
            <label className="wz-escolha">
              <input
                type="radio"
                name="mostrarVideo"
                checked={!!m?.mostrarVideo}
                onChange={() => despachar({ tipo: 'campo', caminho: 'midia.musica.mostrarVideo', valor: true })}
              />
              <span>Mostrar o vídeo do YouTube</span>
            </label>
          </Campo>
        )}

        <p className="wz-aviso">
          Use música que você tenha o direito de usar. Você é responsável pelo
          conteúdo que enviar.
        </p>
      </fieldset>
    </>
  );
}
