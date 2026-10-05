"use client";
import { useState, type FormEvent } from "react";
import { PRODUCTS, type Product } from "@/lib/sdr/catalog";
export default function Qualification({
  token,
  product,
  phoneSuffix,
}: {
  token: string;
  product: Product;
  phoneSuffix: string | null;
}) {
  const [step, setStep] = useState(0),
    [need, setNeed] = useState(""),
    [scale, setScale] = useState(""),
    [authority, setAuthority] = useState("yes"),
    [timing, setTiming] = useState("30days"),
    [whatsapp, setWhatsapp] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const p = PRODUCTS[product];
  const field =
    "mt-3 w-full rounded-xl border border-white/20 bg-slate-900 p-4 text-white";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/public/sdr/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          need,
          scale,
          authority,
          timing,
          whatsapp,
        }),
      });
      if (!r.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const target = new URL(p.url);
  target.searchParams.set("bc_ref", token);
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold text-lime-300">
          BigCorps · {p.name}
        </p>
        <h1 className="mt-4 text-3xl font-black">
          Vamos entender o que você precisa.
        </h1>
        <p className="mt-4 leading-7 text-slate-300">
          Sou o assistente comercial da BigCorps. O {p.name} oferece {p.pitch}.
          Com três respostas, podemos indicar o próximo passo.
        </p>
        {done ? (
          <section className="mt-8 rounded-2xl border border-lime-300/30 p-6">
            <h2 className="text-xl font-bold">
              Obrigado! Suas respostas foram registradas.
            </h2>
            <p className="mt-3 text-slate-300">
              Nossa equipe poderá continuar o atendimento. Você também pode
              conhecer o produto agora.
            </p>
            <a
              href={target.href}
              rel="noreferrer"
              className="mt-5 inline-block rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950"
            >
              Conhecer {p.name}
            </a>
          </section>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 rounded-2xl border border-white/10 p-6"
          >
            <p className="mb-5 text-sm text-slate-400">Etapa {step + 1} de 3</p>
            {step === 0 && (
              <label className="block font-semibold">
                Qual problema você quer resolver?
                <textarea
                  className={field}
                  minLength={8}
                  maxLength={1000}
                  required
                  rows={4}
                  value={need}
                  onChange={(e) => setNeed(e.target.value)}
                />
                {product === "melhoria" && (
                  <span className="mt-2 block text-xs font-normal text-slate-400">
                    Descreva objetivos de rotina. Não envie diagnósticos ou
                    informações médicas.
                  </span>
                )}
              </label>
            )}
            {step === 1 && (
              <>
                <label className="block font-semibold">
                  {p.question}
                  <input
                    className={field}
                    required
                    maxLength={200}
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                  />
                </label>
                <label className="mt-5 block">
                  Você participa da decisão de contratação?
                  <select
                    className={field}
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                  >
                    <option value="yes">Sim</option>
                    <option value="no">Vou apresentar a outra pessoa</option>
                  </select>
                </label>
              </>
            )}
            {step === 2 && (
              <>
                <label className="block font-semibold">
                  Quando pretende começar?
                  <select
                    className={field}
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                  >
                    <option value="now">Assim que possível</option>
                    <option value="30days">Nos próximos 30 dias</option>
                    <option value="later">Estou conhecendo as opções</option>
                  </select>
                </label>
                {phoneSuffix && (
                  <label className="mt-5 flex items-start gap-3 text-sm leading-6">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.checked)}
                    />
                    Autorizo a BigCorps a enviar informações comerciais sobre{" "}
                    {p.name} por WhatsApp ao número terminado em {phoneSuffix}.
                    Posso cancelar respondendo SAIR.
                  </label>
                )}
                <p className="mt-5 text-xs text-slate-400">
                  Usaremos suas respostas para este atendimento comercial.{" "}
                  <a href="https://minhai.app/aviso" className="underline">
                    Privacidade
                  </a>
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="mt-4 text-red-300">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  className="rounded-xl border border-white/20 px-4 py-3"
                  onClick={() => setStep(step - 1)}
                >
                  Voltar
                </button>
              )}
              <button
                disabled={busy}
                className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
              >
                {busy
                  ? "Salvando…"
                  : step === 2
                    ? "Enviar respostas"
                    : "Continuar"}
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 text-xs text-slate-500">
          <a className="underline" href={`/comercial/sair/${token}`}>
            Não desejo novos contatos
          </a>
        </p>
      </div>
    </main>
  );
}
