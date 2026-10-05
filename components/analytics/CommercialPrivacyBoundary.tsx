"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ClarityInit from "./ClarityInit";
import ProductAnalytics from "./ProductAnalytics";
import PlatformActivityTracker from "./PlatformActivityTracker";

// Individual commercial URLs contain bearer tokens; do not send them to analytics.
export default function CommercialPrivacyBoundary() {
  const path = usePathname();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(!new URL(location.href).searchParams.has("bc_ref"));
  }, []);
  if (!allowed || path.startsWith("/comercial") || path.startsWith("/admin"))
    return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <ClarityInit />
      <ProductAnalytics />
      <PlatformActivityTracker />
    </>
  );
}
