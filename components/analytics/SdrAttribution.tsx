"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
export default function SdrAttribution() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("bc_ref");
    if (token && token.length <= 512) {
      try {
        sessionStorage.setItem("bc_ref", token);
        url.searchParams.delete("bc_ref");
        window.history.replaceState(null, "", url);
      } catch {
        /* Storage may be disabled. */
      }
    }
    let stopped = false;
    const identify = async () => {
      let ref: string | null = null;
      try {
        ref = sessionStorage.getItem("bc_ref");
      } catch {
        return;
      }
      if (!ref || stopped) return;
      const r = await fetch("/api/public/sdr/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ref }),
      }).catch(() => null);
      if (r?.ok)
        try {
          sessionStorage.removeItem("bc_ref");
        } catch {}
    };
    void identify();
    const { data } = createClient().auth.onAuthStateChange(() => {
      setTimeout(() => {
        void identify();
      }, 0);
    });
    return () => {
      stopped = true;
      data.subscription.unsubscribe();
    };
  }, []);
  return null;
}
