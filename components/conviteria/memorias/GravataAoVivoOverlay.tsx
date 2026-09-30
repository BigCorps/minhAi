'use client';

import { Heart, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

export type ContribuicaoAoVivo = {
  id: string;
  nome: string;
  valorCentavos: number | null;
  pagoEm: string;
  nomeAcao: string;
  totalCentavos: number | null;
  metaCentavos: number | null;
  percentualMeta: number | null;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const PARTICULAS = [
  ['8%', '82%', '-18deg', '0ms'],
  ['15%', '21%', '12deg', '180ms'],
  ['24%', '68%', '-8deg', '520ms'],
  ['34%', '14%', '20deg', '320ms'],
  ['45%', '80%', '-15deg', '740ms'],
  ['57%', '18%', '9deg', '610ms'],
  ['67%', '72%', '-24deg', '240ms'],
  ['76%', '25%', '18deg', '820ms'],
  ['86%', '76%', '-9deg', '450ms'],
  ['91%', '38%', '14deg', '100ms'],
] as const;

export default function GravataAoVivoOverlay({
  contribuicao,
  orientacao,
  onConcluir,
  duracaoMs = 7000,
}: {
  contribuicao: ContribuicaoAoVivo;
  orientacao: 'horizontal' | 'vertical';
  onConcluir: () => void;
  duracaoMs?: number;
}) {
  useEffect(() => {
    const id = window.setTimeout(onConcluir, duracaoMs);
    return () => window.clearTimeout(id);
  }, [duracaoMs, onConcluir, contribuicao.id]);

  const vertical = orientacao === 'vertical';
  const temProgresso =
    contribuicao.totalCentavos != null &&
    contribuicao.metaCentavos != null &&
    contribuicao.metaCentavos > 0;

  return (
    <div className="gravata-overlay absolute inset-0 z-50 grid place-items-center overflow-hidden bg-black/55 px-5 text-white backdrop-blur-md">
      <div className="gravata-orbe gravata-orbe-a" />
      <div className="gravata-orbe gravata-orbe-b" />

      {PARTICULAS.map(([left, top, rotacao, atraso], i) => (
        <span
          key={i}
          className="gravata-particula absolute text-white/75"
          style={{ left, top, transform: `rotate(${rotacao})`, animationDelay: atraso }}
          aria-hidden="true"
        >
          {i % 3 === 0 ? <Sparkles className="h-5 w-5" /> : <Heart className="h-4 w-4 fill-current" />}
        </span>
      ))}

      <div
        className={`gravata-card relative z-10 w-full border border-white/25 bg-[#2a111b]/88 text-center shadow-2xl backdrop-blur-xl ${
          vertical ? 'max-w-[88%] rounded-[2.2rem] px-6 py-10' : 'max-w-3xl rounded-[2.6rem] px-10 py-9'
        }`}
      >
        <div className="gravata-icone mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/30 bg-white/10 shadow-lg">
          <Heart className="h-9 w-9 fill-white text-white" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[.24em] text-[#ffd8e3]">
          {contribuicao.nomeAcao}
        </p>
        <h2 className={`${vertical ? 'mt-3 text-4xl' : 'mt-3 text-5xl'} font-semibold leading-tight`}>
          {contribuicao.nome} participou!
        </h2>
        <p className={`${vertical ? 'mt-4 text-base' : 'mt-4 text-lg'} text-white/75`}>
          Obrigado por fazer parte deste momento ❤️
        </p>

        {contribuicao.valorCentavos != null && (
          <div className="gravata-valor mx-auto mt-6 w-fit rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-lg font-semibold">
            {brl(contribuicao.valorCentavos)}
          </div>
        )}

        {contribuicao.totalCentavos != null && (
          <div className="mx-auto mt-7 max-w-lg rounded-2xl bg-black/18 px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-4 text-xs text-white/70">
              <span>Total até agora</span>
              <strong className="text-sm text-white">{brl(contribuicao.totalCentavos)}</strong>
            </div>
            {temProgresso && (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="gravata-progresso h-full rounded-full bg-white"
                    style={{ width: `${Math.min(100, Math.max(0, contribuicao.percentualMeta ?? 0))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-white/60">
                  <span>{Math.round(contribuicao.percentualMeta ?? 0)}% da meta</span>
                  <span>Meta {brl(contribuicao.metaCentavos!)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .gravata-overlay { animation: gravata-fundo-in .45s ease-out both; }
        .gravata-card { animation: gravata-card-in .72s cubic-bezier(.2,.85,.2,1) both; }
        .gravata-icone { animation: gravata-coracao 1.6s ease-in-out infinite; }
        .gravata-valor { animation: gravata-valor-in .55s .55s ease-out both; }
        .gravata-progresso { transition: width 900ms cubic-bezier(.2,.85,.2,1); }
        .gravata-orbe { position:absolute; width:42vw; height:42vw; min-width:360px; min-height:360px; border-radius:9999px; filter:blur(50px); opacity:.22; pointer-events:none; }
        .gravata-orbe-a { background:#db6d91; top:-18%; left:-12%; animation: gravata-orbe-a 5s ease-in-out infinite alternate; }
        .gravata-orbe-b { background:#7b4bce; right:-14%; bottom:-20%; animation: gravata-orbe-b 5.8s ease-in-out infinite alternate; }
        .gravata-particula { animation: gravata-particula 2.8s ease-in-out infinite alternate; }
        @keyframes gravata-fundo-in { from { opacity:0; } to { opacity:1; } }
        @keyframes gravata-card-in { from { opacity:0; transform:translateY(30px) scale(.94); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes gravata-valor-in { from { opacity:0; transform:scale(.82); } to { opacity:1; transform:scale(1); } }
        @keyframes gravata-coracao { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
        @keyframes gravata-particula { from { opacity:.25; transform:translateY(8px) scale(.82); } to { opacity:.9; transform:translateY(-12px) scale(1.12); } }
        @keyframes gravata-orbe-a { from { transform:translate(0,0) scale(.9); } to { transform:translate(9vw,5vh) scale(1.12); } }
        @keyframes gravata-orbe-b { from { transform:translate(0,0) scale(1); } to { transform:translate(-8vw,-5vh) scale(.88); } }
        @media (prefers-reduced-motion: reduce) {
          .gravata-overlay,.gravata-card,.gravata-icone,.gravata-valor,.gravata-orbe,.gravata-particula { animation:none !important; }
        }
      `}</style>
    </div>
  );
}
