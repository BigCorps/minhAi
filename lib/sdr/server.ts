import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPlatformAdminAccess } from "@/lib/platform-admin";
import {
  platformAdminJson,
  platformAdminAccessError,
} from "@/lib/platform-admin-http";
export const db = () => createAdminClient();
export function checked<T>(r: { data: T; error: unknown }): T {
  if (r.error) {
    const message = (r.error as { message?: string }).message || "";
    throw new Error(
      /^[a-z_]+$/.test(message) ? message : "database_operation_failed",
    );
  }
  return r.data;
}
export function required(name: string) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`configure_${name}`);
  return v;
}
export function origin() {
  const u = new URL(process.env.SDR_PUBLIC_URL || "https://minhai.app");
  if (u.protocol !== "https:" && u.hostname !== "localhost")
    throw new Error("invalid_public_url");
  return u.origin;
}
export function signToken(id: string) {
  const p = Buffer.from(
    JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }),
  ).toString("base64url");
  return (
    p +
    "." +
    createHmac("sha256", required("SDR_TOKEN_SECRET"))
      .update(p)
      .digest("base64url")
  );
}
export function readToken(token: string) {
  try {
    if (token.length > 512) return null;
    const [p, s] = token.split(".");
    const sig = createHmac("sha256", required("SDR_TOKEN_SECRET"))
      .update(p)
      .digest();
    const provided = Buffer.from(s || "", "base64url");
    if (sig.length !== provided.length || !timingSafeEqual(sig, provided))
      return null;
    const v = JSON.parse(Buffer.from(p, "base64url").toString());
    return typeof v.id === "string" &&
      /^[a-f0-9-]{36}$/.test(v.id) &&
      v.exp > Date.now() / 1000
      ? (v.id as string)
      : null;
  } catch {
    return null;
  }
}
export function secretMatches(actual: string | null, env: string) {
  const expected = process.env[env];
  if (!expected || !actual) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function adminRequest(
  req: Request,
  action: (actor: string) => Promise<unknown>,
) {
  const access = await getPlatformAdminAccess();
  if (!access.ok) return platformAdminAccessError(access.reason);
  if (
    req.method !== "GET" &&
    new URL(req.url).origin !== req.headers.get("origin")
  )
    return platformAdminJson({ ok: false, error: "origin_rejected" }, 403);
  try {
    return platformAdminJson({ ok: true, data: await action(access.user.id) });
  } catch (e) {
    const m = e instanceof Error ? e.message : "operation_failed";
    return platformAdminJson(
      {
        ok: false,
        error: /^[a-z0-9_]+$/.test(m) ? m : "operation_failed",
      },
      400,
    );
  }
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 30000) throw new Error("body_too_large");
  return JSON.parse(raw);
}
export async function event(
  actor: string,
  type: string,
  leadId: string | null,
  opportunityId: string | null,
  detail: Record<string, unknown> = {},
) {
  checked(
    await db()
      .from("sdr_events")
      .insert({
        actor,
        event_type: type,
        lead_id: leadId,
        opportunity_id: opportunityId,
        detail,
      }),
  );
}
const validationFields = new Set([
  "filtros", "cnaePrimario", "cnaesSecundarios", "uf", "cidade", "porte",
  "faturamento", "funcionarios", "de", "ate", "pagina", "tamanho", "cursor",
  "incluir", "limite", "estimar", "cadastro", "contatosBasicos", "domain",
  "limit", "type", "verification_status", "required_field", "full_name", "position",
]);
const validationCodes = new Set([
  "invalid_type", "invalid_value", "invalid_enum_value", "invalid_string",
  "invalid_format", "invalid_union", "unrecognized_keys", "too_small", "too_big",
  "required", "type", "enum", "minimum", "maximum", "minLength", "maxLength",
  "additionalProperties", "invalid_parameter", "validation_error",
  "extra_forbidden", "missing", "string_type", "int_type", "int_parsing",
  "bool_type", "bool_parsing", "list_type", "dict_type", "model_type",
]);
const validationWords = new Set([
  ...validationFields,
  "invalid", "invalidos", "invalido", "invalida", "invalidas", "validation",
  "validacao", "error", "erro", "errors", "erros", "field", "campo", "fields",
  "campos", "parameter", "parametro", "parameters", "parametros", "required",
  "obrigatorio", "obrigatoria", "must", "be", "a", "an", "the", "is", "not",
  "allowed", "expected", "received", "string", "number", "integer", "boolean",
  "array", "object", "null", "undefined", "true", "false", "missing", "value",
  "valor", "values", "valores", "enum", "one", "of", "at", "least", "most",
  "minimum", "maximum", "minimo", "maximo", "length", "characters", "items",
  "deve", "ser", "um", "uma", "o", "e", "de", "do", "da", "nao", "com",
  "tipo", "texto", "numero", "inteiro", "lista", "objeto", "ausente",
  "esperado", "permitido", "permitida", "valido", "valida", "menor", "maior",
  "que", "ou", "igual", "entre", "than", "to", "or", "equal", "format",
  "formato", "unsupported", "unexpected", "unrecognized", "key", "keys",
  "extra", "inputs", "are", "permitted",
]);
function sanitizeProviderValidation(payload: unknown) {
  const records: Record<string, unknown>[] = [];
  let visited = 0;
  const safeString = (value: unknown, kind: string): string | undefined => {
    if (typeof value !== "string" || !value.trim() || value.length > 300) return;
    if (kind === "code" || kind === "type")
      return validationCodes.has(value) ? value : undefined;
    if (kind === "field" || kind === "path") {
      if (!/^[a-zA-Z_][a-zA-Z0-9_.\[\]]*$/.test(value)) return;
      return value.split(/[.\[\]]/).filter(Boolean).every(
        (part) => validationFields.has(part) || /^\d{1,3}$/.test(part),
      ) ? value : undefined;
    }
    // Keep validation language only; never echo arbitrary values or provider prose.
    if (!/^[a-zA-ZÀ-ÿ0-9_ .,:;'"()\[\]-]+$/.test(value)) return;
    const words = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return words.match(/[a-zA-Z0-9_]+/g)?.every(
      (word) => validationWords.has(word) || validationWords.has(word.toLowerCase()) || /^\d{1,3}$/.test(word),
    ) ? value : undefined;
  };
  const visit = (value: unknown, depth: number) => {
    if (depth > 4 || ++visited > 50 || records.length >= 20) return;
    if (Array.isArray(value)) {
      value.slice(0, 20).forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    const record: Record<string, unknown> = {};
    for (const name of ["message", "mensagem", "msg", "error", "errors", "detail", "details", "field", "path", "loc", "code", "type"]) {
      const entry = (value as Record<string, unknown>)[name];
      if (name === "loc") {
        if (Array.isArray(entry) && entry.length > 0 && entry.length <= 10 && entry.every(
          (part) => typeof part === "number"
            ? Number.isInteger(part) && part >= 0 && part < 1000
            : typeof part === "string" && part.length > 0 && part.length <= 64 &&
              /^[A-Za-z0-9_.-]+$/.test(part) &&
              !/(authorization|cookie|secret|token|password|api[_.-]?key|bearer|^(sk|ek|pk)[_.-])/i.test(part) &&
              !/[A-Za-z0-9_-]{32,}|\d{7,}/.test(part),
        )) {
          const location = entry.join(".");
          if (location.length <= 300) record.loc = location;
        }
        continue;
      }
      const safe = safeString(entry, name);
      if (safe) record[name] = safe;
      else if (name === "path" && Array.isArray(entry) && entry.length <= 10) {
        const path = entry.map((part) => typeof part === "number" && Number.isInteger(part) && part >= 0 && part < 1000 ? String(part) : part).join(".");
        const safePath = safeString(path, "path");
        if (safePath) record.path = safePath;
      } else if (["error", "errors", "detail", "details"].includes(name)) visit(entry, depth + 1);
    }
    if (Object.keys(record).length) records.push(record);
  };
  visit(payload, 0);
  return records.length ? records : "unrecognized_provider_validation";
}
type ProviderDiagnostic = {
  provider: "econodata" | "hunter" | "apollo";
  path: string;
};
export async function fetchJson(
  url: string,
  init: RequestInit = {},
  diagnostic?: ProviderDiagnostic,
) {
  const r = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    if (r.status === 422) {
      const payload = await r.json().catch(() => null);
      const metadata = diagnostic &&
        ["econodata", "hunter", "apollo"].includes(diagnostic.provider) &&
        ["/companies/search_list", "/discover", "/domain-search", "/email-verifier", "/mixed_people/api_search", "/people/match"].includes(diagnostic.path)
        ? { provider: diagnostic.provider, path: diagnostic.path } : {};
      const validation = sanitizeProviderValidation(payload);
      console.warn("[SDR_PROVIDER_VALIDATION]", {
        ...(Array.isArray(validation) ? metadata : {}),
        status: 422,
        validation,
      });
    }
    throw new Error(`provider_http_${r.status}`);
  }
  const payload = await r.json().catch(() => null);
  if (!payload) throw new Error("provider_invalid_response");
  return { payload, headers: r.headers };
}
