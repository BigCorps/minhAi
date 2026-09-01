'use client';

import { rgbaFromHex } from '@/lib/funcionaria-visual';

type Props = {
  preset?: string | null;
  backgroundUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
};

/**
 * Cenários da FuncionarIA.
 *
 * Os cenários desenhados em CSS — balcão, loja, escritório vetorial — saíram.
 * Eles competiam com a atendente: a foto dela é realista e o cenário atrás era
 * geométrico, e a diferença de linguagem aparecia mais do que o cenário
 * ajudava. Fotos de escritório desfocadas resolvem isso porque não têm detalhe
 * para competir; o desfoque também dá a profundidade que faltava.
 *
 * O `marca` continua desenhado: é o único que reage às cores da empresa, e por
 * ser abstrato não sofre do mesmo problema.
 */

export const BACKGROUND_PRESETS = [
  { key: 'escritorio', label: 'Escritório', description: 'Mesa e janelas ao fundo.' },
  { key: 'corporativo', label: 'Corporativo', description: 'Andar amplo e envidraçado.' },
  { key: 'coworking', label: 'Coworking', description: 'Estações claras e plantas.' },
  { key: 'executivo', label: 'Executivo', description: 'Ambiente escuro e sóbrio.' },
  { key: 'openspace', label: 'Open space', description: 'Estações abertas e claras.' },
  { key: 'marca', label: 'Cores da marca', description: 'Acompanha as cores da empresa.' },
  { key: 'custom', label: 'Imagem própria', description: 'Envie a foto do seu espaço.' },
] as const;

/**
 * Quais chaves tem foto em public/funcionaria/backgrounds.
 *
 * Derivada de BACKGROUND_PRESETS em vez de escrita a mao: quando o `openspace`
 * foi acrescentado, esta lista ficou para tras e o preset caia no fallback das
 * cores da marca — aparecia como se a foto nao existisse, quando o arquivo
 * estava no lugar.
 */
const PHOTO_PRESETS: string[] = BACKGROUND_PRESETS
  .map(item => item.key as string)
  .filter(key => key !== 'marca' && key !== 'custom');

export default function FuncionarIABackground({
  preset = 'escritorio',
  backgroundUrl,
  primaryColor,
  secondaryColor,
}: Props) {
  if (preset === 'custom' && backgroundUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img src={backgroundUrl} alt="" className="h-full w-full object-cover" />
        <Depth />
      </div>
    );
  }

  if (preset && PHOTO_PRESETS.includes(preset)) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={`/funcionaria/backgrounds/${preset}.webp`}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          draggable={false}
        />
        <Depth />
      </div>
    );
  }

  // 'marca' e qualquer valor desconhecido
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${rgbaFromHex(secondaryColor, 0.28)}, transparent 34%), radial-gradient(circle at 80% 76%, ${rgbaFromHex(primaryColor, 0.24)}, transparent 34%), linear-gradient(145deg, #ffffff 0%, #f8fafc 55%, ${rgbaFromHex(primaryColor, 0.1)} 100%)`,
      }}
    >
      <div className="absolute left-[8%] top-[12%] h-24 w-24 rounded-full border border-white/70 bg-white/30 backdrop-blur-xl" />
      <div className="absolute bottom-[10%] right-[8%] h-40 w-40 rounded-[40px] border border-white/60 bg-white/20 backdrop-blur-xl" />
    </div>
  );
}

/**
 * Aproxima a luz da foto com a luz do cenário.
 *
 * A atendente vem de estúdio, com luz frontal chapada, e o cenário tem
 * profundidade. Um gradiente leve basta para o olho aceitar que estão no mesmo
 * lugar.
 *
 * A primeira versão tinha 28% de escurecimento mais uma segunda faixa de 22% no
 * rodapé. Somadas, elas apareciam como uma sombra cinza sobre o cenário em vez
 * de integrar a atendente — o efeito passou a ser visível por si só, que é
 * exatamente o que um ajuste de luz não deve fazer.
 */
function Depth() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/12 via-transparent to-white/8" />
    </>
  );
}
