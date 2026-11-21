import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Loader2, Plus, Trash2, LayoutDashboard, Package, Grid2X2, PanelsTopLeft, ShoppingBag, Users, Bell, BookOpen, Star, BadgeCheck, Stethoscope, MapPin, Settings2, History as HistoryIcon, Leaf, ExternalLink, LogOut, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BDT } from "@/lib/store";
import { AdminNotifications } from "@/components/AdminNotifications";
import { uploadMedia } from "@/lib/admin-upload";
import "@/admin.css";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  head: () => ({
    meta: [
      { title: "অ্যাডমিন প্যানেল — ইকোরি" },
      { name: "description", content: "ইকোরি স্টোর পরিচালনা।" },
      { property: "og:title", content: "অ্যাডমিন প্যানেল — ইকোরি" },
      { property: "og:description", content: "ইকোরি স্টোর পরিচালনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Row = Record<string, unknown>;
const input = "w-full rounded-xl border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn = "rounded-full px-5 py-2 text-sm font-semibold";
const str = (v: unknown) => (v == null ? "" : String(v));

/* ---------------- unsaved-change guard ---------------- */
function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}
const confirmDiscard = (dirty: boolean) => !dirty || confirm("সেভ না করা পরিবর্তন বাতিল হবে। নিশ্চিত?");

/* ---------------- access ---------------- */
function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(
    () =>
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("recovery") === "1" ||
        new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"),
  );
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setIsAdmin(null);
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);
  if (!ready) return null;
  if (recovery)
    return (
      <AdminPasswordReset
        hasSession={!!session}
        onDone={() => {
          setRecovery(false);
          window.history.replaceState(null, "", window.location.pathname);
        }}
      />
    );
  if (!session) return <Login />;
  if (isAdmin === null)
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="font-semibold">এই অ্যাকাউন্টের ({session.user.email}) অ্যাডমিন অনুমতি নেই।</p>
        <p className="mt-2 text-sm text-muted-foreground">
          বিদ্যমান অ্যাডমিন বা ডেভেলপারকে এই ইমেইলটি অ্যাডমিন করতে বলুন।
        </p>
        <button className="mt-4 underline" onClick={() => supabase.auth.signOut()}>
          লগআউট
        </button>
      </div>
    );
  return <Panel email={session.user.email ?? ""} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const reset = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("আগে সঠিক ইমেইল লিখুন।");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin?recovery=1`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset link পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  };
  const go = async () => {
    setBusy(true);
    const r = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (r.error) toast.error(r.error.message);
  };
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-3 rounded-3xl bg-card p-6 shadow-soft">
      <h1 className="text-xl font-extrabold">অ্যাডমিন লগইন</h1>
      <input className={input} placeholder="ইমেইল" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className={input}
        type="password"
        placeholder="পাসওয়ার্ড"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <button
        disabled={busy}
        onClick={go}
        className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground"
      >
        {busy ? "..." : "লগইন"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={reset}
        className="w-full py-2 text-sm font-semibold text-primary underline"
      >
        পাসওয়ার্ড ভুলে গেছেন?
      </button>
      {sent && (
        <p role="status" className="text-sm">
          এই ইমেইলে অ্যাকাউন্ট থাকলে reset link পাঠানো হবে। Inbox ও Spam দেখুন।
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">অ্যাকাউন্ট না থাকলে প্রোফাইল পেজ থেকে খুলুন।</p>
    </div>
  );
}

function AdminPasswordReset({ hasSession, onDone }: { hasSession: boolean; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const save = async () => {
    if (password.length < 8) {
      toast.error("কমপক্ষে ৮ অক্ষরের password দিন।");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("দুই password মিলছে না।");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password পরিবর্তন হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-3 rounded-3xl bg-card p-6 shadow-soft">
      <h1 className="text-xl font-extrabold">নতুন পাসওয়ার্ড সেট করুন</h1>
      {done ? (
        <>
          <p role="status">Password পরিবর্তন হয়েছে।</p>
          <button
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground"
            onClick={onDone}
          >
            অ্যাডমিনে যান
          </button>
        </>
      ) : hasSession ? (
        <>
          <input
            className={input}
            aria-label="নতুন পাসওয়ার্ড"
            autoComplete="new-password"
            type="password"
            placeholder="নতুন password (কমপক্ষে ৮ অক্ষর)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className={input}
            aria-label="পাসওয়ার্ড নিশ্চিত করুন"
            autoComplete="new-password"
            type="password"
            placeholder="আবার নতুন password লিখুন"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground"
            onClick={save}
          >
            {busy ? "সেভ হচ্ছে…" : "নতুন password সেভ করুন"}
          </button>
        </>
      ) : (
        <>
          <p role="alert">Reset link যাচাই হয়নি বা মেয়াদ শেষ। নতুন link নিয়ে আবার খুলুন।</p>
          <button className="underline" onClick={onDone}>
            লগইনে ফিরে যান
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- shell ---------------- */
type Tab =
  | "dash"
  | "products"
  | "categories"
  | "banners"
  | "orders"
  | "customers"
  | "notifications"
  | "posts"
  | "reviews"
  | "certifications"
  | "doctors"
  | "outlets"
  | "settings"
  | "history";
const TABS: [Tab, string][] = [
  ["dash", "ড্যাশবোর্ড"],
  ["products", "প্রোডাক্ট"],
  ["categories", "ক্যাটাগরি"],
  ["banners", "ব্যানার ও হোম"],
  ["orders", "অর্ডার"],
  ["customers", "গ্রাহক"],
  ["notifications", "নোটিফিকেশন"],
  ["posts", "আর্টিকেল/টিপস"],
  ["reviews", "রিভিউ"],
  ["certifications", "সার্টিফিকেট"],
  ["doctors", "ডাক্তার"],
  ["outlets", "আউটলেট"],
  ["settings", "যোগাযোগ, ডেলিভারি, পেমেন্ট"],
  ["history", "পরিবর্তনের ইতিহাস"],
];
const TAB_ICONS: Record<Tab, LucideIcon> = {
  dash: LayoutDashboard, products: Package, categories: Grid2X2, banners: PanelsTopLeft,
  orders: ShoppingBag, customers: Users, notifications: Bell, posts: BookOpen,
  reviews: Star, certifications: BadgeCheck, doctors: Stethoscope, outlets: MapPin,
  settings: Settings2, history: HistoryIcon,
};
function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("dash");
  const activeLabel = TABS.find(([key]) => key === tab)?.[1] ?? "ড্যাশবোর্ড";
  return (
    <div className="ecory-admin">
      <div className="admin-frame">
        <header className="admin-header">
          <div className="admin-brand">
            <span className="admin-brand-icon"><Leaf aria-hidden="true" size={25} /></span>
            <div><p className="admin-eyebrow">ECORY • ADMIN</p><h1>ইকোরি অ্যাডমিন</h1></div>
          </div>
          <div className="admin-account">
            <span className="admin-email" title={email}>{email}</span>
            <div className="admin-actions">
              <Link to="/" className="admin-action"><ExternalLink size={16} aria-hidden="true" />অ্যাপ দেখুন</Link>
              <button type="button" onClick={() => supabase.auth.signOut()} className="admin-action"><LogOut size={16} aria-hidden="true" />লগআউট</button>
            </div>
          </div>
        </header>
        <div className="admin-layout">
          <nav className="admin-nav" aria-label="অ্যাডমিন মেনু">
            <p className="admin-menu-heading">স্টোর পরিচালনা</p>
            <div className="admin-menu-grid">
              {TABS.map(([key, label]) => {
                const Icon = TAB_ICONS[key];
                return (
                  <button type="button" key={key} onClick={() => setTab(key)}
                    aria-current={tab === key ? "page" : undefined}
                    className={`admin-menu-item${tab === key ? " is-active" : ""}`}>
                    <Icon size={19} aria-hidden="true" /><span>{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          <main className="admin-content" aria-label={activeLabel}>
            <div className="admin-section-heading"><p className="admin-eyebrow">ইকোরি স্টোর</p><h2>{activeLabel}</h2></div>
            <div className="admin-section-body">
        {tab === "dash" && <Dashboard go={setTab} />}
        {tab === "products" && <Products />}
        {tab === "categories" && <Categories />}
        {tab === "banners" && <Banners />}
        {tab === "orders" && <Orders />}
        {tab === "customers" && <AdminCustomers />}
        {tab === "notifications" && <AdminNotifications />}
        {tab === "settings" && <Settings />}
        {tab === "history" && <History />}
        {(["posts", "reviews", "certifications", "doctors", "outlets"] as const).map(
          (t) => tab === t && <Crud key={t} table={t} />,
        )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ go }: { go: (t: Tab) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const [p, o, pending] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return { products: p.count ?? 0, orders: o.count ?? 0, pending: pending.count ?? 0 };
    },
  });
  const cards: [Tab, string, string][] = [
    ["products", "প্রোডাক্ট", `${data?.products ?? "…"} টি`],
    ["orders", "অর্ডার", `${data?.orders ?? "…"} টি · অপেক্ষমাণ ${data?.pending ?? "…"}`],
    ["categories", "ক্যাটাগরি", "নাম, আইকন, ক্রম"],
    ["banners", "ব্যানার ও হোম", "স্লাইড ও সেকশন"],
    ["customers", "গ্রাহক", "প্রোফাইল ও যোগাযোগের তথ্য"],
    ["posts", "কনটেন্ট", "আর্টিকেল ও টিপস"],
    ["settings", "সেটিংস", "যোগাযোগ, ডেলিভারি, পেমেন্ট"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(([t, l, s]) => (
        <button
          key={t}
          onClick={() => go(t)}
          className="rounded-3xl bg-card p-5 text-left shadow-pill transition hover:-translate-y-0.5"
        >
          <p className="text-lg font-extrabold">{l}</p>
          <p className="mt-1 text-sm text-muted-foreground">{s}</p>
        </button>
      ))}
    </div>
  );
}

/* ---------------- shared inputs ---------------- */
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-xs font-semibold ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Text({
  v,
  on,
  area,
  type = "text",
  ph,
}: {
  v: unknown;
  on: (s: string) => void;
  area?: boolean;
  type?: string;
  ph?: string | undefined;
}) {
  return area ? (
    <textarea rows={4} className={input} value={str(v)} placeholder={ph} onChange={(e) => on(e.target.value)} />
  ) : (
    <input type={type} className={input} value={str(v)} placeholder={ph} onChange={(e) => on(e.target.value)} />
  );
}
const num = (s: string) => (s.trim() === "" ? null : Math.round(Number(s)));

function Upload({
  value,
  onChange,
  folder,
  accept = "image/jpeg,image/png",
  label = "ছবি",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string>();
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setWarn(undefined);
    try {
      const r = await uploadMedia(f, folder);
      onChange(r.url);
      setWarn(r.warning);
      toast.success("আপলোড হয়েছে — সেভ করতে ভুলবেন না");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ECEDE9]">
        {value ? (
          value.includes(".pdf") ? (
            <span className="text-xs font-bold">PDF</span>
          ) : (
            <img src={value} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <label className={`${btn} inline-flex cursor-pointer items-center gap-2 bg-muted`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {value ? `${label} বদলান` : `${label} আপলোড`}
          <input type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <input
          className={`${input} text-xs`}
          placeholder="অথবা লিংক পেস্ট করুন"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {warn && <p className="text-xs font-semibold text-destructive">{warn}</p>}
      </div>
    </div>
  );
}

function Actions({
  onSave,
  onCancel,
  saving,
  extra,
}: {
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t bg-background/95 py-3 sm:col-span-2">
      <button disabled={saving} onClick={onSave} className={`${btn} bg-primary text-primary-foreground`}>
        {saving ? "সেভ হচ্ছে…" : "সেভ"}
      </button>
      {onCancel && (
        <button onClick={onCancel} className={`${btn} bg-muted`}>
          বাতিল
        </button>
      )}
      {extra}
    </div>
  );
}

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  const t = a[i]!;
  a[i] = a[j]!;
  a[j] = t;
  return a;
}

/** Drag-and-drop list with up/down buttons as an accessible alternative. Calls onReorder with the new order. */
function SortList<T extends { id: string }>({
  items,
  render,
  onReorder,
}: {
  items: T[];
  render: (t: T) => ReactNode;
  onReorder: (items: T[]) => void;
}) {
  const [dragI, setDragI] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div
          key={it.id}
          draggable
          onDragStart={() => setDragI(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragI === null || dragI === i) return;
            const a = [...items];
            const [m] = a.splice(dragI, 1);
            a.splice(i, 0, m!);
            setDragI(null);
            onReorder(a);
          }}
          className="flex items-center gap-2 rounded-2xl bg-card p-2 shadow-pill"
        >
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">{render(it)}</div>
          <button
            aria-label="উপরে"
            disabled={i === 0}
            onClick={() => onReorder(move(items, i, -1))}
            className="rounded-full p-1.5 hover:bg-muted disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            aria-label="নিচে"
            disabled={i === items.length - 1}
            onClick={() => onReorder(move(items, i, 1))}
            className="rounded-full p-1.5 hover:bg-muted disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

async function saveOrder(
  table: "products" | "categories" | "banners" | "reviews" | "outlets" | "certifications",
  rows: { id: string }[],
  key = "id",
) {
  const results = await Promise.all(
    rows.map((r, i) =>
      supabase
        .from(table)
        .update({ sort: i + 1 } as never)
        .eq(key, r.id),
    ),
  );
  const err = results.find((r) => r.error)?.error;
  if (err) toast.error(err.message);
  else toast.success("ক্রম সেভ হয়েছে");
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/* ---------------- products ---------------- */
type Variant = {
  id: string;
  kind: "pack" | "gram" | "ml" | "other";
  label_bn: string;
  label_en: string;
  sku: string;
  price: number;
  old_price: number | null;
  in_stock: boolean;
  disabled: boolean;
  image: string;
};
const STATUS_LABEL: Record<string, string> = {
  draft: "ড্রাফট",
  published: "প্রকাশিত",
  hidden: "লুকানো",
  archived: "আর্কাইভ",
};

function useAdminProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("sort")).data ?? [],
  });
}
function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [],
  });
}

function Products() {
  const { data = [], refetch } = useAdminProducts();
  const [edit, setEdit] = useState<Row | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const inv = useInvalidate();
  if (edit)
    return (
      <ProductEditor
        initial={edit}
        all={data as Row[]}
        onDone={() => {
          setEdit(null);
          refetch();
          inv("products");
        }}
      />
    );
  const list = data.filter(
    (p) =>
      (filter === "all" ? p.status !== "archived" : p.status === filter) &&
      (!q || `${p.name_bn} ${p.name_en} ${p.sku}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            setEdit({
              status: "draft",
              active: true,
              variants: [],
              gallery: [],
              related: [],
              badges: [],
              in_stock: true,
              price: 0,
              sort: data.length + 1,
            })
          }
          className={`${btn} bg-ink text-background inline-flex items-center gap-1`}
        >
          <Plus className="h-4 w-4" />
          নতুন প্রোডাক্ট
        </button>
        <input className={`${input} max-w-xs`} placeholder="খুঁজুন…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">সব (আর্কাইভ ছাড়া)</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        টেনে বা তীর চিহ্ন দিয়ে সাজান — এই ক্রমেই হোম, সব প্রোডাক্ট ও ক্যাটাগরি পেজে দেখাবে।
      </p>
      <SortList
        items={list}
        onReorder={async (a) => {
          await saveOrder("products", a);
          refetch();
          inv("products");
        }}
        render={(p) => (
          <div className="flex items-center gap-3">
            <img src={p.image} alt="" className="h-12 w-12 rounded-xl bg-[#ECEDE9] object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.name_bn}</p>
              <p className="text-xs text-muted-foreground">
                {BDT(p.price)} · {STATUS_LABEL[p.status] ?? p.status}
                {p.featured ? " · ফিচার্ড" : ""}
                {!p.in_stock ? " · স্টক নেই" : ""}
              </p>
            </div>
            <button onClick={() => setEdit(p as Row)} className="text-sm font-semibold underline">
              এডিট
            </button>
          </div>
        )}
      />
    </div>
  );
}

function ProductEditor({ initial, all, onDone }: { initial: Row; all: Row[]; onDone: () => void }) {
  const [v, setV] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);
  const { data: cats = [] } = useAdminCategories();
  const { data: certs = [] } = useQuery({
    queryKey: ["admin-certs"],
    queryFn: async () => (await supabase.from("certifications").select("id,title").order("sort")).data ?? [],
  });
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  useDirtyGuard(dirty);
  const set = (k: string, val: unknown) => setV((o) => ({ ...o, [k]: val }));
  const variants = (Array.isArray(v["variants"]) ? v["variants"] : []) as Variant[];
  const gallery = (Array.isArray(v["gallery"]) ? v["gallery"] : []) as string[];
  const related = (Array.isArray(v["related"]) ? v["related"] : []) as string[];
  const badges = (Array.isArray(v["badges"]) ? v["badges"] : []) as string[];
  const setVariants = (a: Variant[]) => set("variants", a);
  const price = Number(v["price"] ?? 0),
    old = v["old_price"] == null ? null : Number(v["old_price"]);

  const validate = () => {
    if (!str(v["name_bn"]).trim()) return "বাংলা নাম দিন";
    if (!Number.isInteger(price) || price <= 0) return "সঠিক দাম দিন (৳, পূর্ণ সংখ্যা)";
    if (old != null && old <= price) return "আগের/নিয়মিত দাম বিক্রয়মূল্যের চেয়ে বেশি হতে হবে";
    for (const x of variants) {
      if (!x.label_bn.trim()) return "প্রতিটি ভ্যারিয়েন্টের বাংলা নাম দিন";
      if (!Number.isInteger(x.price) || x.price <= 0) return `"${x.label_bn}" এর দাম ঠিক করুন`;
      if (x.old_price != null && x.old_price <= x.price)
        return `"${x.label_bn}" এর নিয়মিত দাম বিক্রয়মূল্যের চেয়ে বেশি হতে হবে`;
    }
    return null;
  };
  const save = async () => {
    const err = validate();
    if (err) return void toast.error(err);
    setSaving(true);
    const { id, created_at, ...rest } = v;
    void created_at;
    rest["active"] = rest["status"] !== "archived";
    rest["category_key"] = rest["category"];
    const r = id
      ? await supabase
          .from("products")
          .update(rest as never)
          .eq("id", id as string)
      : await supabase.from("products").insert(rest as never);
    setSaving(false);
    if (r.error) return void toast.error(r.error.message);
    toast.success("সেভ হয়েছে");
    onDone();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
        <Field label="অবস্থা">
          <select className={input} value={str(v["status"])} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ক্যাটাগরি">
          <select className={input} value={str(v["category"])} onChange={(e) => set("category", e.target.value)}>
            <option value="">—</option>
            {cats.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name_bn}
              </option>
            ))}
          </select>
        </Field>
        <Field label="নাম (বাংলা) *">
          <Text v={v["name_bn"]} on={(s) => set("name_bn", s)} />
        </Field>
        <Field label="Name (English)">
          <Text v={v["name_en"]} on={(s) => set("name_en", s)} />
        </Field>
        <Field label="বিক্রয়মূল্য ৳ *">
          <Text type="number" v={v["price"]} on={(s) => set("price", num(s) ?? 0)} />
        </Field>
        <Field label="নিয়মিত দাম ৳ (ছাড় দেখাতে)">
          <Text type="number" v={v["old_price"]} on={(s) => set("old_price", num(s))} />
        </Field>
        {old != null && old > price && (
          <p className="text-xs font-semibold text-primary sm:col-span-2">
            সাশ্রয়: {BDT(old - price)} ({Math.round(((old - price) / old) * 100)}%)
          </p>
        )}
        <Field label="অফার লেখা">
          <Text v={v["offer_text_bn"]} on={(s) => set("offer_text_bn", s)} ph="যেমন: ৩টি নিলে ফ্রি ডেলিভারি" />
        </Field>
        <Field label="SKU">
          <Text v={v["sku"]} on={(s) => set("sku", s)} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={v["in_stock"] !== false}
            onChange={(e) => set("in_stock", e.target.checked)}
          />
          স্টকে আছে
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={!!v["featured"]} onChange={(e) => set("featured", e.target.checked)} />
          ফিচার্ড
        </label>
        <Field label="সংক্ষিপ্ত বিবরণ (বাংলা)" wide>
          <Text area v={v["short_bn"]} on={(s) => set("short_bn", s)} />
        </Field>
        {(
          [
            ["desc", "পূর্ণ বিবরণ"],
            ["benefits", "উপকারিতা"],
            ["ingredients", "উপাদান"],
            ["usage", "খাওয়ার/ব্যবহারের নিয়ম"],
            ["caution", "সতর্কতা"],
          ] as const
        ).flatMap(([k, l]) => [
          <Field key={`${k}_bn`} label={`${l} (বাংলা)`}>
            <Text area v={v[`${k}_bn`]} on={(s) => set(`${k}_bn`, s)} />
          </Field>,
          <Field key={`${k}_en`} label={`${l} (English)`}>
            <Text area v={v[`${k}_en`]} on={(s) => set(`${k}_en`, s)} />
          </Field>,
        ])}

        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-extrabold">প্রধান ছবি</p>
          <Upload folder="products" value={str(v["image"])} onChange={(u) => set("image", u)} />
          <p className="text-xs text-muted-foreground">
            স্বচ্ছ ব্যাকগ্রাউন্ডের PNG দিন। অটো ব্যাকগ্রাউন্ড রিমুভ এখানে নেই — প্রসেস করা PNG আপলোড করুন। অ্যাপের ধূসর
            বক্স ও কোণা আলাদাভাবে যোগ হয়।
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-extrabold">গ্যালারি</p>
          <SortList
            items={gallery.map((g, i) => ({ id: `${i}-${g}`, g }))}
            onReorder={(a) =>
              set(
                "gallery",
                a.map((x) => x.g),
              )
            }
            render={(x) => (
              <div className="flex items-center gap-2">
                <img src={x.g} alt="" className="h-12 w-12 rounded-lg bg-[#ECEDE9] object-contain" />
                <span className="min-w-0 flex-1 truncate text-xs">{x.g}</span>
                <button className="text-xs underline" onClick={() => set("image", x.g)}>
                  প্রধান করুন
                </button>
                <button
                  aria-label="মুছুন"
                  onClick={() =>
                    set(
                      "gallery",
                      gallery.filter((g) => g !== x.g),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            )}
          />
          <Upload
            folder="products"
            value=""
            label="গ্যালারি ছবি"
            onChange={(u) => u && set("gallery", [...gallery, u])}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold">ভ্যারিয়েন্ট (প্যাক / গ্রাম / ml)</p>
            <button
              className={`${btn} bg-muted`}
              onClick={() =>
                setVariants([
                  ...variants,
                  {
                    id: crypto.randomUUID().slice(0, 8),
                    kind: "pack",
                    label_bn: "",
                    label_en: "",
                    sku: "",
                    price: 0,
                    old_price: null,
                    in_stock: true,
                    disabled: false,
                    image: "",
                  },
                ])
              }
            >
              + ভ্যারিয়েন্ট
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            প্যাক সংখ্যা এখানে; কার্টের পরিমাণ গ্রাহক আলাদাভাবে বাছাই করবে। আগের অর্ডারের দাম বদলাবে না।
          </p>
          <SortList
            items={variants}
            onReorder={setVariants}
            render={(x) => {
              const up = (patch: Partial<Variant>) =>
                setVariants(variants.map((y) => (y.id === x.id ? { ...y, ...patch } : y)));
              return (
                <div className={`grid gap-2 sm:grid-cols-4 ${x.disabled ? "opacity-60" : ""}`}>
                  <select
                    className={input}
                    value={x.kind ?? "pack"}
                    onChange={(e) => up({ kind: e.target.value as Variant["kind"] })}
                  >
                    <option value="pack">প্যাক/পিস</option>
                    <option value="gram">গ্রাম</option>
                    <option value="ml">ml</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                  <input
                    className={input}
                    placeholder="নাম (বাংলা)"
                    value={x.label_bn}
                    onChange={(e) => up({ label_bn: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder="Label (EN)"
                    value={x.label_en}
                    onChange={(e) => up({ label_en: e.target.value })}
                  />
                  <input
                    className={input}
                    placeholder="SKU"
                    value={x.sku ?? ""}
                    onChange={(e) => up({ sku: e.target.value })}
                  />
                  <input
                    className={input}
                    type="number"
                    placeholder="বিক্রয়মূল্য ৳"
                    value={x.price || ""}
                    onChange={(e) => up({ price: num(e.target.value) ?? 0 })}
                  />
                  <input
                    className={input}
                    type="number"
                    placeholder="নিয়মিত দাম ৳"
                    value={x.old_price ?? ""}
                    onChange={(e) => up({ old_price: num(e.target.value) })}
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={x.in_stock !== false}
                      onChange={(e) => up({ in_stock: e.target.checked })}
                    />
                    স্টকে
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={!!x.disabled}
                      onChange={(e) => up({ disabled: e.target.checked })}
                    />
                    বন্ধ
                    <button
                      aria-label="মুছুন"
                      className="ml-auto"
                      onClick={() => setVariants(variants.filter((y) => y.id !== x.id))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </label>
                  {x.old_price != null && x.old_price > x.price && (
                    <p className="text-xs text-primary sm:col-span-4">সাশ্রয় {BDT(x.old_price - x.price)}</p>
                  )}
                  <div className="sm:col-span-4">
                    <Upload
                      folder="variants"
                      value={x.image ?? ""}
                      label="ভ্যারিয়েন্ট ছবি"
                      onChange={(u) => up({ image: u })}
                    />
                  </div>
                </div>
              );
            }}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-extrabold">ব্যাজ ও সার্টিফিকেট</p>
          <p className="text-xs text-muted-foreground">প্রমাণ থাকলেই কেবল চালু করুন।</p>
          <div className="flex flex-wrap gap-3">
            {[["bsti", "BSTI"], ...certs.map((c) => [`cert:${c.id}`, c.title])].map(([k, l]: string[]) => (
              <label key={k!} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={badges.includes(k!)}
                  onChange={(e) => set("badges", e.target.checked ? [...badges, k!] : badges.filter((b) => b !== k))}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-extrabold">সম্পর্কিত প্রোডাক্ট</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {all
              .filter((p) => p["id"] !== v["id"] && p["status"] !== "archived")
              .map((p) => {
                const id = p["id"] as string;
                const on = related.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => set("related", on ? related.filter((r) => r !== id) : [...related, id])}
                    className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {str(p["name_bn"])}
                  </button>
                );
              })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            checked={v["manual_locked"] !== false}
            onChange={(e) => set("manual_locked", e.target.checked)}
          />
          ওয়েবসাইট ইমপোর্ট যেন এই প্রোডাক্ট না বদলায় (ম্যানুয়াল লক)
        </label>

        <Actions
          saving={saving}
          onSave={save}
          onCancel={() => confirmDiscard(dirty) && onDone()}
          extra={
            v["id"] ? (
              <button
                className={`${btn} bg-muted`}
                onClick={() => set("status", v["status"] === "archived" ? "hidden" : "archived")}
              >
                {v["status"] === "archived" ? "আর্কাইভ থেকে ফেরান" : "আর্কাইভ করুন"}
              </button>
            ) : null
          }
        />
      </div>

      <aside className="h-fit space-y-2 rounded-2xl bg-card p-4 shadow-pill lg:sticky lg:top-4">
        <p className="text-xs font-bold text-muted-foreground">মোবাইল প্রিভিউ</p>
        <div className="mx-auto w-48 rounded-[1.1rem] bg-background p-2">
          <div className="aspect-square overflow-hidden rounded-[17px] bg-[#ECEDE9]">
            {str(v["image"]) && <img src={str(v["image"])} alt="" className="h-full w-full object-contain p-2" />}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-bold">{str(v["name_bn"]) || "নাম"}</p>
          <p className="text-sm font-extrabold">
            {BDT(price)}{" "}
            {old != null && old > price && (
              <span className="text-xs font-normal text-muted-foreground line-through">{BDT(old)}</span>
            )}
          </p>
          {str(v["offer_text_bn"]) && <p className="text-[11px] text-primary">{str(v["offer_text_bn"])}</p>}
        </div>
        {!!v["id"] && v["status"] === "published" && (
          <a
            href={`/product/${v["id"]}`}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm underline"
          >
            লাইভ পেজ দেখুন
          </a>
        )}
        {dirty && <p className="text-center text-xs font-semibold text-destructive">সেভ না করা পরিবর্তন আছে</p>}
      </aside>
    </div>
  );
}

/* ---------------- categories ---------------- */
function Categories() {
  const { data = [], refetch } = useAdminCategories();
  const [draft, setDraft] = useState<Row | null>(null);
  const inv = useInvalidate();
  const save = async () => {
    if (!str(draft!["key"]).trim() || !str(draft!["name_bn"]).trim()) return void toast.error("কী ও বাংলা নাম দিন");
    const { error } = await supabase.from("categories").upsert(draft as never);
    if (error) return void toast.error(error.message);
    toast.success("সেভ হয়েছে");
    setDraft(null);
    refetch();
    inv("categories");
  };
  return (
    <div className="space-y-3">
      <button
        onClick={() => setDraft({ key: "", name_bn: "", name_en: "", icon: "", visible: true, sort: data.length + 1 })}
        className={`${btn} bg-ink text-background`}
      >
        + নতুন ক্যাটাগরি
      </button>
      {draft && (
        <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
          <Field label="কী (ইংরেজি, স্থায়ী)">
            <Text
              v={draft["key"]}
              on={(s) => setDraft({ ...draft, key: s.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft["visible"] !== false}
              onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
            />
            দেখাবে
          </label>
          <Field label="নাম (বাংলা)">
            <Text v={draft["name_bn"]} on={(s) => setDraft({ ...draft, name_bn: s })} />
          </Field>
          <Field label="Name (English)">
            <Text v={draft["name_en"]} on={(s) => setDraft({ ...draft, name_en: s })} />
          </Field>
          <div className="sm:col-span-2">
            <Upload
              folder="icons"
              label="আইকন"
              value={str(draft["icon"])}
              onChange={(u) => setDraft({ ...draft, icon: u })}
            />
          </div>
          <Actions onSave={save} onCancel={() => setDraft(null)} />
        </div>
      )}
      <SortList
        items={data.map((c) => ({ ...c, id: c.key }))}
        onReorder={async (a) => {
          await saveOrder("categories", a, "key");
          refetch();
          inv("categories");
        }}
        render={(c) => (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-bold">
              {c.name_bn}{" "}
              <span className="font-normal text-muted-foreground">
                ({c.key}){!c.visible && " · লুকানো"}
              </span>
            </span>
            <button className="underline" onClick={() => setDraft(c as Row)}>
              এডিট
            </button>
          </div>
        )}
      />
      <p className="text-xs text-muted-foreground">প্রোডাক্টের ক্যাটাগরি প্রোডাক্ট এডিটর থেকে বদলান।</p>
    </div>
  );
}

/* ---------------- banners & home ---------------- */
function Banners() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("sort")).data ?? [],
  });
  const [draft, setDraft] = useState<Row | null>(null);
  const inv = useInvalidate();
  const save = async () => {
    if (!str(draft!["image"])) return void toast.error("ছবি দিন");
    const { id, created_at, ...rest } = draft!;
    void created_at;
    const r = id
      ? await supabase
          .from("banners")
          .update(rest as never)
          .eq("id", id as string)
      : await supabase.from("banners").insert(rest as never);
    if (r.error) return void toast.error(r.error.message);
    toast.success("সেভ হয়েছে");
    setDraft(null);
    refetch();
    inv("banners");
  };
  const del = async (id: string) => {
    if (!confirm("মুছবেন?")) return;
    await supabase.from("banners").delete().eq("id", id);
    refetch();
    inv("banners");
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        কোনো ব্যানার না থাকলে অ্যাপের বর্তমান ডিফল্ট স্লাইডগুলো দেখাবে। স্লাইড হাতে সোয়াইপ হয় ও নিচের বাঁকা ডিজাইন
        অ্যাপ নিজে যোগ করে। অনুপাত প্রায় ২.১৫:১ রাখুন।
      </p>
      <button
        onClick={() => setDraft({ image: "", link: "", alt_bn: "", visible: true, sort: data.length + 1 })}
        className={`${btn} bg-ink text-background`}
      >
        + নতুন ব্যানার
      </button>
      {draft && (
        <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Upload folder="banners" value={str(draft["image"])} onChange={(u) => setDraft({ ...draft, image: u })} />
          </div>
          <Field label="লিংক (যেমন /product/…)">
            <Text v={draft["link"]} on={(s) => setDraft({ ...draft, link: s })} />
          </Field>
          <Field label="ছবির বিবরণ (অ্যাক্সেসিবিলিটি)">
            <Text v={draft["alt_bn"]} on={(s) => setDraft({ ...draft, alt_bn: s })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft["visible"] !== false}
              onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
            />
            দেখাবে
          </label>
          {str(draft["image"]) && (
            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-muted-foreground">মোবাইল প্রিভিউ</p>
              <div className="mt-1 w-80 max-w-full overflow-hidden rounded-[1.75rem]" style={{ aspectRatio: "2.15/1" }}>
                <img src={str(draft["image"])} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          <Actions onSave={save} onCancel={() => setDraft(null)} />
        </div>
      )}
      <SortList
        items={data}
        onReorder={async (a) => {
          await saveOrder("banners", a);
          refetch();
          inv("banners");
        }}
        render={(b) => (
          <div className="flex items-center gap-3 text-sm">
            <img src={b.image} alt="" className="h-12 w-24 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate">
              {b.alt_bn || b.link || "—"}
              {!b.visible && " · লুকানো"}
            </span>
            <button className="underline" onClick={() => setDraft(b as Row)}>
              এডিট
            </button>
            <button aria-label="মুছুন" onClick={() => del(b.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        )}
      />
      <p className="text-xs text-muted-foreground">
        ফিচার্ড প্রোডাক্ট প্রোডাক্ট এডিটরের “ফিচার্ড” অপশন দিয়ে নির্ধারণ করুন।
      </p>
    </div>
  );
}

/* ---------------- orders ---------------- */
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_BN: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};
const PAY: Record<string, string> = { cod: "COD", bkash: "বিকাশ", nagad: "নগদ", online: "অনলাইন" };
function Orders() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () =>
      (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState("all");
  const update = async (id: string, patch: { status?: string; tracking?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("আপডেট হয়েছে");
      refetch();
    }
  };
  const list = data.filter((o) => f === "all" || o.status === f);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        এখানে শুধু অ্যাপ থেকে নিশ্চিত হওয়া অর্ডার। WhatsApp জিজ্ঞাসা এখানে আসে না। অর্ডারের দাম ও আইটেম পরিবর্তনযোগ্য
        নয়।
      </p>
      <select className={`${input} w-auto`} value={f} onChange={(e) => setF(e.target.value)}>
        <option value="all">সব</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_BN[s]}
          </option>
        ))}
      </select>
      {!list.length && <p className="text-muted-foreground">কোনো অর্ডার নেই।</p>}
      {list.map((o) => (
        <OrderCard key={o.id} o={o} update={update} />
      ))}
    </div>
  );
}
function OrderCard({
  o,
  update,
}: {
  o: {
    id: string;
    code: string;
    created_at: string;
    status: string;
    tracking: string;
    customer_name: string;
    phone: string;
    address: string;
    area: string;
    items: unknown;
    payment_method: string;
    trx_id: string | null;
    subtotal: number;
    delivery_fee: number;
    total: number;
    note: string | null;
  };
  update: (id: string, p: { status?: string; tracking?: string }) => void;
}) {
  const [tr, setTr] = useState(o.tracking ?? "");
  return (
    <div className="rounded-2xl bg-card p-4 text-sm shadow-pill">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          {o.code} · {new Date(o.created_at).toLocaleString("bn-BD")}
        </p>
        <select
          className={`${input} w-auto`}
          value={o.status}
          onChange={(e) => update(o.id, { status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_BN[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1">
        {o.customer_name} ·{" "}
        <a className="underline" href={`tel:${o.phone}`}>
          {o.phone}
        </a>
      </p>
      <p className="text-muted-foreground">
        {o.address} ({o.area === "dhaka" ? "ঢাকা" : "ঢাকার বাইরে"})
      </p>
      <p className="mt-1">
        {(o.items as { name: string; qty: number; price: number; variant?: string }[])
          .map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ""} × ${i.qty} @ ${BDT(i.price)}`)
          .join(", ")}
      </p>
      <p className="mt-1 font-semibold">
        {PAY[o.payment_method] ?? o.payment_method}
        {o.trx_id ? ` · TrxID: ${o.trx_id}` : ""} · সাবটোটাল {BDT(o.subtotal)} + ডেলিভারি {BDT(o.delivery_fee)} ={" "}
        {BDT(o.total)}
      </p>
      {o.note && <p className="text-muted-foreground">নোট: {o.note}</p>}
      <div className="mt-2 flex gap-2">
        <input
          className={input}
          placeholder="ট্র্যাকিং তথ্য (কুরিয়ার ও নম্বর)"
          value={tr}
          onChange={(e) => setTr(e.target.value)}
        />
        <button className={`${btn} bg-muted`} onClick={() => update(o.id, { tracking: tr })}>
          সেভ
        </button>
      </div>
    </div>
  );
}

/* ---------------- settings ---------------- */
function Settings() {
  const inv = useInvalidate();
  const [init, setInit] = useState<Row | null>(null);
  const [v, setV] = useState<Row | null>(null);
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setInit(data ?? { id: 1 });
        setV(data ?? { id: 1 });
      });
  }, []);
  const dirty = JSON.stringify(v) !== JSON.stringify(init);
  useDirtyGuard(dirty);
  if (!v) return null;
  const set = (k: string, val: unknown) => setV({ ...v, [k]: val });
  const pay = (v["payments"] ?? { cod: true, bkash: true, nagad: true, online: false }) as Record<string, boolean>;
  const save = async () => {
    for (const k of ["facebook", "instagram", "tiktok", "youtube", "imo"])
      if (str(v[k]) && !/^https?:\/\//.test(str(v[k]))) return void toast.error(`${k} লিংক https:// দিয়ে শুরু করুন`);
    if (!(Number(v["fee_dhaka"]) >= 0) || !(Number(v["fee_outside"]) >= 0))
      return void toast.error("ডেলিভারি চার্জ ঠিক করুন");
    const { error } = await supabase.from("site_settings").upsert({ ...v, id: 1 } as never);
    if (error) return void toast.error(error.message);
    toast.success("সেভ হয়েছে");
    setInit(v);
    inv("settings");
  };
  const t = (k: string, l: string, ph?: string) => (
    <Field key={k} label={l}>
      <Text v={v[k]} ph={ph} on={(s) => set(k, s)} />
    </Field>
  );
  return (
    <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
      <p className="text-sm font-extrabold sm:col-span-2">যোগাযোগ</p>
      {t("support_phone", "সাধারণ কল নম্বর")}
      {t("whatsapp", "WhatsApp (8801…)")}
      {t("email", "সাপোর্ট ইমেইল")}
      {t("imo", "imo লিংক (যাচাইকৃত হলে)", "https://")}
      <p className="text-sm font-extrabold sm:col-span-2">সোশ্যাল লিংক (খালি থাকলে লুকানো থাকবে)</p>
      {t("facebook", "Facebook", "https://")}
      {t("instagram", "Instagram", "https://")}
      {t("tiktok", "TikTok", "https://")}
      {t("youtube", "YouTube", "https://")}
      <p className="text-sm font-extrabold sm:col-span-2">ডেলিভারি</p>
      <Field label="ঢাকা ৳">
        <Text type="number" v={v["fee_dhaka"]} on={(s) => set("fee_dhaka", num(s) ?? 0)} />
      </Field>
      <Field label="ঢাকার বাইরে ৳">
        <Text type="number" v={v["fee_outside"]} on={(s) => set("fee_outside", num(s) ?? 0)} />
      </Field>
      <Field label="এত টাকার বেশি অর্ডারে ফ্রি ডেলিভারি ৳ (খালি = বন্ধ)">
        <Text type="number" v={v["free_delivery_min"]} on={(s) => set("free_delivery_min", num(s))} />
      </Field>
      <p className="text-sm font-extrabold sm:col-span-2">পেমেন্ট</p>
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        {(["cod", "bkash", "nagad"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pay[k] !== false}
              onChange={(e) => set("payments", { ...pay, [k]: e.target.checked })}
            />
            {PAY[k]}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" disabled checked={false} readOnly />
          অনলাইন গেটওয়ে (সংযুক্ত নয়)
        </label>
      </div>
      {t("bkash", "বিকাশ নম্বর")}
      {t("nagad", "নগদ নম্বর")}
      <Actions onSave={save} onCancel={() => confirmDiscard(dirty) && setV(init)} />
    </div>
  );
}

/* ---------------- history ---------------- */
function History() {
  const { data = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () =>
      (await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const { data: products = [] } = useAdminProducts();
  const names = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name_bn])), [products]);
  return (
    <div className="space-y-2">
      {!data.length && <p className="text-muted-foreground">এখনো কোনো পরিবর্তন রেকর্ড হয়নি।</p>}
      {data.map((a) => {
        const c = a.changes as Record<string, unknown>;
        const price = c["price"] as [number, number] | undefined;
        return (
          <div key={a.id} className="rounded-2xl bg-card p-3 text-sm shadow-pill">
            <p className="font-semibold">
              {names[a.row_id] ?? a.row_id} · {a.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleString("bn-BD")} ·{" "}
              {a.actor ? `অ্যাডমিন ${a.actor.slice(0, 8)}` : "সিস্টেম"}
              {price && price[0] !== price[1] ? ` · দাম ${BDT(price[0])} → ${BDT(price[1])}` : ""}
              {c["variants_changed"] ? " · ভ্যারিয়েন্ট বদলেছে" : ""}
              {c["content_changed"] ? " · কনটেন্ট বদলেছে" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- generic content ---------------- */
type F = {
  key: string;
  label: string;
  type?: "text" | "area" | "number" | "select" | "bool" | "image" | "file" | "product" | "date";
  options?: [string, string][];
};
type CT = "posts" | "reviews" | "certifications" | "doctors" | "outlets";
const CFG: Record<CT, { title: string; sortable?: boolean; fields: F[]; note?: string }> = {
  posts: {
    title: "title_bn",
    note: "নতুন কনটেন্ট ড্রাফট হিসেবে সেভ হয়; প্রকাশ করলে তবেই গ্রাহক দেখবে।",
    fields: [
      {
        key: "status",
        label: "অবস্থা",
        type: "select",
        options: [
          ["draft", "ড্রাফট"],
          ["published", "প্রকাশিত"],
          ["archived", "আর্কাইভ"],
        ],
      },
      {
        key: "kind",
        label: "ধরন",
        type: "select",
        options: [
          ["article", "আর্টিকেল"],
          ["tip", "টিপস"],
        ],
      },
      {
        key: "category",
        label: "ক্যাটাগরি",
        type: "select",
        options: [
          ["", "—"],
          ["digestion", "পেট ও হজম"],
          ["herbs", "পাতা ও ভেষজ"],
          ["seeds", "বীজ ও পুষ্টি"],
          ["foods", "প্রাকৃতিক খাবার"],
          ["daily", "দৈনন্দিন যত্ন"],
        ],
      },
      { key: "reviewed_at", label: "রিভিউর তারিখ", type: "date" },
      { key: "excerpt_bn", label: "সংক্ষিপ্ত সারাংশ (কার্ডে দেখাবে)", type: "area" },
      { key: "title_bn", label: "শিরোনাম (বাংলা)" },
      { key: "title_en", label: "Title (English)" },
      { key: "body_bn", label: "লেখা (বাংলা)", type: "area" },
      { key: "body_en", label: "Body (English)", type: "area" },
      { key: "sources", label: "তথ্যসূত্র লিংক (প্রতি লাইনে একটি)", type: "area" },
      { key: "image", label: "ছবি", type: "image" },
    ],
  },
  reviews: {
    title: "text_bn",
    sortable: true,
    note: "শুধু আসল রিভিউ দিন। রেটিং কেবল গ্রাহক দিলে লিখুন; ভিডিওতে অটো রেটিং দেবেন না।",
    fields: [
      {
        key: "media_type",
        label: "ধরন",
        type: "select",
        options: [
          ["image", "ছবি"],
          ["video", "ভিডিও"],
        ],
      },
      { key: "media_url", label: "ছবি/ভিডিও লিংক (YouTube চলবে)", type: "image" },
      { key: "name", label: "গ্রাহকের নাম (ঐচ্ছিক)" },
      { key: "rating", label: "রেটিং ১-৫ (ঐচ্ছিক)", type: "number" },
      { key: "text_bn", label: "মন্তব্য", type: "area" },
      { key: "product_id", label: "প্রোডাক্ট", type: "product" },
      { key: "source_url", label: "সোর্স লিংক" },
      {
        key: "aspect",
        label: "ভিডিও অনুপাত",
        type: "select",
        options: [
          ["16/9", "16:9"],
          ["9/16", "9:16"],
          ["4/3", "4:3"],
          ["1/1", "1:1"],
        ],
      },
      { key: "hidden", label: "লুকানো", type: "bool" },
    ],
  },
  certifications: {
    title: "title",
    sortable: true,
    note: "প্রোডাক্টে ম্যাপ করতে প্রোডাক্ট এডিটরের ব্যাজ অংশ ব্যবহার করুন।",
    fields: [
      { key: "title", label: "নাম" },
      { key: "issuer", label: "প্রদানকারী / মালিকানা" },
      { key: "cert_no", label: "নম্বর" },
      { key: "scope", label: "পরিধি (scope)" },
      { key: "valid_until", label: "মেয়াদ" },
      { key: "image", label: "ছবি", type: "image" },
      { key: "doc_url", label: "PDF / ল্যাব রিপোর্ট", type: "file" },
    ],
  },
  doctors: {
    title: "name",
    fields: [
      { key: "name", label: "নাম" },
      { key: "degree", label: "ডিগ্রি" },
      { key: "specialty_bn", label: "বিশেষজ্ঞতা (বাংলা)" },
      { key: "specialty_en", label: "Specialty (English)" },
      { key: "experience", label: "অভিজ্ঞতা" },
      { key: "schedule", label: "সময়/প্রাপ্যতা" },
      { key: "phone", label: "ফোন" },
      { key: "whatsapp", label: "WhatsApp (8801…)" },
      { key: "photo", label: "ছবি", type: "image" },
    ],
  },
  outlets: {
    title: "name",
    sortable: true,
    fields: [
      { key: "name", label: "নাম" },
      { key: "phone", label: "ফোন" },
      { key: "address", label: "ঠিকানা", type: "area" },
      { key: "map_url", label: "ম্যাপ লিংক (খালি হলে ঠিকানা দিয়ে খুঁজবে)" },
      { key: "photo", label: "ছবি", type: "image" },
      { key: "visible", label: "দেখাবে", type: "bool" },
    ],
  },
};
const PUBLIC_KEY: Record<CT, string> = {
  posts: "posts",
  reviews: "reviews",
  certifications: "certifications",
  doctors: "doctors",
  outlets: "outlets",
};

function Crud({ table }: { table: CT }) {
  const cfg = CFG[table];
  const inv = useInvalidate();
  const [edit, setEdit] = useState<{ init: Row; v: Row } | null>(null);
  const { data = [], refetch } = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      const q = supabase.from(table).select("*");
      const r = cfg.sortable ? await q.order("sort") : await q.order("created_at", { ascending: false });
      return (r.data ?? []) as unknown as (Row & { id: string })[];
    },
  });
  const { data: products = [] } = useAdminProducts();
  const dirty = !!edit && JSON.stringify(edit.v) !== JSON.stringify(edit.init);
  useDirtyGuard(dirty);
  const refresh = () => {
    refetch();
    inv(PUBLIC_KEY[table]);
  };
  const save = async () => {
    const { id, created_at, ...rest } = edit!.v;
    void created_at;
    if (table === "reviews" && rest["rating"] != null && (Number(rest["rating"]) < 1 || Number(rest["rating"]) > 5))
      return void toast.error("রেটিং ১-৫");
    if (table === "reviews" && !str(rest["media_url"])) return void toast.error("ছবি/ভিডিও লিংক দিন");
    const r = id
      ? await supabase
          .from(table)
          .update(rest as never)
          .eq("id", id as string)
      : await supabase.from(table).insert(rest as never);
    if (r.error) return void toast.error(r.error.message);
    toast.success("সেভ হয়েছে");
    setEdit(null);
    refresh();
  };
  const del = async (id: string) => {
    if (!confirm("মুছে ফেলবেন?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };
  if (edit) {
    const v = edit.v;
    const set = (k: string, val: unknown) => setEdit({ ...edit, v: { ...v, [k]: val } });
    return (
      <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
        {cfg.fields.map((f) => {
          const wide = f.type === "area" || f.type === "image" || f.type === "file";
          let el: ReactNode;
          if (f.type === "area") el = <Text area v={v[f.key]} on={(s) => set(f.key, s)} />;
          else if (f.type === "select")
            el = (
              <select
                className={input}
                value={str(v[f.key] ?? f.options![0]![0])}
                onChange={(e) => set(f.key, e.target.value)}
              >
                {f.options!.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            );
          else if (f.type === "bool")
            el = <input type="checkbox" checked={!!v[f.key]} onChange={(e) => set(f.key, e.target.checked)} />;
          else if (f.type === "number") el = <Text type="number" v={v[f.key]} on={(s) => set(f.key, num(s))} />;
          else if (f.type === "date") el = <Text type="date" v={v[f.key]} on={(s) => set(f.key, s || null)} />;
          else if (f.type === "image")
            el = <Upload folder={table} value={str(v[f.key])} onChange={(u) => set(f.key, u)} />;
          else if (f.type === "file")
            el = (
              <Upload
                folder={table}
                accept="application/pdf,image/jpeg,image/png"
                label="ফাইল"
                value={str(v[f.key])}
                onChange={(u) => set(f.key, u)}
              />
            );
          else if (f.type === "product")
            el = (
              <select className={input} value={str(v[f.key])} onChange={(e) => set(f.key, e.target.value || null)}>
                <option value="">— কোনো নির্দিষ্ট প্রোডাক্ট নয়</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_bn}
                  </option>
                ))}
              </select>
            );
          else el = <Text v={v[f.key]} on={(s) => set(f.key, s)} />;
          return (
            <Field key={f.key} label={f.label} wide={wide}>
              {el}
            </Field>
          );
        })}
        {table === "posts" && (
          <div className="rounded-2xl bg-background p-4 sm:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">প্রিভিউ</p>
            {str(v["image"]) && (
              <img
                src={str(v["image"])}
                alt=""
                className="mt-2 aspect-video w-full max-w-md rounded-2xl object-cover"
              />
            )}
            <h3 className="mt-2 text-lg font-extrabold">{str(v["title_bn"])}</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-7">{str(v["body_bn"])}</p>
          </div>
        )}
        <Actions onSave={save} onCancel={() => confirmDiscard(dirty) && setEdit(null)} />
      </div>
    );
  }
  const render = (r: Row & { id: string }) => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate font-semibold">
        {str(r[cfg.title]) || str(r["media_url"]) || "—"}
        {r["status"] ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {STATUS_LABEL[str(r["status"])] ?? str(r["status"])}
          </span>
        ) : null}
        {r["hidden"] ? <span className="ml-2 text-xs font-normal text-muted-foreground">লুকানো</span> : null}
      </span>
      <span className="flex shrink-0 gap-3">
        <button onClick={() => setEdit({ init: r, v: r })} className="underline">
          এডিট
        </button>
        <button onClick={() => del(r.id)} className="text-destructive underline">
          মুছুন
        </button>
      </span>
    </div>
  );
  const blank: Row =
    table === "posts"
      ? { status: "draft", kind: "article" }
      : table === "outlets"
        ? { visible: true, sort: data.length + 1 }
        : cfg.sortable
          ? { sort: data.length + 1 }
          : {};
  return (
    <div className="space-y-2">
      {cfg.note && <p className="text-xs text-muted-foreground">{cfg.note}</p>}
      <button onClick={() => setEdit({ init: blank, v: blank })} className={`${btn} bg-ink text-background`}>
        + নতুন
      </button>
      {cfg.sortable ? (
        <SortList
          items={data}
          onReorder={async (a) => {
            await saveOrder(table as "reviews", a);
            refresh();
          }}
          render={render}
        />
      ) : (
        data.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-3 shadow-pill">
            {render(r)}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- customer directory ---------------- */
type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_verified: boolean;
  order_count: number;
  addresses: {
    id: string;
    label: string;
    name: string;
    phone: string;
    address: string;
    area: string;
    is_default: boolean;
  }[];
};
type Directory = { total: number; rows: Customer[] };
const customerDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" }) : "এখনও লগইন করেননি";

function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter(search.trim());
      setPage(0);
      setSelected(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const q = useQuery({
    queryKey: ["admin-customers", filter, page],
    queryFn: async () => {
      const { data, error } = await (supabase as SupabaseClient).rpc("admin_customers", {
        _search: filter,
        _page: page,
      });
      if (error) throw new Error(error.message);
      return data as unknown as Directory;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
    gcTime: 0,
  });
  const customer = q.data?.rows.find((c) => c.id === selected);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">গ্রাহক {q.data && `(${q.data.total.toLocaleString("bn-BD")})`}</h2>
        <button
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          রিফ্রেশ
        </button>
      </div>
      <input
        aria-label="গ্রাহক খুঁজুন"
        className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
        placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {q.isPending && <p role="status">গ্রাহকের তথ্য লোড হচ্ছে…</p>}
      {q.isError && (
        <p role="alert" className="text-destructive">
          তথ্য লোড হয়নি: {q.error.message}
        </p>
      )}
      {!q.isError && q.data && (
        <>
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">গ্রাহক</th>
                  <th className="p-3">ফোন / ইমেইল</th>
                  <th className="p-3">শেষ লগইন</th>
                  <th className="p-3">অর্ডার</th>
                  <th className="p-3">প্রোফাইল</th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {c.avatar && <img src={c.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />}
                        <span>{c.full_name || "নাম দেওয়া হয়নি"}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <p>{c.phone || "ফোন দেওয়া হয়নি"}</p>
                      <p className="text-muted-foreground">{c.email || "—"}</p>
                    </td>
                    <td className="p-3">{customerDate(c.last_sign_in_at)}</td>
                    <td className="p-3">{c.order_count.toLocaleString("bn-BD")}</td>
                    <td className="p-3">
                      <button className="font-semibold text-primary underline" onClick={() => setSelected(c.id)}>
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.data.rows.length === 0 && <p className="p-5 text-center">কোনো গ্রাহক পাওয়া যায়নি।</p>}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              className="rounded-full border px-4 py-2 disabled:opacity-40"
              disabled={page === 0 || q.isFetching}
              onClick={() => {
                setPage((p) => p - 1);
                setSelected(null);
              }}
            >
              আগের পাতা
            </button>
            <span>পাতা {(page + 1).toLocaleString("bn-BD")}</span>
            <button
              className="rounded-full border px-4 py-2 disabled:opacity-40"
              disabled={(page + 1) * 25 >= q.data.total || q.isFetching}
              onClick={() => {
                setPage((p) => p + 1);
                setSelected(null);
              }}
            >
              পরের পাতা
            </button>
          </div>
        </>
      )}
      {customer && !q.isError && (
        <div className="rounded-3xl bg-card p-5 shadow-pill">
          <div className="flex justify-between gap-3">
            <h3 className="font-extrabold">{customer.full_name || "গ্রাহকের প্রোফাইল"}</h3>
            <button className="underline" onClick={() => setSelected(null)}>
              বন্ধ করুন
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">ইমেইল</dt>
              <dd>{customer.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ফোন</dt>
              <dd>{customer.phone || "দেওয়া হয়নি"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">অ্যাকাউন্ট খোলা</dt>
              <dd>{customerDate(customer.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">শেষ লগইন</dt>
              <dd>{customerDate(customer.last_sign_in_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ইমেইল যাচাই</dt>
              <dd>{customer.email_verified ? "যাচাই হয়েছে" : "যাচাই হয়নি"}</dd>
            </div>
          </dl>
          <h4 className="mt-4 font-bold">সংরক্ষিত ঠিকানা</h4>
          {customer.addresses.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">কোনো ঠিকানা দেওয়া হয়নি।</p>
          )}
          {customer.addresses.map((a) => (
            <div key={a.id} className="mt-2 rounded-xl border p-3 text-sm">
              <p className="font-bold">
                {a.label || a.name}
                {a.is_default ? " · ডিফল্ট" : ""}
              </p>
              <p>
                {a.name} · {a.phone}
              </p>
              <p>{a.address}</p>
              <p>{a.area === "dhaka" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
