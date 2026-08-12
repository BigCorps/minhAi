'use client';

import { useState } from 'react';
import { Campo, Texto } from '../Campos';
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
            rotulo="Link do vídeo"
            dica="O vídeo aparece visível no convite, como uma seção."
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

        <p className="wz-aviso">
          Use música que você tenha o direito de usar. Você é responsável pelo
          conteúdo que enviar.
        </p>
      </fieldset>
    </>
  );
}
