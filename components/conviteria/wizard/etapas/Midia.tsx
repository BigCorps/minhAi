'use client';

import { useMemo, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { Campo, Texto } from '../Campos';
import { ACABAMENTOS, ACABAMENTO_PADRAO } from '../../secoes/Foto';
import type { PropsEtapa } from '../Wizard';

function idDoYoutube(entrada: string): string {
  const t = entrada.trim();
  const m = t.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : '';
}

function unicas(valores: Array<string | undefined | null>) {
  return Array.from(new Set(valores.filter((x): x is string => Boolean(x))));
}

export default function Midia({ estado, despachar, aoEnviarArquivo }: PropsEtapa) {
  const m = estado.cfg.midia?.musica;
  const origem = m?.origem ?? 'upload';
  const [linkVideo, setLinkVideo] = useState(
    m?.youtubeVideoId ? `https://youtu.be/${m.youtubeVideoId}` : ''
  );
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  const [erroFotos, setErroFotos] = useState('');
  const idAtual = idDoYoutube(linkVideo);

  const fotos = useMemo(
    () => unicas([estado.cfg.midia?.fotoPrincipal, ...(estado.cfg.midia?.galeria ?? [])]).slice(0, 5),
    [estado.cfg.midia?.fotoPrincipal, estado.cfg.midia?.galeria],
  );

  async function adicionarFotos(arquivos: FileList | null) {
    if (!arquivos || !aoEnviarArquivo) return;
    const restantes = Math.max(0, 5 - fotos.length);
    const escolhidos = Array.from(arquivos).slice(0, restantes);
    if (!escolhidos.length) {
      setErroFotos('O convite já tem o limite de 5 fotos.');
      return;
    }

    setEnviandoFotos(true);
    setErroFotos('');
    try {
      const novas: string[] = [];
      for (const arquivo of escolhidos) {
        novas.push(await aoEnviarArquivo('foto', arquivo));
      }
      const todas = unicas([...fotos, ...novas]).slice(0, 5);
      despachar({ tipo: 'campo', caminho: 'midia.galeria', valor: todas });
      if (!estado.cfg.midia?.fotoPrincipal && todas[0]) {
        despachar({ tipo: 'campo', caminho: 'midia.fotoPrincipal', valor: todas[0] });
      }
    } catch (e: any) {
      setErroFotos(e?.message || 'Não foi possível carregar uma das fotos.');
    } finally {
      setEnviandoFotos(false);
    }
  }

  function removerFoto(url: string) {
    const restantes = fotos.filter((x) => x !== url);
    despachar({ tipo: 'campo', caminho: 'midia.galeria', valor: restantes });
    if (estado.cfg.midia?.fotoPrincipal === url) {
      despachar({ tipo: 'campo', caminho: 'midia.fotoPrincipal', valor: restantes[0] });
    }
  }

  return (
    <>
      <Campo
        rotulo="Fotos do convite"
        dica="Você pode usar até 5 fotos. Escolha uma como principal e decida na revisão se quer mostrar também a galeria."
      >
        <label className="wz-input wz-arquivo" style={{ cursor: enviandoFotos ? 'wait' : 'pointer' }}>
          <span className="inline-flex items-center gap-2">
            {enviandoFotos ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {fotos.length ? `Adicionar fotos (${fotos.length}/5)` : 'Escolher fotos'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={enviandoFotos || fotos.length >= 5}
            style={{ display: 'none' }}
            onChange={(e) => {
              void adicionarFotos(e.target.files);
              e.currentTarget.value = '';
            }}
          />
        </label>

        {fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fotos.map((url) => {
              const principal = estado.cfg.midia?.fotoPrincipal === url;
              return (
                <div key={url} className="relative overflow-hidden rounded-xl border border-[#c0607833] bg-white p-1.5">
                  <img src={url} alt="" className="h-28 w-full rounded-lg object-cover" />
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => despachar({ tipo: 'campo', caminho: 'midia.fotoPrincipal', valor: url })}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] ${principal ? 'bg-[#c06078] text-white' : 'bg-[#fff5f8] text-[#7c5560]'}`}
                    >
                      <Star className="h-3 w-3" />{principal ? 'Principal' : 'Tornar principal'}
                    </button>
                    <button type="button" onClick={() => removerFoto(url)} className="rounded-lg p-1.5 text-red-500" aria-label="Remover foto">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {erroFotos && <p className="wz-status erro">{erroFotos}</p>}
      </Campo>

      {estado.cfg.midia?.fotoPrincipal && (
        <Campo rotulo="Acabamento da foto principal" dica="Veja o resultado na prévia ao lado.">
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
          <Campo rotulo="Link da música no YouTube" dica="Toca como música de fundo, com os controles do convite.">
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
          <Campo rotulo="Como aparece no convite" dica="A maioria prefere só a música. O vídeo ocupa espaço e desvia a atenção.">
            <label className="wz-escolha">
              <input type="radio" name="mostrarVideo" checked={!m?.mostrarVideo} onChange={() => despachar({ tipo: 'campo', caminho: 'midia.musica.mostrarVideo', valor: false })} />
              <span>Só a música, com os controles do convite</span>
            </label>
            <label className="wz-escolha">
              <input type="radio" name="mostrarVideo" checked={!!m?.mostrarVideo} onChange={() => despachar({ tipo: 'campo', caminho: 'midia.musica.mostrarVideo', valor: true })} />
              <span>Mostrar o vídeo do YouTube</span>
            </label>
          </Campo>
        )}

        <p className="wz-aviso">Use música que você tenha o direito de usar. Você é responsável pelo conteúdo que enviar.</p>
      </fieldset>
    </>
  );
}
