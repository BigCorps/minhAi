"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { RefreshCw, Target, ArrowUpRight } from "lucide-react";
import AdminHeader from "./AdminHeader";
import { money } from "./AdminBusinessUi";
import type { AdminIdentity } from "@/types/platform-admin-business";
import { PRODUCTS, PROVIDERS, STAGES, type Product } from "@/lib/sdr/catalog";
const input =
  "w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white";
const localDate = (v: string | null) =>
  v
    ? new Date(new Date(v).getTime() - 3 * 3600000).toISOString().slice(0, 16)
    : "";
const button =
  "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-40";
const card = "rounded-2xl border border-white/10 bg-white/[.025] p-5";
const errors: Record<string, string> = {
  decision_maker_not_found: "Nenhum decisor foi encontrado para esta empresa.",
  provider_missing: "Escolha o fornecedor da campanha.",
  apollo_plan_unavailable: "Apollo API enrichment indisponível no plano Free. Use a pesquisa na web.",
  web_research_not_configured: "A pesquisa na web precisa da configuração OpenAI.",
  web_research_already_attempted: "Este lead já teve uma pesquisa na web.",
  web_research_invalid_response: "A pesquisa não retornou uma resposta estruturada válida.",
  web_research_search_limit: "A pesquisa não cumpriu o limite de buscas.",
  web_research_failed: "Não foi possível concluir a pesquisa na web.",
  apollo_person_not_found: "O Apollo não encontrou o decisor.",
  apollo_person_mismatch: "O Apollo retornou uma pessoa com identidade incompatível.",
  apollo_email_not_found: "O Apollo não retornou email profissional verificado para o decisor.",
  apollo_accounting_invalid: "O Apollo não informou um consumo seguro para reconciliação. A reserva foi mantida.",
  apollo_lookup_already_attempted: "Esta oportunidade já teve uma tentativa Apollo.",
  company_identity_required: "Complete o nome da empresa antes de localizar o email.",
  email_already_present: "Este contato já possui email.",
  hunter_email_not_found: "O Hunter não encontrou email para este decisor.",
  hunter_email_not_verified: "O Hunter não retornou um email com verificação válida.",
  provider_budget: "Configure o orçamento e a validade do fornecedor. (provider_budget)",
  provider_http_401: "A chave da API foi rejeitada ou expirou. (provider_http_401)",
  provider_http_402: "O fornecedor informou saldo insuficiente. (provider_http_402)",
  provider_http_403: "A chave não possui permissão para esta operação. (provider_http_403)",
  provider_http_404: "A Econodata não encontrou organograma para esta empresa. (provider_http_404)",
  provider_http_422: "O fornecedor rejeitou algum parâmetro da consulta. (provider_http_422)",
  provider_http_429: "Limite temporário de requisições atingido. (provider_http_429)",
  provider_http_503: "O fornecedor está temporariamente indisponível. (provider_http_503)",
  estimate_unavailable: "O fornecedor não retornou uma estimativa válida. (estimate_unavailable)",
  trial_not_active: "Informe a data final do trial.",
  filters_required: "Defina os filtros de busca.",
  search_exhausted: "Esta busca terminou. Salve novos filtros para recomeçar.",
  whatsapp_optin_required:
    "O contato ainda não autorizou WhatsApp para este produto.",
  verified_email_required: "Verifique o email antes de enfileirar.",
  lead_not_eligible:
    "Ative a campanha e revise o contato. Confira bloqueios e responsável.",
  company_already_contacted: "Esta empresa já possui uma abordagem registrada.",
  template_not_approved: "O template ainda não está aprovado pela Meta.",
  confirmed_payment_required: "Primeiro precisamos confirmar o pagamento.",
  database_operation_failed:
    "A operação não pôde ser concluída. Confira a instalação SQL e os campos.",
  search_running: "Já existe uma busca em andamento.",
  run_limit: "A campanha atingiu o limite de buscas.",
  sensitive_targeting_rejected:
    "Use critérios empresariais, sem inferir condições de saúde.",
};
const commercialError = (code: string) =>
  Object.prototype.hasOwnProperty.call(errors, code)
    ? errors[code]
    : "Não foi possível concluir a operação. Tente novamente ou revise a configuração.";
export default function AdminCommercial({
  admin,
  basePath,
}: {
  admin: AdminIdentity;
  basePath: "" | "/admin";
}) {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("campaigns"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [page, setPage] = useState(0),
    [campaign, setCampaign] = useState(""),
    [preview, setPreview] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (preview) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [preview]);
  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/admin/comercial?page=${page}&campaign=${campaign}`,
        { cache: "no-store" },
      );
      if (r.status === 401 || r.status === 403) {
        window.location.assign(`${basePath}/login`);
        return;
      }
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setData(j.data);
    } catch {
      setError(
        "Não foi possível carregar o Comercial. Confira se o SQL deste pacote foi aplicado.",
      );
    }
  }, [page, campaign, basePath]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(
    payload: Record<string, unknown>,
    message = "Alteração salva.",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/admin/comercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setNotice(message);
      if (payload.action === "preview") setPreview(j.data);
      await load();
      return j.data;
    } catch (e) {
      const m = e instanceof Error ? e.message : "Falha";
      if (payload.action === "apollo_find_email" || payload.action === "hunter_find_email" || payload.action === "web_research_contact") await load();
      setError(commercialError(m));
      return null;
    } finally {
      setBusy(false);
    }
  }
  const metrics = data?.metrics || [];
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader admin={admin} basePath={basePath} active="commercial" />
      <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
              BigCorps · Operação comercial
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Do primeiro contato à venda.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Prospecção, qualificação e acompanhamento de todos os produtos,
              com a MonitorIA no mesmo lugar.
            </p>
          </div>
          <button
            className={button}
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw className="mr-2 inline h-4 w-4" />
            Atualizar
          </button>
        </div>
        <div className="my-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-lime-300/10 px-3 py-2 text-lime-200">
            {data?.config.live
              ? "Envio habilitado · dias úteis, 9h–18h"
              : "Envio pausado para configuração"}
          </span>
          <span className="rounded-full bg-white/5 px-3 py-2">
            Campanhas começam pausadas · limite inicial de 5 contatos/dia
          </span>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-xl border border-lime-300/20 p-4 text-lime-200"
          >
            {notice}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Contatos encontrados",
              metrics.reduce((s: number, m: any) => s + Number(m.leads), 0),
            ],
            [
              "Qualificados",
              metrics.reduce((s: number, m: any) => s + Number(m.qualified), 0),
            ],
            [
              "Pagos e ativados",
              metrics.reduce((s: number, m: any) => s + Number(m.won), 0),
            ],
            [
              "Receita atribuída",
              money(
                metrics.reduce(
                  (s: number, m: any) => s + Number(m.revenue_cents),
                  0,
                ),
              ),
            ],
          ].map(([label, value]) => (
            <div key={label} className={card}>
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </div>
          ))}
        </div>
        <nav className="my-6 flex gap-2 overflow-x-auto">
          {[
            ["campaigns", "Campanhas"],
            ["leads", "Contatos & funil"],
            ["templates", "Mensagens"],
            ["monitoria", "MonitorIA"],
            ["results", "Resultados"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`${button} shrink-0 ${tab === key ? "bg-lime-300 text-slate-950" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        {!data ? (
          <p>Carregando operação comercial…</p>
        ) : (
          <>
            {tab === "campaigns" && (
              <div className="space-y-5">
                <section className={card}>
                  <h2 className="font-bold">Conexões e orçamento do teste</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    As chaves são configuradas no servidor. Créditos e tokens
                    têm unidades diferentes; o saldo abaixo é uma reserva local
                    de consumo, não o extrato do fornecedor.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {data.budgets.map((b: any) => (
                      <Budget
                        key={b.provider}
                        b={b}
                        configured={data.config.providers[b.provider]}
                        busy={busy}
                        action={action}
                      />
                    ))}
                  </div>
                </section>
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.campaigns.map((c: any) => (
                    <Campaign key={c.id} c={c} busy={busy} action={action} />
                  ))}
                </div>
              </div>
            )}
            {tab === "leads" && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-3">
                  <select
                    aria-label="Filtrar campanha"
                    className={input + " max-w-sm"}
                    value={campaign}
                    onChange={(e) => {
                      setCampaign(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">Todas as campanhas</option>
                    {data.campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void action(
                        { action: "reconcile" },
                        "Pagamentos conciliados.",
                      )
                    }
                  >
                    Conferir pagamentos
                  </button>
                </div>
                <details className={card}>
                  <summary className="cursor-pointer font-bold">
                    Adicionar contato com origem conhecida
                  </summary>
                  <ManualLead
                    campaigns={data.campaigns}
                    action={action}
                    busy={busy}
                  />
                </details>
                {data.opportunities.length === 0 ? (
                  <div className={card}>
                    <Target className="h-8 w-8 text-lime-300" />
                    <h2 className="mt-3 font-bold">
                      A primeira lista começa aqui.
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Configure uma campanha e use “Buscar até 5 contatos”, ou
                      adicione uma indicação conhecida.
                    </p>
                  </div>
                ) : (
                  data.opportunities.map((o: any) => (
                    <Opportunity
                      key={o.id}
                      o={o}
                      action={action}
                      busy={busy}
                      monitoria={data.monitoria}
                    />
                  ))
                )}
                <div className="flex items-center justify-between">
                  <button
                    className={button}
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-slate-400">
                    {data.total} oportunidades · página {page + 1}
                  </span>
                  <button
                    className={button}
                    disabled={(page + 1) * 30 >= data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
            {tab === "templates" && (
              <div className="space-y-4">
                <div className={card}>
                  <h2 className="font-bold">Apresentações por produto</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    WhatsApp exige autorização do contato e template aprovado
                    como marketing. O email contém apresentação, qualificação e
                    descadastro. Nenhum botão abaixo envia mensagem a leads.
                  </p>
                  <p className="mt-3 text-sm">
                    Email: {data.config.email ? "configurado" : "pendente"} ·
                    WhatsApp:{" "}
                    {data.config.whatsapp ? "configurado" : "pendente"} · Links:{" "}
                    {data.config.token ? "configurados" : "pendentes"}
                  </p>
                  <button
                    className={button + " mt-4"}
                    disabled={busy}
                    onClick={() => void action({ action: "seed_templates" })}
                  >
                    Preparar oito templates
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.templates.map((t: any) => (
                    <article key={t.product} className={card}>
                      <div className="flex justify-between gap-3">
                        <h3 className="font-bold">
                          {PRODUCTS[t.product as Product]?.name}
                        </h3>
                        <span className="text-xs text-lime-200">
                          {t.status}
                        </span>
                      </div>
                      <p className="my-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {t.body}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy || !!t.meta_id}
                          className={button}
                          onClick={() =>
                            void action(
                              { action: "submit_template", product: t.product },
                              "Template enviado para análise da Meta.",
                            )
                          }
                        >
                          Enviar para aprovação
                        </button>
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "sync_template",
                              product: t.product,
                            })
                          }
                        >
                          Consultar aprovação
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <section className={card}>
                  <h2 className="font-bold">Fila recente</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Canal</th>
                          <th>Estado</th>
                          <th>Motivo</th>
                          <th>Agendado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.queue.map((q: any) => (
                          <tr key={q.id} className="border-t border-white/10">
                            <td className="py-3">{q.channel}</td>
                            <td>{q.status}</td>
                            <td>{q.error_code ? commercialError(q.error_code) : "—"}</td>
                            <td>
                              {new Date(q.due_at).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    “sent” confirma aceitação pela API, não leitura ou entrega.
                    “unknown” exige conferir o provedor antes de qualquer novo
                    envio.
                  </p>
                </section>
              </div>
            )}
            {tab === "monitoria" && <Monitoria value={data.monitoria} />}
            {tab === "results" && (
              <div className="space-y-5">
                <section className={card}>
                  <h2 className="font-bold">Resultado por frente e produto</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Produtos e públicos diferentes afetam o retorno. Use a
                    qualidade dos dados para comparar APIs e as vendas para
                    comparar campanhas. Uma lista encontrada não comprova
                    intenção de compra.
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-sm">
                      <thead>
                        <tr>
                          {[
                            "Campanha",
                            "API",
                            "Leads",
                            "Email válido",
                            "Contatados",
                            "Respostas",
                            "Qualificados",
                            "Fechados",
                            "Receita",
                            "Custo informado",
                          ].map((h) => (
                            <th key={h} className="pb-3 pr-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((m: any) => (
                          <tr key={m.id} className="border-t border-white/10">
                            {[
                              m.name,
                              m.provider || "A configurar",
                              m.leads,
                              m.verified,
                              m.contacted,
                              m.replied,
                              m.qualified,
                              m.won,
                              money(Number(m.revenue_cents)),
                              money(Number(m.cost_cents)),
                            ].map((v, i) => (
                              <td key={i} className="py-3 pr-3">
                                {v}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className={card}>
                  <h2 className="font-bold">Últimas buscas</h2>
                  {data.runs.map((r: any) => (
                    <div
                      key={r.id}
                      className="mt-3 border-t border-white/10 pt-3 text-sm"
                    >
                      {r.provider} · {r.status} · {r.imported} novos ·{" "}
                      {r.duplicates} duplicados · reserva {r.credits_reserved} ·
                      cobrança {r.credits_charged ?? "não informada"}{" "}
                      {r.error_code && (
                        <span className="text-amber-200">
                          {" "}
                          · {commercialError(r.error_code)}
                        </span>
                      )}
                    </div>
                  ))}
                </section>
              </div>
            )}
          </>
        )}
        {preview && (
          <dialog
            ref={dialogRef}
            onCancel={() => setPreview(null)}
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreview(null);
            }}
            className="fixed inset-0 z-[60] m-auto border-0 bg-transparent p-4 text-slate-100 backdrop:bg-black/80"
            aria-label="Prévia da abordagem"
          >
            <div
              className={
                card +
                " max-h-[85vh] w-full max-w-2xl overflow-auto bg-slate-950"
              }
            >
              <h2 className="font-bold">{preview.subject}</h2>
              <p className="my-5 whitespace-pre-wrap break-words text-sm leading-6">
                {preview.body}
              </p>
              <a
                className={button + " inline-block"}
                href={preview.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir qualificação
              </a>
              <button
                className={button + " ml-2"}
                onClick={() => setPreview(null)}
              >
                Fechar
              </button>
            </div>
          </dialog>
        )}
      </div>
    </main>
  );
}
function Budget({ b, configured, busy, action }: any) {
  return (
    <form
      className="rounded-xl bg-white/5 p-4"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void action({
          action: "budget",
          provider: b.provider,
          limit_units: f.get("limit"),
          expires_at: f.get("expires"),
          enabled: f.get("enabled") === "on",
        });
      }}
    >
      <h3 className="font-bold capitalize">
        {b.provider === "web_research" ? "Pesquisa IA na web" : b.provider} · {configured ? "chave configurada" : "sem chave"}
      </h3>
      {b.provider === "apollo" && <p className="mt-2 text-xs text-amber-200">Apollo API enrichment indisponível no plano Free.</p>}
      <p className="my-2 text-xs text-slate-400">
        Reservado: {b.used_units} unidades
      </p>
      <label className="block text-xs">
        Teto de unidades
        <input
          name="limit"
          type="number"
          min="0"
          max="1000000"
          required
          defaultValue={b.limit_units}
          className={input}
        />
      </label>
      <label className="mt-2 block text-xs">
        Validade (Brasília)
        <input
          name="expires"
          type="datetime-local"
          defaultValue={localDate(b.expires_at)}
          required
          className={input}
        />
      </label>
      <label className="my-3 flex items-center gap-2 text-sm">
        <input name="enabled" type="checkbox" defaultChecked={b.enabled} />
        Liberar consultas dentro do limite
      </label>
      <button className={button} disabled={busy}>
        Salvar orçamento
      </button>
    </form>
  );
}
function Campaign({ c, busy, action }: any) {
  const [filters, setFilters] = useState(JSON.stringify(c.filters, null, 2));
  return (
    <form
      className={card}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        let parsed;
        try {
          parsed = JSON.parse(filters);
        } catch {
          alert("Os filtros precisam ser um JSON válido.");
          return;
        }
        void action({
          action: "campaign",
          id: c.id,
          provider: f.get("provider"),
          filters: parsed,
          enabled: f.get("enabled") === "on",
          auto_discover: f.get("auto") === "on",
          trial_ends_at: f.get("ends"),
          daily_limit: f.get("daily"),
          max_runs: f.get("runs"),
          max_touches: f.get("touches"),
          cost_cents: Math.round(Number(f.get("cost")) * 100),
        });
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{c.name}</h2>
        <span className="text-xs text-lime-200">
          {c.enabled ? "Ativa" : "Pausada"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {PRODUCTS[c.product as Product]?.audience}
      </p>
      <>
        <label className="mt-4 block text-xs">
          Fornecedor
          <select
            name="provider"
            defaultValue={c.provider || ""}
            className={input}
          >
            <option value="">Escolha após configurar a chave</option>
            {PROVIDERS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs">
          Filtros da API
          <textarea
            aria-label="Filtros JSON"
            className={input + " mt-1 font-mono"}
            rows={5}
            value={filters}
            onChange={(e) => setFilters(e.target.value)}
          />
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Exemplos por fornecedor estão no guia do pacote. Cada busca importa no
          máximo cinco contatos.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs">
            Fim do trial (Brasília)
            <input
              name="ends"
              type="datetime-local"
              required
              defaultValue={localDate(c.trial_ends_at)}
              className={input}
            />
          </label>
          <label className="text-xs">
            Envios por dia
            <input
              name="daily"
              type="number"
              min="1"
              max="100"
              defaultValue={c.daily_limit}
              className={input}
            />
          </label>
          <label className="text-xs">
            Máximo de buscas
            <input
              name="runs"
              type="number"
              min="1"
              max="1000"
              defaultValue={c.max_runs}
              className={input}
            />
          </label>
          <label className="text-xs">
            Toques por email
            <input
              name="touches"
              type="number"
              min="1"
              max="3"
              defaultValue={c.max_touches}
              className={input}
            />
          </label>
          <label className="text-xs">
            Custo total informado (R$)
            <input
              name="cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={c.cost_cents / 100}
              className={input}
            />
          </label>
        </div>
        <label className="mt-4 flex gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={c.enabled} />
          Ativar campanha
        </label>
        <label className="mt-2 flex gap-2 text-sm">
          <input type="checkbox" name="auto" defaultChecked={c.auto_discover} />
          Buscar diariamente até o limite
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={button} disabled={busy}>
            Salvar campanha
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              void action(
                { action: "discover", id: c.id },
                "Busca concluída. Revise os contatos no funil.",
              )
            }
          >
            Buscar até 5 contatos
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => void action({ action: "web_discover_companies", id: c.id }, "Descoberta de empresas concluída. Confira os leads no funil.")}
          >Encontrar empresas com IA</button>
        </div>
        <p className="mt-2 text-sm text-slate-400">Pesquisa IA: até 5 empresas · até 3 buscas · somente empresas · nenhum contato será enviado.</p>
      </>
    </form>
  );
}
function ManualLead({ campaigns, action, busy }: any) {
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void action({
          action: "import",
          id: f.get("campaign"),
          lead: Object.fromEntries(
            [
              "company_name",
              "contact_name",
              "domain",
              "cnpj",
              "email",
              "phone",
              "source_ref",
              "evidence",
            ].map((k) => [k, f.get(k)]),
          ),
        });
      }}
    >
      <select
        aria-label="Campanha do novo contato"
        className={input}
        name="campaign"
        required
      >
        {campaigns.map((c: any) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {[
        ["company_name", "Empresa"],
        ["contact_name", "Nome do contato"],
        ["domain", "Site"],
        ["cnpj", "CNPJ"],
        ["email", "Email profissional"],
        ["phone", "Telefone internacional, ex.: 55119…"],
        ["source_ref", "Origem / indicação"],
        ["evidence", "Por que o produto faz sentido?"],
      ].map(([key, label]) => (
        <label key={key} className="text-xs">
          {label}
          <input
            name={key}
            className={input}
            required={["company_name", "source_ref", "evidence"].includes(key)}
          />
        </label>
      ))}
      <button disabled={busy} className={button}>
        Adicionar ao funil
      </button>
    </form>
  );
}
function Opportunity({ o, action, busy, monitoria }: any) {
  const l = o.lead;
  const decisionMaker = o.qualification?.decision_maker;
  const research = o.qualification?.web_research;
  const businessIdentity = /^\d{14}$/.test(String(l.cnpj || "").replace(/\D/g, "")) ||
    (["econodata", "hunter", "apollo"].includes(l.source) && l.domain);
  const canResearch = !l.email && l.company_name?.trim() && !/^CNPJ\s/i.test(l.company_name.trim()) && businessIdentity && !research &&
    !["lost", "won", "paid"].includes(o.stage);
  const decisionRole = Array.isArray(decisionMaker?.cargos)
    ? decisionMaker.cargos.find((role: unknown) => typeof role === "string" && role.trim()) : null;
  return (
    <article className={card}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-bold">{l.company_name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {PRODUCTS[o.product as Product]?.name} · {"SDR minhAi"} ·{" "}
            {STAGES[o.stage]}
          </p>
        </div>
        <span className="text-sm text-lime-200">
          Qualificação {o.score}/100 · {money(Number(o.paid_cents))} recebidos
        </span>
      </div>
      <p className="mt-3 break-words text-sm">
        {l.contact_name} · {l.email || "Email pendente"} ({l.email_status === "verified" ? "Verificado" : l.email_status === "public_source" ? "Fonte pública · sem verificação técnica" : l.email_status}) ·{" "}
        {l.phone || "Telefone pendente"}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Fonte: {l.source === "web_research" ? "Pesquisa IA" : l.source} · {l.evidence}
      </p>
      {decisionMaker?.source === "econodata" && (
        <p className="mt-2 text-sm text-slate-300">
          {l.contact_name} · {decisionRole || "Cargo não informado"} · Nível de decisão: {decisionMaker.nivelDecisao || "não informado"}
          {l.contact_name && !l.email && <span className="ml-2 text-lime-200">Pronto para localizar email</span>}
        </p>
      )}
      {research?.status === "completed" && (
        <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
          <p>{research.companyConfirmed ? "Empresa confirmada na web" : "Empresa sem confirmação web"} · {research.decisionMakerKnown && research.decisionMakerSource === "econodata" ? "Decisor identificado pela Econodata" : research.decisionMakerConfirmed ? "Decisor confirmado na web" : "Decisor sem confirmação web"}</p>
          {research.decisionMakerKnown && research.decisionMakerSource === "econodata" && <p>{research.decisionMakerWebCorroborated ? "Vínculo corroborado na web" : "Sem corroboração web do vínculo"}</p>}
          {research.outcome === "validation_inconclusive" && <p>Validação documental inconclusiva; nenhum contato individual foi aceito.</p>}
          {research.outcome === "no_public_contact_found" && <p>Nenhum contato público encontrado.</p>}
          <p>{research.professionalEmailFound ? "Email profissional encontrado em fonte pública" : "Email profissional não encontrado"} · {research.companyContacts?.length ? "Contato corporativo encontrado" : "Sem contato corporativo confirmado"}</p>
          {research.companyContacts?.map((contact: any) => <p key={contact.value}>Contato da empresa: {contact.value}</p>)}
          <details className="mt-2">
            <summary className="cursor-pointer text-lime-200">Abrir fontes ({research.sources?.length || 0})</summary>
            <ul className="mt-2 space-y-1">
              {research.sources?.map((source: any) => typeof source.url === "string" && /^https:\/\//i.test(source.url) && (
                <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title || "Abrir fonte"}</a></li>
              ))}
            </ul>
          </details>
        </div>
      )}
      {research?.status === "running" && <p className="mt-2 text-sm text-slate-400">Pesquisa na web em andamento.</p>}
      {research?.status === "failed" && <p className="mt-2 text-sm text-amber-200">A pesquisa não foi concluída. Confira o orçamento e a configuração antes de uma nova etapa.</p>}
      {(l.suppressed_at || l.human_at) && (
        <p className="mt-3 text-sm text-amber-200">
          {l.suppressed_at
            ? "Contato bloqueado / descadastrado"
            : "Atendimento humano — automação pausada"}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {canResearch && (
          <button className={button} disabled={busy}
            onClick={() => void action({ action: "web_research_contact", id: o.id }, "Pesquisa empresarial concluída.")}
          >Pesquisar contato na web</button>
        )}
        {l.source === "econodata" && l.cnpj && decisionMaker?.source !== "econodata" && !["lost", "won", "paid"].includes(o.stage) && (
          <div>
            <button className={button} disabled={busy}
              onClick={() => void action({ action: "econodata_decision_maker", id: o.id }, "Decisor selecionado. Próxima etapa: localizar e validar email profissional.")}
            >Buscar decisor</button>
          </div>
        )}
        {l.source === "econodata" && l.cnpj && l.contact_name && decisionMaker?.source === "econodata" && !l.email && !["lost", "won", "paid"].includes(o.stage) && (
          <button className={button} disabled={busy}
            onClick={() => void action({ action: "hunter_find_email", id: o.id }, "Email profissional localizado e verificado.")}
          >Localizar email</button>
        )}
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void action({ action: "preview", id: o.id }, "Prévia pronta.")
          }
        >
          Ver abordagem e link
        </button>
        {!l.outreach_reviewed && (
          <button
            className={button}
            disabled={busy}
            onClick={() => {
              const evidence = prompt(
                "Registre por que esta empresa tem aderência ao produto:",
                l.evidence,
              );
              if (evidence)
                void action({ action: "review", id: l.id, evidence });
            }}
          >
            Aprovar perfil
          </button>
        )}
        <button
          className={button}
          disabled={busy || !l.email || l.email_status === "verified"}
          onClick={() => void action({ action: "verify_email", id: l.id })}
        >
          Verificar email
        </button>
        <button
          className={button}
          disabled={
            busy ||
            !!l.suppressed_at ||
            !!l.human_at ||
            !l.outreach_reviewed ||
            l.owner !== "minhai"
          }
          onClick={() =>
            void action(
              { action: "enqueue", id: o.id, channel: "email" },
              "Email colocado na fila.",
            )
          }
        >
          Enfileirar email
        </button>
        <button
          className={button}
          disabled={busy || !l.phone || !!l.suppressed_at}
          onClick={() => {
            const evidence = prompt(
              "Registre onde e quando a pessoa autorizou mensagens comerciais deste produto por WhatsApp. Encontrar o número na API não é autorização.",
            );
            if (evidence)
              void action({ action: "consent", id: o.id, evidence });
          }}
        >
          Registrar autorização WhatsApp
        </button>
        <button
          className={button}
          disabled={
            busy ||
            !!l.suppressed_at ||
            !!l.human_at ||
            !l.outreach_reviewed ||
            l.owner !== "minhai"
          }
          onClick={() =>
            void action(
              { action: "enqueue", id: o.id, channel: "whatsapp" },
              "WhatsApp colocado na fila.",
            )
          }
        >
          Enfileirar WhatsApp
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() => void action({ action: "handoff", id: l.id })}
        >
          Assumir atendimento
        </button>
        <button
          className={button}
          disabled={busy}
          onClick={() =>
            void action(
              { action: "optout", id: l.id },
              "Contato bloqueado para novos envios.",
            )
          }
        >
          Não contatar
        </button>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-300">
          Qualificação e fechamento
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm">
          {JSON.stringify(o.qualification, null, 2)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["meeting", "Marcar reunião"],
            ["proposal", "Registrar proposta"],
            ["lost", "Encerrar sem venda"],
          ].map(([stage, label]) => (
            <button
              key={stage}
              className={button}
              disabled={busy || ["paid", "won"].includes(o.stage)}
              onClick={() => {
                const note = prompt(
                  "Observação (data da reunião ou condições da proposta):",
                );
                if (note !== null)
                  void action({ action: "stage", id: o.id, stage, note });
              }}
            >
              {label}
            </button>
          ))}
          <button
            className={button}
            disabled={busy || !o.paid_cents || !!o.activated_at}
            onClick={() => {
              const evidence = prompt(
                "Registre a evidência da ativação verificada no produto:",
              );
              if (evidence)
                void action({ action: "activation", id: o.id, evidence });
            }}
          >
            Confirmar ativação após pagamento
          </button>
        </div>
        {o.product === "monitoria_vip" && monitoria?.available && (
          <select
            aria-label="Vincular projeto MonitorIA"
            className={input + " mt-3"}
            value={o.external_ref || ""}
            onChange={(e) =>
              void action({
                action: "monitoria_link",
                id: o.id,
                project_id: e.target.value,
              })
            }
          >
            <option value="">Vincular ao projeto MonitorIA correto</option>
            {monitoria.data.projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.company_name}
              </option>
            ))}
          </select>
        )}
      </details>
    </article>
  );
}
function Monitoria({ value }: any) {
  if (!value.available)
    return (
      <div className={card}>
        <h2 className="font-bold">MonitorIA aguardando conexão</h2>
        <p className="mt-2 text-sm text-slate-400">
          Configure a conexão de leitura no servidor e aplique o SQL da
          MonitorIA. Dados indisponíveis não são tratados como zero.
        </p>
      </div>
    );
  const d = value.data;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Atualizado em {new Date(d.generatedAt).toLocaleString("pt-BR")} ·{" "}
        {d.organizations} organizações
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {d.products.map((p: any) => (
          <div className={card} key={p.productKey}>
            <h2 className="font-bold">
              {p.productKey === "monitoria_vip"
                ? "MonitorIA VIP"
                : "MonitorIA padrão"}
            </h2>
            <p className="mt-3 text-3xl font-black">
              {money(Number(p.revenueMonthCents))}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Recebido no mês · MRR {money(Number(p.mrrCents))} ·{" "}
              {p.activeSubscriptions} assinaturas
            </p>
          </div>
        ))}
      </div>
      <section className={card}>
        <h2 className="font-bold">Projetos VIP</h2>
        {d.projects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Nenhum projeto VIP cadastrado.
          </p>
        ) : (
          d.projects.map((p: any) => (
            <div
              className="mt-3 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3"
              key={p.id}
            >
              <div>
                <p>
                  {p.name} · {p.company_name}
                </p>
                <p className="text-xs text-slate-400">
                  {p.status} · {p.expected_camera_count} câmeras ·{" "}
                  {p.selected_plan_code}
                </p>
              </div>
              <a
                className={button}
                href={`https://vip.monitoria.cam/comercial/vip/${p.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir no MonitorIA <ArrowUpRight className="inline h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </section>
      <section className={card}>
        <h2 className="font-bold">Leads VIP recentes</h2>
        {d.leads.map((l: any) => (
          <div
            className="mt-3 border-t border-white/10 pt-3 text-sm"
            key={l.id}
          >
            {l.company_name} · {l.lead_name} · {l.status}
          </div>
        ))}
      </section>
    </div>
  );
}
