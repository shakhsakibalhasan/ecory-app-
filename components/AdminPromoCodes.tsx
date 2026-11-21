import { AdminEditor } from "./AdminEditor";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { uiClient } from "@/lib/presentation";
import { BDT } from "@/lib/store";
import { toast } from "sonner";
type Promo = {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  enabled: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
};
const blank = {
  code: "",
  discount_type: "fixed",
  value: "",
  min_subtotal: "0",
  max_discount: "",
  enabled: true,
  expires_at: "",
  max_uses: "",
};
export function AdminPromoCodes() {
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => {
      const r = await uiClient
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data as Promo[];
    },
  });
  const input = "mt-1 w-full rounded-lg border bg-white p-2 text-sm";
  const reset = () => {
    setId(null);
    setForm(blank);
    setEditing(false);
  };
  const save = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value),
      min = Number(form.min_subtotal);
    const cap = form.max_discount ? Number(form.max_discount) : null;
    const limit = form.max_uses ? Number(form.max_uses) : null;
    if (
      !/^[A-Z0-9_-]{3,32}$/.test(code) ||
      !Number.isInteger(value) ||
      value <= 0 ||
      (form.discount_type === "percent" && value > 100) ||
      !Number.isInteger(min) ||
      min < 0 ||
      (cap !== null && (!Number.isInteger(cap) || cap <= 0)) ||
      (limit !== null && (!Number.isInteger(limit) || limit <= 0))
    )
      return void toast.error("সঠিক কোড ও ছাড়ের মান দিন");
    setBusy(true);
    try {
      const row = {
        code,
        discount_type: form.discount_type,
        value,
        min_subtotal: min,
        max_discount: cap,
        enabled: form.enabled,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        max_uses: limit,
      };
      const r = id
        ? await uiClient.from("promo_codes").update(row).eq("id", id)
        : await uiClient.from("promo_codes").insert(row);
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["admin-promos"] });
      reset();
      toast.success("প্রোমো কোড সেভ হয়েছে");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (p: Promo) => {
    setId(p.id);
    setForm({
      code: p.code,
      discount_type: p.discount_type,
      value: String(p.value),
      min_subtotal: String(p.min_subtotal),
      max_discount: p.max_discount == null ? "" : String(p.max_discount),
      enabled: p.enabled,
      max_uses: p.max_uses == null ? "" : String(p.max_uses),
      expires_at: p.expires_at
        ? new Date(
            new Date(p.expires_at).getTime() - new Date(p.expires_at).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    });
    setEditing(true);
  };
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">প্রোমো কোড ও ছাড়</h2>
      <p className="text-sm">
        সাধারণ প্রোডাক্ট ও অফার—দুই Checkout-এ কাজ করবে। ছাড় পণ্যের মোট দামে প্রযোজ্য; ডেলিভারি
        চার্জে নয়। ব্যবহারের সীমা অর্ডার তৈরি হলে গণনা হয়।
      </p>
      {q.isError ? (
        <p role="alert">প্রোমো সেটিংস লোড হয়নি। Promo SQL চালানো হয়েছে কি না দেখুন।</p>
      ) : null}
      {!editing ? (
        <button
          data-admin-open
          className="rounded-lg bg-primary px-4 py-2"
          onClick={() => {
            reset();
            setEditing(true);
          }}
        >
          নতুন প্রোমো কোড
        </button>
      ) : (
        <AdminEditor
          title={id ? "প্রোমো কোড সম্পাদনা" : "নতুন প্রোমো কোড"}
          onBack={() => {
            if (!busy) reset();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              প্রোমো কোড
              <input
                className={input}
                value={form.code}
                placeholder="ECORY10"
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="text-sm">
              ছাড়ের ধরন
              <select
                className={input}
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              >
                <option value="fixed">নির্দিষ্ট টাকা</option>
                <option value="percent">শতাংশ (%)</option>
              </select>
            </label>
            {(
              [
                ["value", form.discount_type === "percent" ? "ছাড় (%)" : "ছাড় (৳)"],
                ["min_subtotal", "ন্যূনতম পণ্যের মোট দাম (৳)"],
                ["max_discount", "সর্বোচ্চ ছাড় (৳)—ঐচ্ছিক"],
                ["max_uses", "মোট ব্যবহারের সীমা—ঐচ্ছিক"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  data-admin-translation-field={typeof key === "string" ? key : undefined}
                  type="number"
                  min={key === "min_subtotal" ? 0 : 1}
                  className={input}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="text-sm">
              মেয়াদ শেষ—ঐচ্ছিক (স্থানীয় সময়)
              <input
                type="datetime-local"
                className={input}
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              চালু রাখুন
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button
                disabled={busy}
                onClick={() => void save()}
                className="rounded-lg bg-primary px-4 py-2"
              >
                সেভ করুন
              </button>
              <button disabled={busy} onClick={reset}>
                বাতিল
              </button>
            </div>
          </div>
        </AdminEditor>
      )}
      {!editing &&
        (q.isLoading ? (
          <p>লোড হচ্ছে…</p>
        ) : (
          q.data?.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"
            >
              <div>
                <strong>{p.code}</strong>
                <p className="text-sm">
                  {p.discount_type === "percent" ? `${p.value}%` : BDT(p.value)} ছাড় ·{" "}
                  {p.enabled ? "চালু" : "বন্ধ"} · ব্যবহৃত {p.used_count}
                  {p.max_uses ? ` / ${p.max_uses}` : ""}
                </p>
                <p className="text-xs">
                  ন্যূনতম {BDT(p.min_subtotal)}
                  {p.expires_at ? ` · মেয়াদ ${new Date(p.expires_at).toLocaleString("bn-BD")}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => edit(p)} className="admin-edit-button underline">
                  এডিট
                </button>
                <button
                  className="admin-delete-button text-destructive"
                  onClick={async () => {
                    if (!confirm("এই প্রোমো কোড মুছবেন?")) return;
                    const r = await uiClient.from("promo_codes").delete().eq("id", p.id);
                    if (r.error) toast.error(r.error.message);
                    else void qc.invalidateQueries({ queryKey: ["admin-promos"] });
                  }}
                >
                  মুছুন
                </button>
              </div>
            </article>
          ))
        ))}
    </section>
  );
}
