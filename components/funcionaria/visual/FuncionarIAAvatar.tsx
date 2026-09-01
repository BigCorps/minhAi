'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import FuncionarIABackground from './FuncionarIABackground';
import { useFuncionarIAViseme } from './useFuncionarIAViseme';
import {
  BLINK_FRAMES,
  BLINK_TIMING,
  EXPRESSION_CAROUSEL,
  EXPRESSION_POOL,
  EXPRESSIONS,
  FUNCIONARIA_AVATAR,
  VISEMES,
  counterPath,
  expressionAssets,
  eyeFramePath,
  getLogoPlacement,
  getUniformColor,
  layerPath,
  mouthPath,
  type Expression,
} from '@/lib/funcionaria-avatar';

type Props = {
  primaryColor?: string;
  secondaryColor?: string;
  /** Id da paleta. Ignorado quando shirtColor vem preenchido. */
  uniformColorId?: string | null;
  /** Hex livre, para a cor exata da marca. */
  shirtColor?: string | null;
  trimColor?: string | null;
  companyLogoUrl?: string | null;
  /** Onde o logo aparece. Ver LOGO_PLACEMENTS. */
  logoPlacement?: string | null;
  backgroundPreset?: string;
  backgroundUrl?: string | null;
  speaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  speechText?: string | null;
  /** Balcao na frente da atendente. Ver COUNTERS. */
  counter?: string | null;
  compact?: boolean;
  className?: string;
};

/** Duracao do crossfade entre expressoes. */
const SWAP_MS = 160;

/** Registro dos elementos de olho, por slot. O loop de piscada escreve neles. */
type EyeRegistry = Map<string, (HTMLImageElement | null)[]>;

/**
 * Espera as camadas principais decodificarem antes de mostrar a figura.
 *
 * Sem isso, ao abrir a pagina o navegador entrega as imagens na ordem em que
 * elas chegam, e por uma fracao de segundo aparece a camiseta colorida sem
 * cabeca — as mascaras sao leves e chegam antes da foto. Esperar as tres
 * camadas que definem a silhueta resolve, e o custo e um fade de 240ms.
 */
function useLayersReady(sources: string[]): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let pending = sources.length;
    if (!pending) { setReady(true); return; }

    const done = () => {
      pending -= 1;
      if (pending <= 0 && alive) setReady(true);
    };

    const images = sources.map(src => {
      const image = new Image();
      // `onerror` tambem conta como concluido: um asset faltando nao pode
      // deixar a atendente invisivel para sempre.
      image.onload = done;
      image.onerror = done;
      image.src = src;
      return image;
    });

    return () => {
      alive = false;
      for (const image of images) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [sources.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return ready;
}

/**
 * Baixa o resto do pacote depois que a figura ja apareceu.
 *
 * So dois slots de expressao ficam montados agora, entao as outras duas
 * expressoes nao estao no DOM e o navegador nao tem motivo para busca-las. Sem
 * aquecer o cache, a primeira troca de expressao chegaria com a imagem ainda
 * baixando e o rosto sumiria por um quadro. Isso roda depois do `ready`, entao
 * nao disputa banda com o que aparece primeiro.
 */
function useWarmCache(active: boolean) {
  useEffect(() => {
    if (!active) return;
    // Sem cleanup. Zerar `src` para cancelar o download faz alguns
    // navegadores resolverem a string vazia contra a URL da pagina e baixarem
    // o HTML de novo. O download aqui e de imagens pequenas que serao usadas
    // de qualquer forma; deixar terminar custa menos.
    // Com o carrossel desligado so a neutra pode aparecer, e buscar as outras
    // tres seria mais de um mega que nunca vai para a tela.
    const wanted: Expression[] = EXPRESSION_CAROUSEL ? [...EXPRESSIONS] : ['neutra'];
    for (const src of wanted.flatMap(expressionAssets)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    }
  }, [active]);
}

/** Fracao da altura do cartao ocupada pelo balcao. */
const COUNTER_HEIGHT = 0.26;

/**
 * Largura do balcao em relacao ao cartao.
 *
 * Passa dos 100% de proposito: a ponta saindo dos dois lados e o que faz o
 * movel parecer continuar alem do quadro, em vez de um objeto recortado colado
 * ali. O excedente e cortado pelo contêiner.
 */
const COUNTER_WIDTH = 1.08;

export default function FuncionarIAAvatar({
  primaryColor = '#6D28D9',
  secondaryColor = '#A3E635',
  uniformColorId,
  shirtColor,
  trimColor,
  companyLogoUrl,
  logoPlacement,
  backgroundPreset = 'escritorio',
  backgroundUrl,
  speaking = false,
  audioElement = null,
  speechText = null,
  counter = 'nenhum',
  compact = false,
  className = '',
}: Props) {
  const preset = getUniformColor(uniformColorId);
  const shirt = shirtColor || preset.shirt;
  const trim = trimColor || preset.trim;

  const { viseme, level } = useFuncionarIAViseme(audioElement, speaking, speechText);

  const figure = useRef<HTMLDivElement>(null);
  useIdleMotion(figure);

  const registry = useRef<EyeRegistry>(new Map());
  const { current, incoming, fade, swapPending, onClosed } = useExpression(speaking);
  useBlink(speaking, swapPending, onClosed, registry);

  const ready = useLayersReady([
    layerPath('neutra', 'base'),
    layerPath('neutra', 'shirt-mask'),
    layerPath('neutra', 'trim-mask'),
  ]);
  useWarmCache(ready);

  const { canvas, mouthRect, badgeRect, logoChestRect, logoCenterRect } = FUNCIONARIA_AVATAR;
  const placement = getLogoPlacement(logoPlacement);
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  /*
    Dois slots, nao quatro.

    Antes as quatro expressoes ficavam montadas e a troca era por opacidade. Com
    duas camadas a meio caminho, a opacidade das duas somava e o conjunto
    clareava no meio da transicao — foi por isso que o crossfade acabou trocado
    por um corte seco, que resolvia o clareamento e criava outro problema.

    Com A e B a soma nao acontece: A fica sempre em 1 por baixo e so B sobe de 0
    a 1 por cima. A cobertura nunca cai abaixo de 100%, entao nao ha o que
    clarear, e mesmo assim a troca e continua. Quando B chega em 1, A assume o
    valor de B e B desmonta — como os dois mostram a mesma coisa nesse instante,
    a passagem nao aparece.
  */
  const slots: Array<{ key: string; expression: Expression; opacity: number }> = [
    { key: 'a', expression: current, opacity: 1 },
  ];
  if (incoming) slots.push({ key: 'b', expression: incoming, opacity: fade });

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[28px] bg-white ${
        compact ? 'min-h-[300px]' : 'min-h-[440px]'
      } ${className}`}
    >
      <FuncionarIABackground
        preset={backgroundPreset}
        backgroundUrl={backgroundUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/[.08] via-transparent to-white/[.10]" />

      {/*
        `max-w-full` junto do aspecto: a figura preenche a altura quando cabe e
        encolhe quando não cabe. Sem o limite de largura ela transbordava em
        tela estreita e o corte levava os braços.
      */}
      <div className="absolute inset-0 flex items-end justify-center">
        {/*
          O tamanho do grupo vem da propria imagem, nao de aspect-ratio.

          Antes o contêiner declarava a proporcao e a base era desenhada dentro
          dele com object-contain. Quando max-w-full entrava em acao, a
          proporcao declarada era violada e a imagem passava a ser
          letterboxada — mas os recortes de olho e boca continuavam
          posicionados em porcentagem do contêiner, nao da imagem. Bastava um
          punhado de pixels de folga para a piscada sair do lugar.

          Com a base como elemento de fluxo e w-auto, o grupo tem exatamente
          as dimensoes da imagem renderizada. Ai porcentagem do contêiner e
          porcentagem da imagem sao a mesma coisa, e nao ha como divergir.
        */}
        <div
          ref={figure}
          className="funcionaria-figure relative h-full max-w-full"
          style={{
            opacity: ready ? 1 : 0,
            transition: 'opacity 240ms ease-out',
          }}
        >
          <img
            src={layerPath('neutra', 'base')}
            alt=""
            aria-hidden
            className="pointer-events-none block h-full w-auto max-w-full select-none opacity-0"
            draggable={false}
          />

          {slots.map(slot => (
            <div
              key={slot.key}
              className="absolute inset-0"
              style={{
                opacity: slot.opacity,
                transition: slot.key === 'b' ? `opacity ${SWAP_MS}ms ease-in-out` : 'none',
              }}
            >
              <img
                src={layerPath(slot.expression, 'base')}
                alt={slot.key === 'a' ? 'Atendente virtual FuncionarIA' : ''}
                aria-hidden={slot.key !== 'a'}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
                draggable={false}
              />

              <FabricLayer color={shirt} expression={slot.expression} prefix="shirt" />
              <FabricLayer color={trim} expression={slot.expression} prefix="trim" />

              <EyeFrames
                expression={slot.expression}
                slotKey={slot.key}
                registry={registry}
              />
            </div>
          ))}

          {/*
            A boca fica FORA do bloco de expressões, sempre por cima.

            Ela foi enxertada na neutra por Poisson blending, então casa com o
            rosto neutro. Quando ela fala, a expressão é forçada para neutra
            justamente por isso — sobrepor a boca da neutra num rosto sorrindo
            deixaria duas bocas concorrendo.

            As onze ficam montadas o tempo todo, com opacidade zero. Montá-las
            só ao começar a fala fazia o navegador decodificar as imagens naquele
            instante, e no quadro entre a montagem e a aplicação do CSS todas
            apareciam de uma vez — era o retângulo de bocas sobrepostas que
            piscava no início de cada frase.
          */}
          {VISEMES.filter(key => key !== 'sil').map(key => (
            <img
              key={key}
              src={mouthPath(key)}
              alt=""
              aria-hidden
              className="pointer-events-none absolute select-none"
              style={{
                left: pct(mouthRect.left, canvas.width),
                top: pct(mouthRect.top, canvas.height),
                width: pct(mouthRect.width, canvas.width),
                height: pct(mouthRect.height, canvas.height),
                opacity: speaking && viseme === key ? 1 : 0,
                transition: 'opacity 62ms ease-out',
              }}
              draggable={false}
            />
          ))}

          {placement === 'cracha' && (
            <Badge logo={companyLogoUrl} rect={badgeRect} canvas={canvas} />
          )}

          {/*
            Logo estampado no tecido.

            `mix-blend-multiply` faz a estampa acompanhar as dobras da camiseta
            em vez de flutuar como adesivo. O custo e que logos com fundo branco
            ficam transparentes — por isso o cracha continua sendo o padrao: ele
            da o fundo que o logo talvez nao tenha.
          */}
          {companyLogoUrl && (placement === 'peito' || placement === 'centro') && (
            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                left: pct((placement === 'peito' ? logoChestRect : logoCenterRect).left, canvas.width),
                top: pct((placement === 'peito' ? logoChestRect : logoCenterRect).top, canvas.height),
                width: pct((placement === 'peito' ? logoChestRect : logoCenterRect).width, canvas.width),
                height: pct((placement === 'peito' ? logoChestRect : logoCenterRect).height, canvas.height),
                mixBlendMode: 'multiply',
                opacity: 0.92,
              }}
            >
              <img
                src={companyLogoUrl}
                alt="Logo da empresa"
                className="h-full w-full select-none object-contain"
                draggable={false}
              />
            </div>
          )}

        </div>
      </div>

      {/*
        O balcao e ancorado no cartao, com altura fixa e largura maior que ele.

        Duas tentativas anteriores erraram de lados opostos. Preso ao cartao com
        `object-cover`, ele escalava com a largura enquanto a atendente escalava
        com a altura, e no mobile virava uma pessoa grande atras de um movel
        pequeno. Movido para dentro da figura, a proporcao ficou certa mas ele
        parava antes da borda: a figura e mais estreita que o cartao, entao
        sobrava fundo dos dois lados.

        A saida e desacoplar as duas dimensoes. A altura do contêiner define
        quanto do movel aparece — a ponta, terminando abaixo do cracha. A
        largura da imagem passa do cartao de proposito, e o excedente e cortado.
        O balcao sempre chega nas bordas e a espessura visivel nao muda com o
        tamanho da tela.
      */}
      {counterPath(counter) && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: `${COUNTER_HEIGHT * 100}%` }}
        >
          <img
            src={counterPath(counter) as string}
            alt=""
            aria-hidden
            // Sem drop-shadow. A sombra projetava para CIMA do movel, sobre a
            // atendente e o fundo — era a mancha cinza que aparecia onde
            // deveria ser transparente. O balcao ja tem sombra propria na
            // imagem; a do CSS so somava sujeira.
            className="absolute left-1/2 top-0 max-w-none -translate-x-1/2 select-none"
            style={{ width: `${COUNTER_WIDTH * 100}%`, height: 'auto' }}
            draggable={false}
          />
        </div>
      )}

      {speaking && (
        <div className="absolute bottom-5 right-5 flex h-14 w-14 items-center justify-center gap-[3px] rounded-full bg-white/95 shadow-lg backdrop-blur">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="w-[4px] rounded-full"
              style={{
                backgroundColor: primaryColor,
                height: `${8 + Math.max(0.12, level) * (12 + i * 3)}px`,
                opacity: 0.72 + i * 0.06,
                transition: 'height 70ms linear',
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .funcionaria-figure {
          transform-origin: 50% 100%;
          will-change: transform;
        }
        /*
          A respiração e a oscilação são escritas por useIdleMotion, não por
          keyframes.

          Eram uma animação CSS de 5.4s. Duas razões para sair de lá: keyframes
          não somam períodos incomensuráveis, então qualquer combinação de
          movimentos volta a se repetir num ciclo curto e o olho pega o loop em
          poucos minutos; e um transform inline escrito por JS sobrescreveria
          a animação de qualquer jeito, então os dois não podiam coexistir.
        */
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Movimento de repouso
// ---------------------------------------------------------------------------

/**
 * Respiração e oscilação de postura, num único requestAnimationFrame.
 *
 * POR QUE ISTO EXISTE
 *
 * A piscada carregava sozinha o trabalho de fazer a atendente parecer viva, e é
 * a coisa mais difícil de fazer bem com o material que existe. Entre as duas
 * fotos falta a pele da pálpebra do meio do caminho: o olho aberto mostra 12px
 * de pálpebra, o fechado mostra 34px, e os 22px de diferença não estão em
 * nenhuma das duas. Todo quadro intermediário precisa inventar essa pele.
 *
 * Oscilação de postura não inventa nada. É `transform` na figura inteira —
 * cabelo, fone, ombros e rosto andam juntos, como andam de verdade. Não existe
 * borda de recorte, então não existe emenda possível.
 *
 * Com ela, a piscada deixa de ser o único sinal de vida e passa a acontecer
 * bem menos (ver gapIdleMs). O que era o defeito mais exposto da tela vira uma
 * coisa entre outras.
 *
 * POR QUE OS PERÍODOS SÃO ESTES
 *
 * São propositalmente incomensuráveis entre si — 5.4, 8.3, 5.1, 11.7, 6.9, 9.4
 * segundos. Somando senóides de períodos que não têm razão simples, o conjunto
 * só se repetiria depois de horas. Com períodos redondos, o ciclo fecha em
 * segundos e o olho pega o loop rápido; foi por isso que a respiração sozinha,
 * em keyframes de 5.4s, era percebida como mecânica.
 *
 * SOBRE A SACADA DE OLHO
 *
 * Tentei antes mover só a região dos olhos, que seria mais fiel — sacada de
 * verdade move o globo, não a postura. Montei a camada e medi: a borda de cima
 * do recorte cai na sobrancelha e no cabelo, e um deslocamento de 4px produzia
 * 104 de alteração em y216 numa escala de 255. Emenda visível. Entre a testa e
 * a sobrancelha só há uns 23px de pele lisa, e o degradê não cabe ali.
 *
 * Preferi não trocar um defeito por outro. Para fazer a sacada direito seria
 * preciso apagar a íris da base e repintar esclera por baixo, o que é inventar
 * pixel de novo — exatamente o que este caminho existe para evitar.
 */
function useIdleMotion(target: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const element = target.current;
    if (!element) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.style.transform = '';
      return;
    }

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = (now - start) / 1000;

      /*
        A respiração escala a partir do rodapé, não desloca a figura.

        Com translate, a figura subia inteira e revelava o corte na cintura — uma
        faixa vazia surgia embaixo a cada ciclo. Escalando com origem no rodapé,
        a base fica cravada e só o tórax se move, que é o que a respiração faz.
      */
      const breath = 1 + 0.0034 * (1 - Math.cos((2 * Math.PI * t) / 5.4))
                       + 0.0011 * (1 - Math.cos((2 * Math.PI * t) / 8.9));

      /*
        A rotação também gira em torno do rodapé, então o ombro quase não sai do
        lugar e a cabeça descreve um arco de uns quatro pixels. É a proporção
        certa: quem muda de apoio move a cabeça muito mais que a cintura.

        O terceiro termo, mais rápido e bem menor, existe porque só componentes
        lentos leem como deriva de imagem, não como pessoa. Ele não chega a ser
        um movimento visível sozinho; dá textura ao conjunto.

        Amplitude final medida: 0,57° de rotação, cabeça andando 8,1px de ponta
        a ponta, e no máximo 0,07px por quadro de tela — devagar o bastante para
        nunca aparecer como salto.
      */
      const rotate = 0.34 * Math.sin((2 * Math.PI * t) / 8.3)
                   + 0.18 * Math.sin((2 * Math.PI * t) / 5.1 + 1.7)
                   + 0.055 * Math.sin((2 * Math.PI * t) / 2.7 + 0.4);

      const shiftX = 0.22 * Math.sin((2 * Math.PI * t) / 11.7)
                   + 0.11 * Math.sin((2 * Math.PI * t) / 6.9 + 0.9);
      const shiftY = 0.09 * Math.sin((2 * Math.PI * t) / 9.4 + 2.3);

      element.style.transform =
        `translate(${shiftX.toFixed(4)}%, ${shiftY.toFixed(4)}%) ` +
        `rotate(${rotate.toFixed(4)}deg) ` +
        `scaleY(${breath.toFixed(5)})`;

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      element.style.transform = '';
    };
  }, [target]);
}

// ---------------------------------------------------------------------------
// Piscada
// ---------------------------------------------------------------------------

/**
 * Os seis degraus da palpebra, montados e invisiveis.
 *
 * Ficam sempre no DOM. Na versao anterior o olho fechado era montado e
 * desmontado a cada piscada, e na primeira vez o navegador ainda estava
 * decodificando a imagem quando o CSS ja pedia para exibi-la — a primeira
 * piscada saltava. E o mesmo motivo pelo qual os visemas ja ficavam montados.
 *
 * Quem escreve a opacidade e o loop de `useBlink`, direto no DOM. Passar por
 * estado do React significaria redesenhar a arvore inteira a 60 quadros por
 * segundo durante a piscada, e a piscada e curta demais para sobreviver a isso.
 */
function EyeFrames({
  expression,
  slotKey,
  registry,
}: {
  expression: Expression;
  slotKey: string;
  registry: MutableRefObject<EyeRegistry>;
}) {
  const { canvas, eyesRect } = FUNCIONARIA_AVATAR;

  useEffect(() => {
    const map = registry.current;
    return () => { map.delete(slotKey); };
  }, [registry, slotKey]);

  return (
    <>
      {Array.from({ length: BLINK_FRAMES }, (_, i) => (
        <img
          key={i}
          ref={element => {
            let frames = registry.current.get(slotKey);
            if (!frames) {
              frames = new Array(BLINK_FRAMES).fill(null);
              registry.current.set(slotKey, frames);
            }
            frames[i] = element;
          }}
          src={eyeFramePath(expression, i + 1)}
          alt=""
          aria-hidden
          className="pointer-events-none absolute select-none"
          style={{
            left: `${(eyesRect.left / canvas.width) * 100}%`,
            top: `${(eyesRect.top / canvas.height) * 100}%`,
            width: `${(eyesRect.width / canvas.width) * 100}%`,
            height: `${(eyesRect.height / canvas.height) * 100}%`,
            opacity: 0,
          }}
          draggable={false}
        />
      ))}
    </>
  );
}

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * A piscada, em um unico loop de requestAnimationFrame.
 *
 * A versao anterior era uma corrente de setTimeout — `half` por 34ms, `closed`
 * por 62, `half` por 46, aberto — com um setState em cada degrau. Tres coisas
 * saiam erradas dali:
 *
 * 1. `half` e `closed` sao a mesma imagem no pacote antigo, entao a piscada
 *    tinha dois estados de verdade. Aberto, fechado, aberto. Isso nao e uma
 *    palpebra, e um interruptor, e em cima de foto realista le como corte.
 *
 * 2. Fechava em 96ms e abria em 46. Na vida real e o contrario: fechar e
 *    rapido, abrir leva mais que o dobro. Abrir depressa demais e justamente o
 *    que faz o olho "voltar" de repente.
 *
 * 3. setTimeout nao se alinha com o quadro da tela. Com 34ms de degrau e um
 *    render do React em cada um, os degraus caiam em quadros irregulares e a
 *    piscada tremia.
 *
 * Aqui a posicao da palpebra e uma funcao do tempo decorrido, lida uma vez por
 * quadro e escrita direto na opacidade dos elementos. Entre dois degraus da
 * escada os dois aparecem misturados, o que da o borrao que a palpebra tem de
 * verdade quando se move rapido.
 */
function useBlink(
  speaking: boolean,
  swapPending: MutableRefObject<boolean>,
  onClosed: MutableRefObject<() => void>,
  registry: MutableRefObject<EyeRegistry>,
) {
  useEffect(() => {
    if (!FUNCIONARIA_AVATAR.blinkEnabled) return;
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const { closeMs, holdMs, holdSwapMs, openMs, gapSpeakingMs, gapIdleMs, doubleChance } =
      BLINK_TIMING;

    const nextGap = () => {
      const [min, max] = speaking ? gapSpeakingMs : gapIdleMs;
      return min + Math.random() * (max - min);
    };

    /**
     * Distribui a posicao da palpebra entre os degraus da escada.
     *
     * `level` vai de 0 (aberto) a 1 (fechado). Em 3,4 degraus, o terceiro
     * quadro fica com 60% e o quarto com 40%: a palpebra aparece entre duas
     * posicoes, que e o que se ve quando ela esta em movimento.
     */
    const paint = (value: number) => {
      const position = Math.min(1, Math.max(0, value)) * BLINK_FRAMES;
      const lower = Math.floor(position);
      const upper = Math.min(lower + 1, BLINK_FRAMES);
      const mix = position - lower;

      for (const frames of registry.current.values()) {
        for (let i = 1; i <= BLINK_FRAMES; i++) {
          const element = frames[i - 1];
          if (!element) continue;
          let opacity = 0;
          if (i === lower) opacity += 1 - mix;
          if (i === upper) opacity += mix;
          const next = opacity <= 0.001 ? '0' : opacity.toFixed(3);
          if (element.style.opacity !== next) element.style.opacity = next;
        }
      }
    };

    let raf = 0;
    let phase: 'wait' | 'closing' | 'held' | 'opening' = 'wait';
    let since = performance.now();
    let gap = nextGap();
    let hold = holdMs;
    let announced = false;
    let secondOfPair = false;

    const tick = (now: number) => {
      const elapsed = now - since;
      let value = 0;

      if (phase === 'wait') {
        if (elapsed >= gap) {
          phase = 'closing';
          since = now;
          // Piscada que carrega troca de expressao fica fechada por mais tempo,
          // para o crossfade caber inteiro atras da palpebra.
          hold = swapPending.current ? holdSwapMs : holdMs;
          announced = false;
        }
      } else if (phase === 'closing') {
        const k = Math.min(1, elapsed / closeMs);
        value = smoothstep(k);
        if (k >= 1) { phase = 'held'; since = now; }
      } else if (phase === 'held') {
        value = 1;
        if (!announced) { announced = true; onClosed.current(); }
        if (elapsed >= hold) { phase = 'opening'; since = now; }
      } else {
        const k = Math.min(1, elapsed / openMs);
        value = 1 - smoothstep(k);
        if (k >= 1) {
          phase = 'wait';
          since = now;
          if (!secondOfPair && Math.random() < doubleChance) {
            // Piscada dupla: a segunda vem quase colada na primeira.
            secondOfPair = true;
            gap = 90 + Math.random() * 70;
          } else {
            secondOfPair = false;
            gap = nextGap();
          }
        }
      }

      paint(value);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      paint(0);
    };
  }, [speaking, swapPending, onClosed, registry]);
}

// ---------------------------------------------------------------------------
// Expressao
// ---------------------------------------------------------------------------

/**
 * Mantém a expressão e, quando o carrossel está ligado, troca atrás da piscada.
 *
 * Hoje o carrossel está desligado (ver `EXPRESSION_CAROUSEL`), porque as quatro
 * fotos diferem em coisas que não são expressão — mesmo `neutra` e `atenta`,
 * ambas de rosto neutro, têm bocas diferentes e o microfone em posição
 * diferente. Ela fica na neutra e quem dá vida é a piscada.
 *
 * O maquinário de troca continua aqui inteiro e testado. Quando as expressões
 * forem regeradas por inpainting sobre a neutra, basta ligar a chave.
 *
 * Quando ligado: a troca espera o olho fechar, e o crossfade A/B de 160ms faz o
 * trabalho. A piscada não cobre boca, então ela não esconde a troca — ela só dá
 * o momento, porque um rosto que muda de expressão no meio de uma piscada lê
 * como natural e no meio de nada lê como glitch.
 */
function useExpression(speaking: boolean) {
  const [current, setCurrent] = useState<Expression>('neutra');
  const [incoming, setIncoming] = useState<Expression | null>(null);
  const [fade, setFade] = useState(0);

  const currentRef = useRef<Expression>('neutra');
  const pending = useRef<Expression | null>(null);
  const swapPending = useRef(false);
  const onClosed = useRef<() => void>(() => {});

  currentRef.current = current;

  onClosed.current = () => {
    const next = pending.current;
    if (!next || incoming) return;
    pending.current = null;
    swapPending.current = false;
    setIncoming(next);
  };

  /*
    O agendador depende so de `speaking`.

    Antes ele tinha a expressao atual na lista de dependencias, entao cada troca
    reiniciava o relogio e o intervalo real nunca era o sorteado. Guardando a
    expressao num ref, o efeito e montado uma vez por estado de fala.
  */
  useEffect(() => {
    if (!EXPRESSION_CAROUSEL) return;
    if (speaking) { pending.current = null; swapPending.current = false; return; }

    let alive = true;
    let timer = 0;
    const pool = EXPRESSION_POOL;

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        const options = pool.filter(item => item !== currentRef.current);
        pending.current = options[Math.floor(Math.random() * options.length)] || null;
        swapPending.current = pending.current !== null;
        schedule();
      }, 6000 + Math.random() * 9000);
    };

    schedule();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [speaking]);

  /*
    Comecar a falar volta para a neutra na hora, sem esperar piscada.

    A boca so existe enxertada na neutra. Se ela comecar a falar sorrindo,
    ficariam duas bocas concorrendo no mesmo rosto — e esperar ate a proxima
    piscada pode levar segundos. O crossfade de 160ms resolve sem corte.
  */
  useEffect(() => {
    if (!speaking) return;
    if (currentRef.current === 'neutra' || incoming === 'neutra') return;
    pending.current = null;
    swapPending.current = false;
    setIncoming('neutra');
  }, [speaking, incoming]);

  /*
    Sobe o slot B de 0 a 1 e depois entrega o valor para o A.

    Os dois requestAnimationFrame existem para o navegador chegar a pintar o
    zero antes de receber o um. Sem eles os dois valores caem no mesmo quadro,
    o navegador nao ve mudanca nenhuma e a transicao simplesmente nao roda — a
    troca volta a ser um corte.
  */
  useEffect(() => {
    if (!incoming) return;

    setFade(0);
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setFade(1));
    });

    const commit = window.setTimeout(() => {
      setCurrent(incoming);
      setIncoming(null);
      setFade(0);
    }, SWAP_MS + 40);

    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
      window.clearTimeout(commit);
    };
  }, [incoming]);

  return { current, incoming, fade, swapPending, onClosed };
}

// ---------------------------------------------------------------------------

/**
 * Tecido recolorido em três camadas: cor sólida, sombra preta, realce branco.
 *
 * A versão anterior usava `mix-blend-mode: color`, que troca matiz e saturação
 * preservando a luminância. Elegante, mas branco e preto não têm matiz nem
 * saturação — por isso as duas cores mais pedidas simplesmente não apareciam.
 *
 * Separando as dobras em sombra e realce, qualquer cor funciona: sobre branco a
 * sombra desenha o caimento, sobre preto quem desenha é o realce.
 */
function FabricLayer({
  color,
  expression,
  prefix,
}: {
  color: string;
  expression: Expression;
  prefix: 'shirt' | 'trim';
}) {
  const mask = layerPath(expression, `${prefix}-mask`);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${mask})`,
        maskImage: `url(${mask})`,
        // 100% em vez de contain: o contêiner agora tem exatamente as
        // dimensoes da imagem, entao esticar para preencher e o mesmo que
        // conter — e elimina o meio pixel de folga que o `contain` deixava.
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    >
      <img
        src={layerPath(expression, `${prefix}-shadow`)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
      <img
        src={layerPath(expression, `${prefix}-light`)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
    </div>
  );
}

/**
 * Crachá desenhado, deitado, no lado direito do peito.
 *
 * O clipe fica centralizado na borda de cima. Deslocado para a esquerda, como
 * na primeira versão, ele lia como um crachá torto em vez de um clipe preso no
 * meio do cartão.
 */
function Badge({
  logo,
  rect,
  canvas,
}: {
  logo?: string | null;
  rect: { left: number; top: number; width: number; height: number };
  canvas: { width: number; height: number };
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${(rect.left / canvas.width) * 100}%`,
        top: `${(rect.top / canvas.height) * 100}%`,
        width: `${(rect.width / canvas.width) * 100}%`,
        height: `${(rect.height / canvas.height) * 100}%`,
        transform: 'rotate(-1.2deg)',
        transformOrigin: '50% 0%',
        filter: 'drop-shadow(0 2px 5px rgba(15,23,42,.3))',
      }}
    >
      {/* clipe, encostado na borda de cima */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[2px]"
        style={{
          width: '15%',
          height: '17%',
          background: 'linear-gradient(180deg,#e8eaed 0%,#9aa0a6 55%,#c8ccd0 100%)',
        }}
      />
      {/* corpo do crachá */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center overflow-hidden rounded-[5%/8%]"
        style={{
          top: '12%',
          background: 'linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%)',
          border: '1px solid rgba(15,23,42,.16)',
        }}
      >
        {logo ? (
          <img src={logo} alt="Logo da empresa" className="h-[64%] w-[82%] object-contain" />
        ) : (
          <div className="h-[46%] w-[62%] rounded-sm bg-slate-200/70" />
        )}
      </div>
    </div>
  );
}
