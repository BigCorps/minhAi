"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import type {
  MonitoriaAccount,
  MonitoriaBillingAccount,
  MonitoriaDirectory,
} from "@/types/monitoria-admin";
import { money } from "./AdminBusinessUi";

const control =
  "rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-200 disabled:opacity-40";
function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export default function AdminMonitoriaAccounts({
  view = "users",
  basePath,
}: {
  view?: "users" | "billing";
  basePath: "" | "/admin";
}) {
  const [data, setData] = useState<MonitoriaDirectory | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [product, setProduct] = useState("all");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams({
      view,
      search: query,
      product,
      page: String(page),
    });
    void (async () => {
      try {
        const response = await fetch(`/api/admin/monitoria?${params}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          window.location.assign(`${basePath}/login`);
          return;
        }
        if (!response.ok)
          throw new Error(
            "MonitorIA indisponível. Confira a conexão e se o SQL 02 foi aplicado no projeto MonitorIA.",
          );
        const payload = await response.json();
        if (!payload.ok || !payload.data)
          throw new Error("Resposta da MonitorIA inválida.");
        if (!controller.signal.aborted) setData(payload.data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar a MonitorIA.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [view, query, product, page, refresh, basePath]);
  return (
    <section
      id={view === "users" ? "usuarios-monitoria" : "clientes-monitoria"}
      aria-label={
        view === "users" ? "Usuários MonitorIA" : "Clientes MonitorIA"
      }
      className="mt-6 rounded-3xl border border-lime-300/15 bg-white/[.035] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
            MonitorIA
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {view === "users"
              ? "Usuários e organizações"
              : "Clientes e recebimentos"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            {view === "users"
              ? "Contas da MonitorIA, incluindo pessoas sem organização. O último login não indica presença online."
              : "Um registro por organização, com o responsável e os pagamentos confirmados neste mês. Estes valores já estão incluídos nos totais financeiros."}
          </p>
        </div>
        <button
          type="button"
          className={control}
          disabled={loading}
          onClick={() => setRefresh((x) => x + 1)}
        >
          <RefreshCw
            className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Atualizar MonitorIA
        </button>
      </div>
      <form
        className="mt-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          aria-label={
            view === "users"
              ? "Buscar usuário MonitorIA"
              : "Buscar cliente MonitorIA"
          }
          className={`${control} min-w-0 flex-1`}
          maxLength={120}
          placeholder="Nome, email ou organização"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {view === "users" ? (
          <select
            aria-label="Produto MonitorIA"
            className={control}
            value={product}
            onChange={(e) => {
              setPage(1);
              setProduct(e.target.value);
            }}
          >
            <option value="all">Todas as contas</option>
            <option value="standard">Standard</option>
            <option value="vip">VIP</option>
          </select>
        ) : null}
        <button className={control} type="submit">
          <Search className="mr-2 inline h-4 w-4" />
          Buscar
        </button>
      </form>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-amber-300/20 p-4 text-sm text-amber-200"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="mt-5 text-sm text-slate-400">
          Carregando MonitorIA…
        </p>
      ) : data ? (
        <>
          <p className="mt-4 text-xs text-slate-400">
            {data.pagination.total}{" "}
            {view === "users"
              ? "contas encontradas"
              : "organizações encontradas"}{" "}
            · Atualizado em {date(data.generatedAt)}
          </p>
          {data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhum resultado para estes filtros.
            </p>
          ) : view === "users" ? (
            <div className="mt-4 divide-y divide-white/10">
              {(data.items as MonitoriaAccount[]).map((u) => (
                <article key={u.id} className="py-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {u.name || u.email || "Conta sem nome"}
                      </p>
                      <p className="break-all text-sm text-slate-400">
                        {u.email || "Sem email"}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      <p>Cadastro: {date(u.createdAt)}</p>
                      <p className="mt-1">
                        Último login: {date(u.lastSignInAt)}
                      </p>
                    </div>
                  </div>
                  {u.organizations.length ? (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-lime-200">
                        {u.organizations.length} organização(ões) · Ver produtos
                        e câmeras
                      </summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {u.organizations.map((o) => (
                          <div
                            key={o.id}
                            className="rounded-xl border border-white/10 p-3"
                          >
                            <p className="font-semibold">{o.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {o.role} · {o.vip ? "VIP" : "Standard"}
                              {o.vip && o.standardCameras > 0
                                ? " + Standard"
                                : ""}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {o.cameras} câmeras · {o.standardCameras} Standard
                              · {o.vipCameras} VIP
                            </p>
                            {o.plans.length ? (
                              <p className="mt-1 break-words text-xs text-slate-400">
                                Planos: {o.plans.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      Sem organização cadastrada
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr>
                    <th className="pb-3">Organização</th>
                    <th className="pb-3">Responsável</th>
                    <th className="pb-3 text-right">Recebido no mês</th>
                    <th className="pb-3 text-right">Último pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {(data.items as MonitoriaBillingAccount[]).map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-4 font-semibold">{o.name}</td>
                      <td className="py-3 pr-4">
                        <p>{o.ownerName || "Não identificado"}</p>
                        <p className="text-xs text-slate-400">
                          {o.email || "Sem email"}
                        </p>
                      </td>
                      <td className="py-3 text-right">
                        <p className="font-bold">{money(o.paidMonthCents)}</p>
                        <p className="text-xs text-slate-400">
                          {o.paymentsMonth} pagamentos
                        </p>
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        {date(o.lastPaidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className={control}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className={control}
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
