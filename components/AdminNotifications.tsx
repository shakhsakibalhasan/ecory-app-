import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notificationPath } from "@/lib/notification-links";
import type { Message } from "./Notifications";
const db = supabase as SupabaseClient;
function localDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 6 * 3600000).toISOString().slice(0, 16);
}
type ScheduledMessage = Message & { schedule_mode?: "once" | "daily"; daily_time?: string | null };
const emptyForm = {
  schedule_mode: "once" as "once" | "daily",
  daily_time: "08:00",
  title_bn: "",
  title_en: "",
  body_bn: "",
  body_en: "",
  kind: "offer",
  link: "",
  starts_at: "",
  expires_at: "",
};
const input = "w-full rounded-xl border bg-card px-3 py-2 text-sm";
const slots = [
  ["morning", "সকাল", "07:30"],
  ["noon", "দুপুর", "13:30"],
  ["afternoon", "বিকাল", "16:30"],
  ["evening", "সন্ধ্যা", "19:00"],
  ["night", "রাত", "21:00"],
] as const;
export function AdminNotifications() {
  const [tab, setTab] = useState<"offer" | "tips">("offer");
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">নোটিফিকেশন</h2>
      <div role="tablist" className="grid grid-cols-2 gap-2">
        {(["offer", "tips"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-3 font-bold ${tab === t ? "bg-primary text-white" : "border bg-white"}`}
          >
            {t === "offer" ? "Offer" : "Health Tips"}
          </button>
        ))}
      </div>
      {tab === "offer" ? (
        <NotificationEditor key="offer" />
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            বাংলাদেশ সময় অনুযায়ী একবার অথবা প্রতিদিন পাঠানোর সময় বাছুন। প্রতিদিনের জন্য নতুন করে
            টিপস যোগ করতে হবে না।
          </p>
          {slots.map(([key, label, time], index) => (
            <details key={key} className="rounded-xl border bg-white p-4">
              <summary className="cursor-pointer font-bold">
                Health Tips {index + 1} — {label}
              </summary>
              <div className="mt-4">
                <NotificationEditor slot={key} label={label} time={time} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
function NotificationEditor({
  slot,
  label,
  time,
}: {
  slot?: string;
  label?: string;
  time?: string;
}) {
  const blank = () => {
    let starts_at = "";
    if (slot) {
      const date = localDate(new Date().toISOString()).slice(0, 10);
      let candidate = `${date}T${time}`;
      if (new Date(candidate + "+06:00").getTime() <= Date.now())
        candidate = `${localDate(new Date(Date.now() + 86400000).toISOString()).slice(0, 10)}T${time}`;
      starts_at = candidate;
    }
    return {
      ...emptyForm,
      kind: slot ? "tip" : "offer",
      starts_at,
      daily_time: time || "08:00",
      schedule_mode: slot ? ("daily" as const) : ("once" as const),
    };
  };
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);
  const [deleting, setDeleting] = useState<ScheduledMessage | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    void qc.invalidateQueries({ queryKey: ["notification-inbox"] });
    void qc.invalidateQueries({ queryKey: ["notification-delivery-log"] });
  };
  const edit = (m: ScheduledMessage) => {
    setEditing(m);
    setF({
      schedule_mode: m.schedule_mode || "once",
      daily_time: m.daily_time?.slice(0, 5) || time || "08:00",
      title_bn: m.title_bn || "",
      title_en: m.title_en || "",
      body_bn: m.body_bn || "",
      body_en: m.body_en || "",
      kind: m.kind,
      link: m.link || "",
      starts_at: localDate(m.starts_at),
      expires_at: localDate(m.expires_at),
    });
    formRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const { data, error } = await db
        .from("notification_messages")
        .delete()
        .eq("id", deleting.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("মেসেজ মুছতে অনুমতি পাওয়া যায়নি।");
      if (editing?.id === deleting.id) {
        setEditing(null);
        setF(blank());
      }
      setDeleting(null);
      refresh();
      toast.success("মেসেজ মুছে ফেলা হয়েছে।");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "মুছতে পারেনি");
    } finally {
      setBusy(false);
    }
  };
  const q = useQuery({
    queryKey: ["admin-notifications", slot || "offer"],
    queryFn: async () => {
      let request = db.from("notification_messages").select("*");
      request = slot ? request.eq("kind", "tip").eq("tip_slot", slot) : request.neq("kind", "tip");
      const { data, error } = await request.order("starts_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data as (ScheduledMessage & { tip_slot?: string })[]).filter((m) =>
        slot ? m.kind === "tip" && m.tip_slot === slot : m.kind !== "tip",
      );
    },
  });
  const logs = useQuery({
    queryKey: ["notification-delivery-log"],
    queryFn: async () => {
      const { data, error } = await db
        .from("notification_delivery_log")
        .select("id,sent_at,status,error")
        .order("sent_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as {
        id: string;
        sent_at: string;
        status: string;
        error: string;
      }[];
    },
    refetchInterval: 30000,
  });
  const settings = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await db
        .from("notification_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as { daily_enabled: boolean };
    },
  });
  const save = async (sendNow = false) => {
    if (busy) return;
    if (!f.title_bn.trim() || !f.body_bn.trim()) {
      toast.error("শিরোনাম ও মেসেজ দিন");
      return;
    }
    const link = slot ? "" : f.link.trim() ? notificationPath(f.link) : "";
    if (link === null) {
      toast.error(
        "Ecory-এর product বা offer page-এর লিংক দিন, যেমন https://ecory.app/offers?offer=ID",
      );
      return;
    }
    if (f.schedule_mode === "daily" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.daily_time)) {
      toast.error("প্রতিদিন পাঠানোর সঠিক সময় দিন");
      return;
    }
    if (
      f.schedule_mode === "once" &&
      !sendNow &&
      !editing &&
      (!f.starts_at || new Date(f.starts_at + "+06:00").getTime() <= Date.now())
    ) {
      toast.error("Schedule করার জন্য ভবিষ্যতের তারিখ ও সময় দিন। এখন পাঠাতে এখনই পাঠান চাপুন।");
      return;
    }
    const start =
      f.schedule_mode === "daily"
        ? !sendNow && editing?.schedule_mode === "daily"
          ? editing.starts_at
          : new Date().toISOString()
        : !sendNow && f.starts_at
          ? new Date(f.starts_at + "+06:00").toISOString()
          : new Date().toISOString();
    const end = f.expires_at ? new Date(f.expires_at + "+06:00").toISOString() : null;
    if (end && end <= start) {
      toast.error("শেষের সময় শুরুর পরে হতে হবে");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...f,
        daily_time: f.schedule_mode === "daily" ? f.daily_time : null,
        kind: slot ? "tip" : f.kind,
        tip_slot: slot || null,
        link,
        starts_at: start,
        expires_at: end,
        ...(sendNow ? { published: true } : {}),
        ...(!sendNow && f.schedule_mode === "once" ? { dispatched_at: null } : {}),
      };
      const result = editing
        ? await db.from("notification_messages").update(payload).eq("id", editing.id).select("id")
        : await db
            .from("notification_messages")
            .insert({ ...payload, published: true })
            .select("id");
      if (result.error) throw result.error;
      const savedId = result.data?.[0]?.id;
      if (!savedId) throw new Error("মেসেজ সেভ করার অনুমতি পাওয়া যায়নি।");
      setEditing({ ...editing, ...payload, id: savedId } as Message);
      let delivered = false;
      if (sendNow) {
        const { data, error } = await supabase.functions.invoke("daily-notifications", {
          body: { message_id: savedId },
        });
        if (error || data?.error || data?.message_id !== savedId) {
          toast.error(
            "মেসেজ সেভ হয়েছে, কিন্তু push পাঠানো যায়নি। Edge Function update ও delivery logs দেখুন।",
          );
        } else {
          delivered =
            f.schedule_mode === "once" && Number(data?.sent) > 0 && Number(data?.failed) === 0;
          toast.success(
            `মেসেজ সেভ হয়েছে। পাঠানো: ${data?.sent ?? 0}; ব্যর্থ: ${data?.failed ?? 0}; ${data?.reason ?? ""}`,
          );
          void qc.invalidateQueries({
            queryKey: ["notification-delivery-log"],
          });
        }
      } else
        toast.success(
          f.schedule_mode === "daily"
            ? "প্রতিদিনের Schedule সেভ হয়েছে। স্বয়ংক্রিয় Schedule চালু রাখুন।"
            : editing
              ? "মেসেজের পরিবর্তন সেভ হয়েছে।"
              : "মেসেজ সেভ হয়েছে। লেখা এখানে থাকবে; এখনই পাঠান চাপলে পাঠাবে।",
        );
      if (delivered) {
        setF(blank());
        setEditing(null);
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সেভ হয়নি");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section ref={formRef} className="space-y-4 scroll-mt-4">
      <h3 className="font-bold">{label ? `${label} — Health Tips` : "Offer ও মেসেজ"}</h3>
      <p className="rounded-2xl bg-primary-soft p-3 text-sm">
        প্রতিদিন পাঠান বাছলে একই tips বা offer নির্ধারিত সময়ে প্রতিদিন একবার যাবে। সময় বাংলাদেশ সময়
        অনুযায়ী। এখনই পাঠান দিয়েও পাঠানো যায়; daily মেসেজ একই ফোনে একই দিনে দ্বিতীয়বার যাবে না।
      </p>
      {settings.error && (
        <p role="alert" className="text-sm text-destructive">
          Notification SQL migration চালাতে হবে।
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          disabled={!settings.data || busy}
          checked={settings.data?.daily_enabled ?? false}
          onChange={async (e) => {
            const { error } = await db
              .from("notification_settings")
              .update({ daily_enabled: e.target.checked })
              .eq("id", 1);
            if (error) toast.error(error.message);
            else
              void qc.invalidateQueries({
                queryKey: ["notification-settings"],
              });
          }}
        />
        স্বয়ংক্রিয় Schedule চালু
      </label>
      {editing && (
        <div className="rounded-xl border bg-primary-soft p-3 text-sm">
          মেসেজ সম্পাদনা করছেন। Daily Schedule-এ পরিবর্তন সেভ করলে পরের পাঠানোর সময় নতুন লেখা যাবে।
          আজ আগে পাঠানো ফোনে একই মেসেজ আবার যাবে না।
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["title_bn", "title_en", "body_bn", "body_en", "link"] as const)
          .filter((k) => !slot || k !== "link")
          .map((k) => (
            <label
              key={k}
              className={`text-sm ${slot && k.startsWith("body") ? "sm:col-span-2" : ""}`}
            >
              {
                {
                  title_bn: "শিরোনাম (বাংলা)",
                  title_en: "Title (English)",
                  body_bn: slot ? "স্বাস্থ্য টিপস (বাংলা)" : "মেসেজ (বাংলা)",
                  body_en: slot ? "Health Tips (English)" : "Message (English)",
                  link: "Product / Offer page-এর লিংক",
                }[k]
              }
              {slot && k.startsWith("body") ? (
                <textarea
                  data-admin-translation-field={typeof k === "string" ? k : undefined}
                  className={`${input} min-h-32 resize-y`}
                  rows={5}
                  maxLength={1500}
                  placeholder={
                    k === "body_bn"
                      ? "সহজ ভাষায় আজকের স্বাস্থ্য টিপস লিখুন…"
                      : "Write today's health tip in simple language…"
                  }
                  value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              ) : (
                <input
                  data-admin-translation-field={typeof k === "string" ? k : undefined}
                  className={input}
                  maxLength={k === "link" ? 2048 : k.startsWith("body") ? 1500 : 200}
                  value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              )}
            </label>
          ))}
        <label hidden={!!slot} className="text-sm">
          ধরন
          <select
            className={input}
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value })}
          >
            <option value="offer">Offer</option>
            <option value="message">Message</option>
          </select>
        </label>
        <label className="text-sm">
          পাঠানোর নিয়ম
          <select
            className={input}
            value={f.schedule_mode}
            onChange={(e) => setF({ ...f, schedule_mode: e.target.value as "once" | "daily" })}
          >
            <option value="once">একবার পাঠান</option>
            <option value="daily">প্রতিদিন পাঠান</option>
          </select>
        </label>
        {f.schedule_mode === "daily" && (
          <label className="text-sm">
            প্রতিদিন পাঠানোর সময় (বাংলাদেশ)
            <input
              type="time"
              className={input}
              value={f.daily_time}
              onChange={(e) => setF({ ...f, daily_time: e.target.value })}
            />
          </label>
        )}
        {(["starts_at", "expires_at"] as const)
          .filter((k) => f.schedule_mode !== "daily" || k !== "starts_at")
          .map((k) => (
            <label key={k} className="text-sm">
              {k === "starts_at" ? "পাঠানোর তারিখ ও সময় (বাংলাদেশ)" : "শেষের সময় (ঐচ্ছিক)"}
              <input
                data-admin-translation-field={typeof k === "string" ? k : undefined}
                type="datetime-local"
                className={input}
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
            </label>
          ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60"
        >
          {editing ? "পরিবর্তন সেভ / Schedule" : "সেভ / Schedule করুন"}
        </button>
        <button
          disabled={busy}
          onClick={() => void save(true)}
          className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "অপেক্ষা করুন…" : "এখনই পাঠান"}
        </button>
        {editing && (
          <button
            disabled={busy}
            className="rounded-full border px-4 py-2"
            onClick={() => {
              setEditing(null);
              setF(blank());
            }}
          >
            সম্পাদনা বাতিল
          </button>
        )}
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { data, error } = await supabase.functions.invoke("daily-notifications", {
                body: {},
              });
              if (error || data?.error) throw error || new Error(data.error);
              void qc.invalidateQueries({ queryKey: ["notification-delivery-log"] });
              toast.success(
                `পাঠানো: ${data.sent ?? 0}; ব্যর্থ: ${data.failed ?? 0}; ${data.reason ?? ""}`,
              );
            } catch (e) {
              toast.error("Push পাঠানো যায়নি। Firebase/Edge Function সেটআপ ও logs দেখুন।");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-full border px-4 py-2"
        >
          পরবর্তী নির্ধারিত মেসেজ পাঠান
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Daily মেসেজ একই ফোনে দিনে একবার; একবারের Schedule একই ফোনে মোট একবার। এখনই পাঠালে daily
        মেসেজ আজ আবার automatic যাবে না।
      </p>
      {deleting && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-notification-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-lg">
            <h3 id="delete-notification-title" className="font-bold">
              মেসেজ মুছে ফেলবেন?
            </h3>
            <p className="mt-2 break-words text-sm">{deleting.title_bn}</p>
            <p className="mt-2 text-sm">
              অ্যাপের তালিকা থেকে সরবে। ফোনে ইতিমধ্যে পাঠানো notification ফেরত নেওয়া যাবে না।
            </p>
            <div className="mt-4 flex gap-2">
              <button
                disabled={busy}
                onClick={() => setDeleting(null)}
                className="admin-delete-button rounded-full border px-4 py-2"
              >
                বাতিল
              </button>
              <button
                disabled={busy}
                onClick={remove}
                className="rounded-full bg-destructive px-4 py-2 text-white"
              >
                {busy ? "মুছছে…" : "মুছে ফেলুন"}
              </button>
            </div>
          </div>
        </div>
      )}
      {q.error ? (
        <p role="alert">মেসেজ লোড হয়নি। SQL সেটআপ পরীক্ষা করুন।</p>
      ) : (
        q.data?.map((m) => (
          <div key={m.id} className="rounded-xl border p-3">
            <p className="font-bold break-words">{m.title_bn}</p>
            <p className="mt-1 text-sm whitespace-pre-wrap break-words">{m.body_bn}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => edit(m)}
                className="admin-edit-button rounded-full border px-3 py-1.5 text-sm"
              >
                Edit / সম্পাদনা
              </button>
              <button
                disabled={busy}
                onClick={() => setDeleting(m)}
                className="admin-delete-button rounded-full border border-destructive px-3 py-1.5 text-sm text-destructive"
              >
                Delete / মুছুন
              </button>
            </div>
            <p className="text-xs">
              {m.schedule_mode === "daily"
                ? `প্রতিদিন ${m.daily_time?.slice(0, 5)} (বাংলাদেশ)`
                : `${m.kind} · ${new Date(m.starts_at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", hour12: true })}`}
              {" · "}
              {m.published ? "চালু" : "বন্ধ"}
            </p>
            <button
              className="mt-2 text-xs underline"
              onClick={async () => {
                const { error } = await db
                  .from("notification_messages")
                  .update({ published: !m.published })
                  .eq("id", m.id);
                if (error) toast.error(error.message);
                else
                  void qc.invalidateQueries({
                    queryKey: ["admin-notifications"],
                  });
              }}
            >
              {m.published ? "বন্ধ করুন" : "প্রকাশ করুন"}
            </button>
          </div>
        ))
      )}
      <div className="rounded-xl border p-3">
        <h3 className="font-bold">সাম্প্রতিক push delivery</h3>
        <button
          className="mt-2 rounded-full border px-3 py-1 text-sm"
          onClick={() => void logs.refetch()}
        >
          ফলাফল Refresh করুন
        </button>
        {logs.error && (
          <p role="alert" className="mt-2 text-sm">
            Delivery record লোড হয়নি। আবার Refresh করুন।
          </p>
        )}
        {logs.data?.map((l) => (
          <p key={l.id} className="mt-1 break-words text-xs">
            {new Date(l.sent_at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", hour12: true })}{" "}
            · {l.status} {l.error}
          </p>
        ))}
        {!logs.data?.length && (
          <p className="mt-2 text-xs text-muted-foreground">এখনও delivery record নেই।</p>
        )}
      </div>
    </section>
  );
}
