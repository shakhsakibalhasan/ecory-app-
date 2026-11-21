import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    // Session recovery must not leave the whole profile spinner running indefinitely.
    const timer = setTimeout(() => { if (active) setReady(true); }, 12000);
    const accept = (s: Session | null) => { if (!active) return; clearTimeout(timer); setSession(s); setReady(true); };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => accept(s));
    void supabase.auth.getSession().then(({ data }) => accept(data.session)).catch(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);
  return { session, user: session?.user ?? null, ready };
}

const BN = "০১২৩৪৫৬৭৮৯";
export const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN.charAt(Number(d)));
export const takaBn = (n: number, lang: "bn" | "en") => (lang === "bn" ? `৳${bnDigits(n.toLocaleString("en-IN"))}` : `৳${n.toLocaleString("en-IN")}`);

