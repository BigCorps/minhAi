import { notFound } from "next/navigation";
import { db, checked, readToken } from "@/lib/sdr/server";
import { isProduct } from "@/lib/sdr/catalog";
import Qualification from "@/components/sdr/Qualification";
export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const id = readToken(token);
  if (!id) notFound();
  const d = db();
  const o = checked(
    await d
      .from("sdr_opportunities")
      .select("product,lead_id")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!o || !isProduct(o.product)) notFound();
  const l = checked(
    await d
      .from("sdr_leads")
      .select("phone,suppressed_at")
      .eq("id", o.lead_id)
      .single(),
  )!;
  if (l.suppressed_at)
    return <main className="p-10">Seu contato está descadastrado.</main>;
  return (
    <Qualification
      token={token}
      product={o.product}
      phoneSuffix={l.phone ? String(l.phone).slice(-4) : null}
    />
  );
}
