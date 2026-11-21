import { EditableIcon } from "@/lib/presentation";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { Check, Loader2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Shell } from "@/components/Shell";
import { BDT, useStore, type DictKey } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/track")({
  staticData: { sitemap: false },
  validateSearch: (
    s: Record<string, unknown>,
  ): { code?: string | undefined; token?: string | undefined } => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    token: typeof s["token"] === "string" ? s["token"] : undefined,
  }),
  head: () => ({ meta: [{ title: "অর্ডার ট্র্যাকিং — ইকোরি" }, { name: "description", content: "আপনার ইকোরি অর্ডারের অবস্থা ও ডেলিভারি অগ্রগতি দেখুন।" }, { property: "og:title", content: "অর্ডার ট্র্যাকিং — ইকোরি" }, { property: "og:description", content: "আপনার ইকোরি অর্ডারের অবস্থা ও ডেলিভারি অগ্রগতি দেখুন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Track,
});
const STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;
type Result = {
  code: string;
  status: string;
  customer_name: string;
  address: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  payment_method: string;
  tracking: string;
  created_at: string;
  events: { status: string; occurred_at: string }[];
  items: { name: string; qty: number; price: number; variant?: string; image?: string }[];
};
function Track() {
  const { t, lang } = useStore();
  const bn = lang === "bn";
  const search = Route.useSearch();
  const { user } = useSession();
  const ownOrders = useQuery({
    queryKey: ["tracking-own-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r = await supabase
        .from("orders")
        .select("code,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const [code, setCode] = useState(search.code ?? "");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Result | null | "none">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (search.code) setCode(search.code);
    else if (ownOrders.data?.length) setCode(ownOrders.data[0]!.code);
  }, [search.code, ownOrders.data]);
  useEffect(() => {
    if (!search.code || !search.token) return;
    let active = true;
    setBusy(true);
    void (async () => {
      try {
        const r = await (supabase as SupabaseClient).rpc("track_order_token", {
          _code: search.code,
          _token: search.token,
        });
        if (r.error) throw r.error;
        if (active) setRes(r.data ?? "none");
      } catch {
        if (active)
          setError(
            bn
              ? "ট্র্যাকিং লিংকটি কাজ করছে না। ফোন নম্বর দিয়ে চেষ্টা করুন।"
              : "Tracking link unavailable. Enter your phone number.",
          );
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [search.code, search.token, bn]);
  const date = (v?: string) =>
    v
      ? new Date(v).toLocaleString(bn ? "bn-BD" : "en-GB", {
          timeZone: "Asia/Dhaka",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : bn
        ? "সময় রেকর্ড নেই"
        : "Time not recorded";
  const go = async () => {
    if (busy) return;
    setError("");
    setRes(null);
    if (!code.trim() || !/^01\d{9}$/.test(phone.trim())) {
      setError(
        bn
          ? "অর্ডার কোড ও সঠিক ১১ সংখ্যার ফোন নম্বর দিন"
          : "Enter order code and valid 11-digit mobile",
      );
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await (supabase as SupabaseClient).rpc("track_order_details", {
        _code: code.trim(),
        _phone: phone.trim(),
      });
      if (error) throw error;
      setRes(data ?? "none");
    } catch {
      setError(
        bn ? "ট্র্যাকিং লোড হয়নি। আবার চেষ্টা করুন।" : "Could not load tracking. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const input =
    "w-full rounded-2xl bg-card px-4 py-3 text-sm shadow-pill outline-none focus:ring-2 focus:ring-ring";
  const idx = res && res !== "none" ? STEPS.indexOf(res.status as (typeof STEPS)[number]) : -1;
  return (
    <Shell title={t("track")}>
      <form
        className="space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        {user && !!ownOrders.data?.length && (
          <select
            aria-label={bn ? "আপনার অর্ডার" : "Your order"}
            className={input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            {!ownOrders.data.some((o) => o.code === code) && (
              <option value={code}>{code || "Order"}</option>
            )}
            {ownOrders.data.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code}
              </option>
            ))}
          </select>
        )}
        {(!user || !ownOrders.data?.length) && (
          <input
            className={input}
            maxLength={80}
            placeholder={t("orderCode2")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
        <input
          className={input}
          maxLength={11}
          inputMode="tel"
          placeholder={t("phone")}
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
                .replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c)))
                .replace(/\D/g, ""),
            )
          }
        />
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && (
            <EditableIcon name="icon_loader2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </EditableIcon>
          )}
          {t("trackBtn")}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {res === "none" && <p className="mt-6 text-center text-muted-foreground">{t("notFound")}</p>}
      {res && res !== "none" && (
        <section className="mt-5 space-y-4 rounded-3xl bg-card p-4 shadow-pill">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {bn ? "ট্র্যাকিং কোড" : "Tracking code"}
              </p>
              <p className="break-all font-extrabold">{res.tracking || res.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bn ? "ইনভয়েস" : "Invoice"}: {res.code}
              </p>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              {t(res.status as DictKey)}
            </span>
          </div>
          <div className="border-t pt-3">
            <p className="font-bold">{res.customer_name}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{res.address}</p>
            <p className="mt-2 text-xs">
              {bn ? "অর্ডারের সময়" : "Ordered"}: {date(res.created_at)}
            </p>
          </div>
          <div className="space-y-3">
            {res.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {it.image && (
                  <img
                    src={it.image}
                    alt=""
                    className="h-12 w-12 shrink-0 bg-secondary object-contain p-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.variant?.replace(/\bjars?\b/gi, "files")} × {it.qty}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold">{BDT(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t pt-3 text-sm">
            <p className="flex justify-between">
              <span>{t("subtotal")}</span>
              <span>{BDT(res.subtotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>{t("delivery")}</span>
              <span>{BDT(res.delivery_fee)}</span>
            </p>
            <p className="flex justify-between font-bold">
              <span>{t("total")}</span>
              <span>{BDT(res.total)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("payment")}: {res.payment_method.toUpperCase()}
            </p>
          </div>
          <ol className="space-y-3 border-t pt-3">
            {(res.status === "cancelled" ? [...STEPS.slice(0, 1), "cancelled"] : STEPS).map(
              (status, i) => {
                const ev = res.events?.filter((e) => e.status === status).at(-1);
                const reached = !!ev || (res.status !== "cancelled" && i <= idx);
                return (
                  <li key={status} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${reached ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {reached && (
                        <EditableIcon name="icon_check">
                          <Check className="h-4 w-4" />
                        </EditableIcon>
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{t(status as DictKey)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ev
                          ? date(ev.occurred_at)
                          : reached
                            ? date()
                            : bn
                              ? "অপেক্ষমাণ"
                              : "Pending"}
                      </p>
                    </div>
                  </li>
                );
              },
            )}
          </ol>
        </section>
      )}
    </Shell>
  );
}
