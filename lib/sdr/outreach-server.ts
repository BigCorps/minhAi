import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { checked, db, required, origin, signToken } from "./server";
import { emailContent } from "./channels";
import { messageVariant, recipientSnapshot } from "./outreach";

async function records(id: string) {
  const d = db();
  const o = checked(await d.from("sdr_opportunities").select("*").eq("id", id).single())!;
  const l = checked(await d.from("sdr_leads").select("*").eq("id", o.lead_id).single())!;
  return { o, l };
}
function reviewContext(o: any, l: any) {
  return { product: o.product, leadId: o.lead_id, company: l.company_name, contact: l.contact_name ?? null, domain: l.domain ?? null };
}
export function sealReview(snapshot: any) {
  const payload = Buffer.from(JSON.stringify(snapshot)).toString("base64url");
  return payload + "." + createHmac("sha256", required("SDR_TOKEN_SECRET")).update(payload).digest("base64url");
}
export function readReview(token: unknown, id: string, actor: string) {
  try {
    if (typeof token !== "string" || token.length > 24000) throw new Error();
    const parts = token.split(".");
    if (parts.length !== 2) throw new Error();
    const expected = createHmac("sha256", required("SDR_TOKEN_SECRET")).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const snapshot = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (snapshot.id !== id || snapshot.actor !== actor || snapshot.exp <= Date.now()) throw new Error();
    return snapshot;
  } catch { throw new Error("outreach_review_invalid_or_expired"); }
}
export async function previewOutreach(id: string, input: any, actor: string) {
  const { o, l } = await records(id);
  const recipient = recipientSnapshot(o, l, input);
  const variant = messageVariant(o.qualification?.commercial_classification?.type, input.message_variant);
  const message = emailContent(o, l, 0, variant, recipient.recipient_kind);
  const snapshot = { id, actor, context: reviewContext(o, l), exp: Date.now() + 15 * 60000, ...recipient, message_variant: variant,
    message_subject: message.subject, message_body: message.body, enqueue_mode: "manual_pilot" };
  return { id, ...recipient, message_variant: variant, ...message, reviewToken: sealReview(snapshot), url: `${origin()}/comercial/conhecer/${signToken(id)}` };
}
export async function enqueueReviewedOutreach(id: string, token: unknown, actor: string) {
  const snapshot = readReview(token, id, actor);
  const { o, l } = await records(id);
  if (JSON.stringify(snapshot.context) !== JSON.stringify(reviewContext(o, l))) throw new Error("outreach_review_context_changed");
  const current = recipientSnapshot(o, l, snapshot);
  messageVariant(o.qualification?.commercial_classification?.type, snapshot.message_variant);
  if (JSON.stringify(current) !== JSON.stringify({ recipient_kind: snapshot.recipient_kind, recipient_address: snapshot.recipient_address, recipient_source_url: snapshot.recipient_source_url, recipient_evidence: snapshot.recipient_evidence }))
    throw new Error("outreach_recipient_changed");
  return checked(await db().rpc("sdr_enqueue_reviewed_email", { p_opportunity: id, p_snapshot: snapshot, p_actor: actor }));
}
