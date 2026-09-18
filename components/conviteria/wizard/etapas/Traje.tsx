'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { AreaTexto, Campo, Texto } from '../Campos';
import type { PropsEtapa } from '../Wizard';

const TEXTO_PADRAO = 'Para tornar este momento ainda mais especial, sugerimos trajes elegantes e confortáveis para aproveitar toda a celebração.';

export default function Traje({ estado, despachar, aoEnviarArquivo }: PropsEtapa) {
  const dress = estado.cfg.dressCode ?? {};
  const imagens = Array.from(new Set(dress.imagens ?? [])).slice(0, 5);
  const secao = estado.cfg.secoes.find((s) => s.tipo === 'dresscode');
  const ativo = !!secao?.ativo;
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  function campo(chave: string, valor: unknown) {
    despachar({ tipo: 'campo', caminho: `dressCode.${chave}`, valor });
  }

  async function adicionar(arquivos: FileList | null) {
    if (!arquivos || !aoEnviarArquivo) return;
    const restantes = Math.max(0, 5 - imagens.length);
    const escolhidos = Array.from(arquivos).slice(0, restantes);
    if (!escolhidos.length) {
      setErro('Você já adicionou o limite de 5 imagens de referência.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const novas: string[] = [];
      for (const arquivo of escolhidos) novas.push(await aoEnviarArquivo('foto', arquivo));
      campo('imagens', Array.from(new Set([...imagens, ...novas])).slice(0, 5));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar uma das imagens.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="wz-intro">
        O traje agora tem uma seção própria no convite. Use referências visuais para deixar a orientação clara sem misturá-la às informações gerais.
      </p>

      <label className="wz-escolha" style={{ marginBottom: 18 }}>
        <input
          type="checkbox"
          checked={ativo}
          onChange={() => despachar({ tipo: 'alternarSecao', secao: 'dresscode' })}
        />
        <span>Mostrar a seção Traje / Dress Code no convite</span>
      </label>

      <Campo rotulo="Título da seção" dica="Ex.: Dress Code, Traje, Como se vestir.">
        <Texto valor={dress.titulo ?? ''} placeholder="Dress Code" maxLength={80} onChange={(v) => campo('titulo', v)} />
      </Campo>

      <Campo rotulo="Tipo de traje" dica="Ex.: Esporte fino, Passeio completo, Social.">
        <Texto valor={dress.tipo ?? ''} placeholder="Esporte fino" maxLength={100} onChange={(v) => campo('tipo', v)} />
      </Campo>

      <Campo rotulo="Subtítulo opcional">
        <Texto valor={dress.subtitulo ?? ''} placeholder="Uma orientação para nossos convidados" maxLength={160} onChange={(v) => campo('subtitulo', v)} />
      </Campo>

      <Campo rotulo="Orientação" dica="Este texto padrão já aparece no convite. Altere somente se quiser personalizar.">
        <AreaTexto valor={dress.texto ?? TEXTO_PADRAO} placeholder={TEXTO_PADRAO} linhas={4} maxLength={700} onChange={(v) => campo('texto', v)} />
      </Campo>

      <Campo rotulo="O que evitar" dica="Opcional. Ex.: branco, off-white, jeans, tons reservados aos anfitriões.">
        <AreaTexto valor={dress.evitar ?? ''} placeholder="Pedimos que sejam evitados branco, off-white e tons muito claros." linhas={3} maxLength={500} onChange={(v) => campo('evitar', v)} />
      </Campo>

      <Campo rotulo="Imagens de referência" dica="Até 5 imagens. JPG, PNG, WebP ou HEIC conforme suporte do aparelho.">
        <label className="wz-input wz-arquivo" style={{ cursor: enviando ? 'wait' : 'pointer' }}>
          <span className="inline-flex items-center gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {imagens.length ? `Adicionar imagens (${imagens.length}/5)` : 'Adicionar referência'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={enviando || imagens.length >= 5}
            style={{ display: 'none' }}
            onChange={(e) => {
              void adicionar(e.target.files);
              e.currentTarget.value = '';
            }}
          />
        </label>

        {imagens.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {imagens.map((url) => (
              <div key={url} className="relative overflow-hidden rounded-xl border border-[#c0607833] bg-white p-1.5">
                <img src={url} alt="Referência de traje" className="h-32 w-full rounded-lg bg-[#fff9fb] object-contain" />
                <button
                  type="button"
                  onClick={() => campo('imagens', imagens.filter((x) => x !== url))}
                  className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-red-500 shadow"
                  aria-label="Remover imagem"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {erro && <p className="wz-status erro">{erro}</p>}
      </Campo>

      <p className="wz-aviso">
        Se você não quiser informar traje, desligue a seção acima. O botão “Traje” também desaparecerá automaticamente dos atalhos do convite.
      </p>
    </>
  );
}
