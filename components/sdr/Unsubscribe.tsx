"use client";
import { useState } from "react";
export default function Unsubscribe({ token }: { token: string }) {
  const [state, setState] = useState("ready");
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-lg py-12">
        <h1 className="text-2xl font-bold">Preferências de contato</h1>
        <p className="mt-4">
          {state === "done"
            ? "Você não receberá novas abordagens comerciais desta operação."
            : "Deseja interromper as mensagens comerciais da BigCorps?"}
        </p>
        {state !== "done" && (
          <button
            disabled={state === "busy"}
            className="mt-6 rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950"
            onClick={async () => {
              setState("busy");
              const r = await fetch(
                `/api/public/sdr/unsubscribe?token=${encodeURIComponent(token)}`,
                { method: "POST" },
              ).catch(() => null);
              setState(r?.ok ? "done" : "error");
            }}
          >
            Não receber novas mensagens
          </button>
        )}
        {state === "error" && (
          <p role="alert" className="mt-4">
            Não foi possível concluir. Tente novamente.
          </p>
        )}
      </div>
    </main>
  );
}
