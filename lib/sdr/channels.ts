import "server-only";
import { db, checked, required, fetchJson, origin, signToken } from "./server";
import { PRODUCTS, templateFor, type Product } from "./catalog";
export async function metaConnection() {
  const pageId = required("SDR_WHATSAPP_NUMBER_ID");
  const c = checked(
    await db()
      .from("meta_connections")
      .select(
        "whatsapp_number_id,waba_id,user_access_token,encrypted_page_access_token",
      )
      .eq("whatsapp_number_id", pageId)
      .single(),
  )!;
  const token = c.user_access_token || c.encrypted_page_access_token;
  if (!token || !c.waba_id) throw new Error("meta_connection_incomplete");
  return {
    pageId,
    wabaId: c.waba_id,
    token,
    version: process.env.META_GRAPH_VERSION || "v23.0",
  };
}
async function graph(path: string, method = "GET", payload?: unknown) {
  const c = await metaConnection();
  return fetchJson(`https://graph.facebook.com/${c.version}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${c.token}`,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}
export async function seedTemplates() {
  const rows = (Object.keys(PRODUCTS) as Product[])
    .filter((p) => PRODUCTS[p].lane !== "silva")
    .map(templateFor);
  checked(
    await db()
      .from("sdr_templates")
      .upsert(rows, { onConflict: "product", ignoreDuplicates: true }),
  );
}
export async function submitTemplate(product: Product) {
  const c = await metaConnection();
  const t = templateFor(product);
  const r = await graph(`${c.wabaId}/message_templates`, "POST", {
    name: t.name,
    language: t.language,
    category: "MARKETING",
    components: [
      {
        type: "BODY",
        text: t.body,
        example: {
          body_text: [["https://minhai.app/comercial/conhecer/exemplo"]],
        },
      },
    ],
  });
  checked(
    await db()
      .from("sdr_templates")
      .upsert({
        ...t,
        meta_id: r.payload.id,
        status: r.payload.status || "PENDING",
        submitted_at: new Date().toISOString(),
      }),
  );
  return { status: r.payload.status || "PENDING" };
}
export async function syncTemplate(product: Product) {
  const c = await metaConnection();
  const t = templateFor(product);
  const r = await graph(
    `${c.wabaId}/message_templates?name=${encodeURIComponent(t.name)}&fields=id,name,status,category,language,components`,
  );
  const actual = r.payload.data?.find(
    (x: any) => x.name === t.name && x.language === t.language,
  );
  const sameBody =
    actual?.components?.find((x: any) => x.type === "BODY")?.text === t.body;
  const status =
    actual?.category === "MARKETING" && sameBody
      ? actual.status
      : "CONTENT_MISMATCH";
  checked(
    await db()
      .from("sdr_templates")
      .upsert({
        ...t,
        meta_id: actual?.id || null,
        status: actual ? status : "NOT_FOUND",
        synced_at: new Date().toISOString(),
      }),
  );
  return { status: actual ? status : "NOT_FOUND" };
}
export async function sendWhatsapp(q: any, o: any, l: any) {
  const c = await metaConnection();
  const t = templateFor(o.product);
  const url = `${origin()}/comercial/conhecer/${signToken(o.id)}`;
  const r = await graph(`${c.pageId}/messages`, "POST", {
    messaging_product: "whatsapp",
    to: l.phone,
    type: "template",
    template: {
      name: t.name,
      language: { code: "pt_BR" },
      components: [{ type: "body", parameters: [{ type: "text", text: url }] }],
    },
  });
  const id = r.payload.messages?.[0]?.id;
  if (!id) throw new Error("send_receipt_missing");
  return { provider_id: id, thread_id: null };
}
export async function googleAccount() {
  const d = db();
  const id = required("SDR_GOOGLE_ACCOUNT_ID");
  const g = checked(
    await d
      .from("google_accounts")
      .select(
        "id,google_email,access_token,refresh_token,expires_at,scopes,is_active",
      )
      .eq("id", id)
      .single(),
  )!;
  if (
    !g.is_active ||
    !g.scopes?.includes("https://www.googleapis.com/auth/gmail.send")
  )
    throw new Error("gmail_send_scope_required");
  if (!g.expires_at || new Date(g.expires_at).getTime() < Date.now() + 60000) {
    const r = await fetchJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: required("GOOGLE_OAUTH_CLIENT_ID"),
        client_secret: required("GOOGLE_OAUTH_CLIENT_SECRET"),
        refresh_token: g.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    g.access_token = r.payload.access_token;
    checked(
      await d
        .from("google_accounts")
        .update({
          access_token: g.access_token,
          expires_at: new Date(
            Date.now() + r.payload.expires_in * 1000,
          ).toISOString(),
        })
        .eq("id", id),
    );
  }
  return g;
}
export async function threadHasReply(threadId: string) {
  const g = await googleAccount();
  if (
    !g.scopes?.some((s: string) =>
      [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://mail.google.com/",
      ].includes(s),
    )
  )
    throw new Error("gmail_reply_scope_required");
  const r = await fetchJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=From`,
    { headers: { Authorization: `Bearer ${g.access_token}` } },
  );
  return (r.payload.messages || []).some(
    (m: any) => !m.labelIds?.includes("SENT") && !m.labelIds?.includes("DRAFT"),
  );
}
export function emailContent(o: any, l: any, step: number) {
  const product = PRODUCTS[o.product as Product];
  const token = signToken(o.id);
  const link = `${origin()}/comercial/conhecer/${token}`;
  const out = `${origin()}/comercial/sair/${token}`;
  return {
    subject: `${product.name} para ${String(l.company_name).slice(0, 90)}`,
    body: `Olá${l.contact_name ? ", " + l.contact_name : ""}!\n\nSou o assistente comercial da BigCorps.${step ? " Retomo nosso contato." : ""}\n\nO ${product.name} oferece ${product.pitch}. Gostaria de saber se isso faz sentido para sua empresa.\n\n${product.question}\n\nConheça e conte o que precisa: ${link}\n\nSe preferir falar com uma pessoa, basta responder a este email.\n\nBigCorps Tecnologia · https://bigcorps.com.br\nNão deseja novos contatos? ${out}`,
  };
}
export async function sendEmail(q: any, o: any, l: any) {
  const g = await googleAccount();
  const message = emailContent(o, l, q.step);
  const token = signToken(o.id);
  const out = `${origin()}/api/public/sdr/unsubscribe?token=${encodeURIComponent(token)}`;
  const mime = [
    `To: ${l.email}`,
    `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    `Message-ID: <sdr-${q.id}@minhai.app>`,
    `List-Unsubscribe: <${out}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    "",
    Buffer.from(message.body).toString("base64"),
  ].join("\r\n");
  const r = await fetchJson(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${g.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
    },
  );
  if (!r.payload.id) throw new Error("send_receipt_missing");
  return { provider_id: r.payload.id, thread_id: r.payload.threadId || null };
}
