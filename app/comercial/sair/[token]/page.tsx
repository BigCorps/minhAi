import { notFound } from "next/navigation";
import { readToken } from "@/lib/sdr/server";
import Unsubscribe from "@/components/sdr/Unsubscribe";
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
  if (!readToken(token)) notFound();
  return <Unsubscribe token={token} />;
}
