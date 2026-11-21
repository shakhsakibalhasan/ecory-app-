import { AdminDoctorSchedule } from "@/components/AdminDoctorSchedule";
import { scheduleError } from "@/lib/doctor-schedule";
import { AdminCustomerReviews } from "@/components/AdminCustomerReviews";
import { AdminTranslation } from "@/components/AdminTranslation";
import { AdminCollectionStats } from "@/components/AdminCollectionStats";
import { AdminEditor, rememberAdminEditor } from "@/components/AdminEditor";
import { DataConnectionNotice } from "@/components/DataConnectionNotice";
import { handleAppBack, useAppBack } from "@/lib/app-back";
import { AdminSpinParticipants } from "@/components/AdminSpinParticipants";
import { AdminBusinessDashboard } from "@/components/AdminBusinessDashboard";
import { AdminCustomerSms } from "@/components/AdminCustomerSms";
import { AdminUiNames } from "@/components/AdminUiNames";
import { AdminEntryOffer } from "@/components/AdminEntryOffer";
import { AdminDoctorMedia } from "@/components/AdminDoctorMedia";
import { AdminAppMenus } from "@/components/AdminAppMenus";
import { AdminPromoCodes } from "@/components/AdminPromoCodes";
import { Tags, ChevronLeft } from "lucide-react";
import { safeOfferLink } from "@/lib/presentation";
import { AdminDoctorBookings } from "@/components/AdminDoctorBookings";
import { AdminPresentation, OfferLinkEditor } from "@/components/AdminPresentation";
import { loginIdentity } from "@/lib/customer-identity";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { toast } from "sonner";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  LayoutDashboard,
  Package,
  PencilLine,
  Play,
  Grid2X2,
  PanelsTopLeft,
  ShoppingBag,
  Users,
  Bell,
  BookOpen,
  Star,
  BadgeCheck,
  Stethoscope,
  MapPin,
  Settings2,
  History as HistoryIcon,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Languages,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BDT } from "@/lib/store";
import { AdminNotifications } from "@/components/AdminNotifications";
import { uploadMedia } from "@/lib/admin-upload";
import "@/admin.css";
import { AdminBranding } from "@/components/AdminBranding";
import { BrandImage, useBranding } from "@/lib/branding";

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
const input =
  "w-full rounded-xl border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
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
const confirmDiscard = (dirty: boolean) =>
  !dirty || confirm("সেভ না করা পরিবর্তন বাতিল হবে। নিশ্চিত?");

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
    supabase
      .rpc("has_role", { _user_id: session.user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
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
      toast.error(
        error instanceof Error ? error.message : "Reset link পাঠানো যায়নি। আবার চেষ্টা করুন।",
      );
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
      <input
        className={input}
        placeholder="ইমেইল"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
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
      <p className="text-center text-xs text-muted-foreground">
        অ্যাকাউন্ট না থাকলে প্রোফাইল পেজ থেকে খুলুন।
      </p>
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
      toast.error(
        error instanceof Error ? error.message : "Password পরিবর্তন হয়নি। আবার চেষ্টা করুন।",
      );
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
  | "order_summary"
  | "spin_portal"
  | "spin_participants"
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
  | "history"
  | "navigation"
  | "profile_menu"
  | "branding"
  | "promos"
  | "offers";
const TABS: [Tab, string][] = [
  ["dash", "ড্যাশবোর্ড"],
  ["order_summary", "অর্ডার সামারি"],
  ["products", "প্রোডাক্ট"],
  ["categories", "ক্যাটাগরি"],
  ["offers", "অফার"],
  ["spin_portal", "স্পিন পোর্টাল"],
  ["spin_participants", "স্পিন অংশগ্রহণকারী"],
  ["promos", "প্রোমো কোড"],
  ["banners", "ব্যানার ও হোম"],
  ["orders", "অর্ডার"],
  ["customers", "গ্রাহক"],
  ["notifications", "নোটিফিকেশন"],
  ["posts", "হেলথ টিপস ও আর্টিকেল"],
  ["reviews", "রিভিউ"],
  ["certifications", "সার্টিফিকেট"],
  ["doctors", "ডাক্তার"],
  ["outlets", "আউটলেট"],
  ["settings", "যোগাযোগ, ডেলিভারি, পেমেন্ট"],
  ["history", "পরিবর্তনের ইতিহাস"],
  ["navigation", "Navigation Editor"],
  ["profile_menu", "Profile Menu Editor"],
  ["branding", "লোগো ও ব্র্যান্ডিং"],
];
const TAB_ICONS: Record<Tab, LucideIcon> = {
  dash: LayoutDashboard,
  order_summary: LayoutDashboard,
  products: Package,
  categories: Grid2X2,
  offers: Tags,
  spin_portal: Tags,
  spin_participants: Users,
  promos: Tags,
  banners: PanelsTopLeft,
  orders: ShoppingBag,
  customers: Users,
  notifications: Bell,
  posts: BookOpen,
  reviews: Star,
  certifications: BadgeCheck,
  doctors: Stethoscope,
  outlets: MapPin,
  settings: Settings2,
  history: HistoryIcon,
  navigation: PanelsTopLeft,
  profile_menu: Users,
  branding: ImagePlus,
};
function Panel({ email }: { email: string }) {
  const { data: branding } = useBranding();
  const [tab, setTab] = useState<Tab>("dash");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const previous = document.body.getAttribute("data-ecory-admin");
    document.body.setAttribute("data-ecory-admin", "true");
    return () => {
      if (previous === null) document.body.removeAttribute("data-ecory-admin");
      else document.body.setAttribute("data-ecory-admin", previous);
    };
  }, []);
  useAppBack(() => setTab("dash"));
  const activeLabel = TABS.find(([key]) => key === tab)?.[1] ?? "ড্যাশবোর্ড";
  return (
    <div className="ecory-admin">
      <div className="admin-frame">
        <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`} id="admin-sidebar">
          <div className="admin-sidebar-top">
            <button
              type="button"
              onClick={() => {
                setTab("dash");
                setMenuOpen(false);
              }}
              className="admin-brand"
              aria-label="অ্যাডমিন ড্যাশবোর্ড"
            >
              <span className="admin-brand-icon">
                <BrandImage
                  src={branding?.admin_logo}
                  alt="অ্যাডমিন লোগো"
                  className="h-8 w-8 object-contain"
                />
              </span>
              <span>
                <strong>{branding?.admin_name || "ইকোরি অ্যাডমিন"}</strong>
                <small>STORE WORKSPACE</small>
              </span>
            </button>
            <button
              type="button"
              className="admin-mobile-toggle"
              aria-label="অ্যাডমিন মেনু খুলুন"
              aria-expanded={menuOpen}
              aria-controls="admin-menu-list"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <nav className="admin-nav" aria-label="অ্যাডমিন মেনু" id="admin-menu-list">
            <p className="admin-menu-heading">স্টোর পরিচালনা</p>
            <div className="admin-menu-grid">
              {TABS.map(([key, label]) => {
                const Icon = TAB_ICONS[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setTab(key);
                      setMenuOpen(false);
                    }}
                    aria-current={tab === key ? "page" : undefined}
                    className={`admin-menu-item${tab === key ? " is-active" : ""}`}
                  >
                    <span className="admin-menu-icon">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                    {tab === key && (
                      <ChevronRight size={14} className="admin-menu-chevron" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="admin-sidebar-footer">
            <span className="admin-user-avatar">{email.charAt(0).toUpperCase() || "E"}</span>
            <div>
              <span>অ্যাডমিন অ্যাকাউন্ট</span>
              <strong title={email}>{email}</strong>
            </div>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              aria-label="লগআউট"
              title="লগআউট"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-header">
            <div className="admin-heading-meta">
              <p className="admin-eyebrow">ECORY · ADMIN WORKSPACE</p>
              <h1>{activeLabel}</h1>
              <nav className="admin-breadcrumb" aria-label="পেজের অবস্থান">
                <button type="button" onClick={() => setTab("dash")} disabled={tab === "dash"}>
                  ড্যাশবোর্ড
                </button>
                {tab !== "dash" && (
                  <>
                    <ChevronRight size={12} />
                    <span>{activeLabel}</span>
                  </>
                )}
              </nav>
            </div>
            <div className="admin-header-tools">
              <details className="admin-tools-menu">
                <summary>
                  <Languages size={16} />
                  অনুবাদ
                </summary>
                <AdminTranslation />
              </details>
              <Link to="/" className="admin-action">
                <ExternalLink size={15} />
                অ্যাপ দেখুন
              </Link>
            </div>
          </header>
          <div className="admin-workspace-notice">
            <DataConnectionNotice admin />
          </div>
          <AdminUiNames showControls={tab === "branding"} />
          {tab !== "dash" && (
            <button
              type="button"
              className="admin-back-link"
              onClick={() => {
                if (!handleAppBack()) setTab("dash");
              }}
              aria-label="অ্যাডমিনে ফিরে যান"
            >
              <ChevronLeft size={16} />
              ফিরে যান
            </button>
          )}
          <main
            className="admin-content"
            data-admin-scope={tab}
            aria-label={activeLabel}
            onClickCapture={rememberAdminEditor}
          >
            <div className="admin-section-heading sr-only">
              <h2>{activeLabel}</h2>
            </div>
            <div key={tab} className="admin-section-body admin-section-enter">
              {tab === "dash" && <Dashboard go={setTab} />}
              {tab === "order_summary" && <AdminBusinessDashboard />}
              {tab === "spin_portal" && <AdminEntryOffer />}
              {tab === "spin_participants" && <AdminSpinParticipants />}
              {tab === "products" && <Products />}
              {tab === "categories" && <Categories />}
              {tab === "banners" && <Banners />}
              {tab === "orders" && <Orders />}
              {tab === "customers" && <AdminCustomers />}
              {tab === "notifications" && <AdminNotifications />}
              {tab === "settings" && (
                <>
                  <AdminCustomerSms />
                  <Settings />
                </>
              )}
              {tab === "promos" && <AdminPromoCodes />}
              {tab === "branding" && (
                <div className="space-y-8">
                  <AdminBranding />
                  <AdminPresentation />
                </div>
              )}
              {tab === "navigation" && <AdminAppMenus key="navigation" section="nav_items" />}
              {tab === "profile_menu" && (
                <AdminAppMenus key="profile_menu" section="profile_items" />
              )}
              {tab === "history" && <History />}
              {(
                ["offers", "posts", "reviews", "certifications", "doctors", "outlets"] as const
              ).map(
                (t) =>
                  tab === t && (
                    <div key={t}>
                      {t === "offers" && (
                        <>
                          <OfferLinkEditor />
                        </>
                      )}
                      <Crud table={t} />
                      {t === "doctors" && (
                        <>
                          <AdminDoctorBookings />
                        </>
                      )}
                    </div>
                  ),
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
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      if (p.error || o.error || pending.error) throw p.error || o.error || pending.error;
      return { products: p.count ?? 0, orders: o.count ?? 0, pending: pending.count ?? 0 };
    },
  });
  const cards: [Tab, string, string][] = [
    ["spin_portal", "স্পিন পোর্টাল", "চাকা, পুরস্কার ও কুপন সম্পাদনা"],
    ["spin_participants", "স্পিন অংশগ্রহণকারী", "নাম, নম্বর ও জেতা পুরস্কারের তালিকা"],
    ["order_summary", "অর্ডার সামারি", "অর্ডার, ডেলিভারি, বাতিল ও টাকার হিসাব"],
    ["products", "প্রোডাক্ট", `${data?.products ?? "…"} টি`],
    ["orders", "অর্ডার", `${data?.orders ?? "…"} টি · অপেক্ষমাণ ${data?.pending ?? "…"}`],
    ["categories", "ক্যাটাগরি", "নাম, আইকন, ক্রম"],
    ["banners", "ব্যানার ও হোম", "স্লাইড ও সেকশন"],
    ["customers", "গ্রাহক", "প্রোফাইল ও যোগাযোগের তথ্য"],
    ["posts", "কনটেন্ট", "আর্টিকেল ও টিপস"],
    ["settings", "সেটিংস", "যোগাযোগ, ডেলিভারি, পেমেন্ট"],
  ];
  return (
    <div className="space-y-6">
      <AdminBusinessDashboard overview onOrders={() => go("orders")} />
      <div className="admin-quick-grid">
        {cards.map(([t, l, s]) => (
          <button
            key={t}
            onClick={() => go(t)}
            className="rounded-3xl bg-card p-5 text-left shadow-pill transition hover:-translate-y-0.5"
          >
            <span className="admin-quick-icon">
              {(() => {
                const Icon = TAB_ICONS[t];
                return <Icon size={20} />;
              })()}
            </span>
            <p className="text-lg font-extrabold">{l}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s}</p>
          </button>
        ))}
      </div>
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
  rows = 2,
  translationKey,
}: {
  v: unknown;
  on: (s: string) => void;
  area?: boolean;
  type?: string;
  ph?: string | undefined;
  rows?: number;
  translationKey?: string | undefined;
}) {
  return area ? (
    <textarea
      data-admin-translation-field={translationKey}
      rows={rows}
      className={input}
      value={str(v)}
      placeholder={ph}
      onChange={(e) => on(e.target.value)}
    />
  ) : (
    <input
      data-admin-translation-field={translationKey}
      type={type}
      className={input}
      value={str(v)}
      placeholder={ph}
      onChange={(e) => on(e.target.value)}
    />
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
      if (folder === "doctor-portraits") {
        const url = URL.createObjectURL(f);
        try {
          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const image = new Image();
              image.onload = () =>
                resolve({ width: image.naturalWidth, height: image.naturalHeight });
              image.onerror = () => reject(new Error("ছবিটি পড়া যায়নি। JPG বা PNG ছবি দিন।"));
              image.src = url;
            },
          );
          if (Math.abs(dimensions.width / dimensions.height - 3 / 4) > 0.015)
            throw new Error(
              "Doctor-এর ছবি ৩:৪ ratio-তে দিন। প্রস্তাবিত মাপ ৯০০×১২০০px। ছবি crop করে আবার আপলোড করুন।",
            );
          if (dimensions.width < 600 || dimensions.height < 800)
            throw new Error("ছবি অন্তত ৬০০×৮০০px হতে হবে। পরিষ্কার ফলের জন্য ৯০০×১২০০px দিন।");
        } finally {
          URL.revokeObjectURL(url);
        }
      }
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
    <div className="admin-upload flex items-start gap-3">
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
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <input
          className={`${input} text-xs`}
          placeholder="অথবা লিংক পেস্ট করুন"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-xs text-black">
          {folder.startsWith("products") || folder === "variants"
            ? "১:১ • ১২০০×১২০০px transparent PNG; label অক্ষত রাখুন"
            : folder === "doctor-portraits"
              ? "৩:৪ portrait আবশ্যক • প্রস্তাবিত ৯০০×১২০০px, ন্যূনতম ৬০০×৮০০px • JPG/PNG; মুখ ও কাঁধ মাঝখানে রাখুন। অন্য ratio আপলোড হবে না।"
              : folder === "doctor-certificates"
                ? "মূল document ratio অক্ষত রাখুন; অন্তত ১৬০০px লম্বা দিক"
                : folder.startsWith("banners")
                  ? "২.১৫:১ • ১২৯০×৬০০px; মূল লেখা মাঝের নিরাপদ অংশে রাখুন"
                  : folder === "certifications"
                    ? "মূল document ratio • অন্তত ১৬০০px লম্বা দিক; PDF-ও দেওয়া যাবে"
                    : folder === "posts"
                      ? "১৬:৯ • ১২০০×৬৭৫px cover"
                      : folder === "outlets"
                        ? "৪:৩ • ১২০০×৯০০px"
                        : folder === "reviews"
                          ? "মূল ছবি/ভিডিও ratio অক্ষত; ছবি অন্তত ১২০০px"
                          : "১:১ • ৮০০×৮০০px PNG/JPG"}
        </p>
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
    <div className="admin-form-actions flex flex-wrap gap-2 border-t bg-background py-3 sm:col-span-2">
      <button
        disabled={saving}
        onClick={onSave}
        className={`${btn} bg-primary text-primary-foreground`}
      >
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
  allowDrag = true,
  layout = "list",
}: {
  items: T[];
  render: (t: T) => ReactNode;
  onReorder: (items: T[]) => void;
  allowDrag?: boolean;
  layout?: "list" | "cards";
}) {
  const [dragI, setDragI] = useState<number | null>(null);
  return (
    <div className={layout === "cards" ? "admin-product-grid" : "space-y-2"}>
      {items.map((it, i) => (
        <div
          key={it.id}
          draggable={false}
          data-sort-editable={!allowDrag || undefined}
          onDragStartCapture={(e) => {
            if (
              !allowDrag ||
              (e.target as Element).closest("input,textarea,select,[contenteditable]")
            ) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragOver={(e) => {
            if (dragI !== null) e.preventDefault();
          }}
          onDrop={(e) => {
            if (dragI === null) return;
            e.preventDefault();
            e.stopPropagation();
            if (dragI === i) return;
            const a = [...items];
            const [m] = a.splice(dragI, 1);
            a.splice(i, 0, m!);
            setDragI(null);
            onReorder(a);
          }}
          className={`admin-sort-row flex items-center gap-2 rounded-2xl bg-card p-2 shadow-pill${layout === "cards" ? " admin-product-grid-card" : ""}`}
        >
          {allowDrag && (
            <span
              draggable
              title="এখানে ধরে টেনে সাজান"
              aria-label="টেনে সাজান"
              className="shrink-0 cursor-grab select-none p-1 text-muted-foreground active:cursor-grabbing"
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", it.id);
                setDragI(i);
              }}
              onDragEnd={() => setDragI(null)}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="admin-sort-content min-w-0 flex-1">{render(it)}</div>
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
  kind: "pack" | "gram" | "ml" | "other" | "gram_pack" | "ml_pack";
  unit_size?: number;
  pack_count?: number;
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
    queryFn: async () => {
      const r = await supabase.from("products").select("*").order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
  });
}
function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const r = await supabase.from("categories").select("*").order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
  });
}

function AdminProductMedia({ src, name }: { src: string; name: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className="admin-product-card-media">
      {src && !broken ? (
        <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <div className="admin-product-no-image">
          <Package size={36} strokeWidth={1.25} />
          <span>ছবি দেওয়া নেই</span>
        </div>
      )}
    </div>
  );
}

function AdminReviewMedia({ url, video, name }: { url: string; video: boolean; name: string }) {
  if (!video) return <AdminProductMedia src={url} name={name} />;
  let youtube = "";
  try {
    const u = new URL(url);
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(u.hostname)) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") || u.pathname.split("/")[2] || "";
      if (/^[\w-]{11}$/.test(id)) youtube = id;
    }
  } catch {
    /* Invalid links retain an explicit placeholder. */
  }
  if (youtube)
    return (
      <a
        className="admin-review-youtube"
        href={`https://www.youtube.com/watch?v=${youtube}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube ভিডিও দেখুন"
      >
        <AdminProductMedia src={`https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`} name={name} />
        <span>
          <Play size={17} />
          ভিডিও দেখুন
        </span>
      </a>
    );
  let safe = false;
  try {
    safe = new URL(url).protocol === "https:";
  } catch {
    /* invalid */
  }
  return (
    <div className="admin-review-video">
      {safe ? (
        <video src={url} controls playsInline preload="none" aria-label={name} />
      ) : (
        <span>
          <Play size={28} />
          ভিডিও লিংক দেওয়া নেই
        </span>
      )}
    </div>
  );
}

function Products() {
  const { data = [], refetch, isPending, isError } = useAdminProducts();
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
  const removeProduct = async (id: string, name: string) => {
    if (!confirm(`“${name}” প্রোডাক্ট মুছবেন?`)) return;
    const r = await supabase.from("products").delete().eq("id", id).select("id");
    if (r.error)
      return void toast.error(
        r.error.code === "23503"
          ? "অন্য record এই Product ব্যবহার করছে। Product editor থেকে Archive করুন।"
          : r.error.message,
      );
    if (!r.data?.length)
      return void toast.error("Product মুছে যায়নি। Admin permission পরীক্ষা করুন।");
    toast.success("Product মুছে গেছে");
    await refetch();
    inv("products");
  };
  const list = data.filter(
    (p) =>
      (filter === "all" ? p.status !== "archived" : p.status === filter) &&
      (!q || `${p.name_bn} ${p.name_en} ${p.sku}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="space-y-3">
      {!isPending && !isError && <AdminCollectionStats items={data} kind="products" />}
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
          className={
            "admin-edit-button " + `${btn} bg-ink text-background inline-flex items-center gap-1`
          }
        >
          <Plus className="h-4 w-4" />
          নতুন প্রোডাক্ট
        </button>
        <input
          className={`${input} max-w-xs`}
          placeholder="খুঁজুন…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`${input} w-auto`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">সব (আর্কাইভ ছাড়া)</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-catalog-heading">
        <div>
          <h3>প্রোডাক্ট ক্যাটালগ</h3>
          <p>
            {list.length.toLocaleString("bn-BD")} টি পণ্য দেখাচ্ছে · ছবির নিচে তথ্য ও সম্পাদনার
            সুবিধা
          </p>
        </div>
        <span>Grip বা ↑/↓ দিয়ে ক্রম সাজান</span>
      </div>
      {isPending && (
        <div className="admin-loading" role="status">
          পণ্য লোড হচ্ছে…
        </div>
      )}
      {isError && (
        <div className="admin-report-error" role="alert">
          পণ্য পাওয়া যায়নি। <button onClick={() => void refetch()}>আবার চেষ্টা করুন</button>
        </div>
      )}
      {!isPending && !isError && !list.length && (
        <div className="admin-product-empty">
          <Package size={32} />
          <h4>কোনো পণ্য পাওয়া যায়নি</h4>
          <p>অন্য নাম বা status দিয়ে খুঁজুন, অথবা নতুন পণ্য যোগ করুন।</p>
        </div>
      )}
      <SortList
        layout="cards"
        items={list}
        onReorder={async (a) => {
          const visibleIds = new Set(list.map((p) => p.id));
          let index = 0;
          const ordered = data.map((p) => (visibleIds.has(p.id) ? a[index++]! : p));
          await saveOrder("products", ordered);
          refetch();
          inv("products");
        }}
        render={(p) => {
          const summary = str((p as Row)["purpose_bn"] || (p as Row)["short_bn"])
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const variants = Array.isArray(p.variants) ? p.variants.length : 0;
          return (
            <article className="admin-product-card-content">
              <div className="admin-product-card-badges">
                <span className="admin-product-status" data-status={p.status}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
                {p.featured && (
                  <span className="admin-product-featured">
                    <Star size={10} />
                    ফিচার্ড
                  </span>
                )}
              </div>
              <AdminProductMedia src={p.image || ""} name={p.name_bn || p.name_en || "পণ্য"} />
              <div className="admin-product-card-info">
                <h4 title={p.name_bn || p.name_en}>{p.name_bn || p.name_en || "নাম দেওয়া হয়নি"}</h4>
                <p className="admin-product-card-summary" title={summary}>
                  {summary || "সংক্ষিপ্ত বিবরণ যোগ করুন"}
                </p>
                <div className="admin-product-card-price">
                  <strong>{BDT(p.price)}</strong>
                  {p.old_price != null && p.old_price > p.price && <del>{BDT(p.old_price)}</del>}
                </div>
                <div className="admin-product-card-meta">
                  <span className={p.in_stock ? "is-stock" : "is-out"}>
                    <i />
                    {p.in_stock ? "স্টকে আছে" : "স্টক নেই"}
                  </span>
                  <span>
                    {variants ? `${variants.toLocaleString("bn-BD")} ভ্যারিয়েন্ট` : "একক পণ্য"}
                  </span>
                </div>
              </div>
              <div className="admin-product-card-actions">
                <button
                  type="button"
                  onClick={() => setEdit(p as Row)}
                  className="admin-edit-button"
                >
                  <PencilLine size={14} />
                  এডিট
                </button>
                <button
                  type="button"
                  onClick={() => void removeProduct(p.id, p.name_bn)}
                  className="admin-delete-button"
                >
                  <Trash2 size={14} />
                  মুছুন
                </button>
              </div>
            </article>
          );
        }}
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
    queryFn: async () => {
      const r = await supabase.from("certifications").select("id,title").order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  useDirtyGuard(dirty);
  useAppBack(
    () => {
      if (confirmDiscard(dirty)) onDone();
    },
    true,
    20,
  );
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
      if (x.kind === "gram_pack" || x.kind === "ml_pack") {
        if (
          !Number.isFinite(x.unit_size) ||
          !x.unit_size ||
          x.unit_size <= 0 ||
          !Number.isInteger(x.pack_count) ||
          !x.pack_count ||
          x.pack_count < 1 ||
          x.pack_count > 20
        )
          return "ওজন/পরিমাণ ও পিস সংখ্যা ঠিকভাবে দিন";
        if (!x.image?.trim())
          return `"${x.label_bn}" এর সঠিক প্যাকেজিংয়ের PNG composition আপলোড করুন`;
      }
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
    <AdminEditor
      title={initial["id"] ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}
      onBack={() => {
        if (confirmDiscard(dirty)) onDone();
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
        <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
          <div className="admin-form-section-label sm:col-span-2">
            <span>01</span>
            <div>
              <h4>পণ্যের মূল তথ্য</h4>
              <p>নাম, ক্যাটাগরি ও দৃশ্যমানতা</p>
            </div>
          </div>
          <Field label="অবস্থা">
            <select
              className={input}
              value={str(v["status"])}
              onChange={(e) => set("status", e.target.value)}
            >
              {Object.entries(STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ক্যাটাগরি">
            <select
              className={input}
              value={str(v["category"])}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name_bn}
                </option>
              ))}
            </select>
          </Field>
          <Field label="নাম (বাংলা) *">
            <Text translationKey={"name_bn"} v={v["name_bn"]} on={(s) => set("name_bn", s)} />
          </Field>
          <Field label="Name (English)">
            <Text translationKey={"name_en"} v={v["name_en"]} on={(s) => set("name_en", s)} />
          </Field>
          <Field label="নামের পাশে ছোট ব্যবহার (বাংলা)">
            <Text
              translationKey={"purpose_bn"}
              v={v["purpose_bn"]}
              on={(s) => set("purpose_bn", s)}
              ph="যেমন: হজমের যত্ন"
            />
          </Field>
          <Field label="Short use (English)">
            <Text
              translationKey={"purpose_en"}
              v={v["purpose_en"]}
              on={(s) => set("purpose_en", s)}
              ph="e.g. Digestive care"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={v["best_selling"] === true}
              onChange={(e) => set("best_selling", e.target.checked)}
            />
            Best Selling — সর্বাধিক বিক্রিত ট্যাগ
          </label>
          <div className="admin-form-section-label sm:col-span-2">
            <span>02</span>
            <div>
              <h4>মূল্য ও স্টক</h4>
              <p>বিক্রয়মূল্য, ছাড় ও স্টকের তথ্য</p>
            </div>
          </div>
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
            <Text
              translationKey={"offer_text_bn"}
              v={v["offer_text_bn"]}
              on={(s) => set("offer_text_bn", s)}
              ph="যেমন: ৩টি নিলে ফ্রি ডেলিভারি"
            />
          </Field>
          <Field label="Offer text (English)">
            <Text
              translationKey={"offer_text_en"}
              v={v["offer_text_en"]}
              on={(s) => set("offer_text_en", s)}
            />
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
            <input
              type="checkbox"
              checked={!!v["featured"]}
              onChange={(e) => set("featured", e.target.checked)}
            />
            ফিচার্ড
          </label>
          <div className="admin-form-section-label sm:col-span-2">
            <span>03</span>
            <div>
              <h4>বিবরণ ও ব্যবহার</h4>
              <p>বাংলা ও English তথ্য পাশাপাশি</p>
            </div>
          </div>
          <Field label="সংক্ষিপ্ত বিবরণ (বাংলা)" wide>
            <Text
              translationKey={"short_bn"}
              area
              v={v["short_bn"]}
              on={(s) => set("short_bn", s)}
            />
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
              <Text
                translationKey={typeof `${k}_bn` === "string" ? `${k}_bn` : undefined}
                area
                v={v[`${k}_bn`]}
                on={(s) => set(`${k}_bn`, s)}
              />
            </Field>,
            <Field key={`${k}_en`} label={`${l} (English)`}>
              <Text
                translationKey={typeof `${k}_en` === "string" ? `${k}_en` : undefined}
                area
                v={v[`${k}_en`]}
                on={(s) => set(`${k}_en`, s)}
              />
            </Field>,
          ])}

          <div className="admin-form-section-label sm:col-span-2">
            <span>04</span>
            <div>
              <h4>ছবি ও ভ্যারিয়েন্ট</h4>
              <p>আসল প্যাকেজিং, ফাইল ও সাইজ অনুযায়ী ছবি</p>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-extrabold">প্রধান ছবি</p>
            <Upload folder="products" value={str(v["image"])} onChange={(u) => set("image", u)} />
            <p className="text-xs text-muted-foreground">
              স্বচ্ছ ব্যাকগ্রাউন্ডের PNG দিন। অটো ব্যাকগ্রাউন্ড রিমুভ এখানে নেই — প্রসেস করা PNG
              আপলোড করুন। অ্যাপের ধূসর বক্স ও কোণা আলাদাভাবে যোগ হয়।
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
                  <img
                    src={x.g}
                    alt=""
                    className="h-12 w-12 rounded-lg bg-[#ECEDE9] object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">{x.g}</span>
                  <button className="text-xs underline" onClick={() => set("image", x.g)}>
                    প্রধান করুন
                  </button>
                  <button
                    aria-label="মুছুন"
                    className="admin-delete-button"
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
              প্যাক সংখ্যা এখানে; কার্টের পরিমাণ গ্রাহক আলাদাভাবে বাছাই করবে। আগের অর্ডারের দাম
              বদলাবে না।
            </p>
            <SortList
              items={variants}
              allowDrag={false}
              onReorder={setVariants}
              render={(x) => {
                const up = (patch: Partial<Variant>) =>
                  setVariants(variants.map((y) => (y.id === x.id ? { ...y, ...patch } : y)));
                return (
                  <div className={`grid gap-2 sm:grid-cols-4 ${x.disabled ? "opacity-60" : ""}`}>
                    <select
                      className={input}
                      value={x.kind ?? "pack"}
                      onChange={(e) => {
                        const kind = e.target.value as Variant["kind"];
                        if (kind === "gram_pack" || kind === "ml_pack") {
                          const size = x.unit_size || 0,
                            count = x.pack_count || 1;
                          up({
                            kind,
                            unit_size: size,
                            pack_count: count,
                            label_bn: `${size.toLocaleString("bn-BD")} ${kind === "gram_pack" ? "গ্রাম" : "ml"} × ${count.toLocaleString("bn-BD")} পিস`,
                            label_en: `${size} ${kind === "gram_pack" ? "g" : "ml"} × ${count} pcs`,
                          });
                        } else up({ kind });
                      }}
                    >
                      <option value="pack">প্যাক/পিস</option>
                      <option value="gram">গ্রাম</option>
                      <option value="ml">ml</option>
                      <option value="gram_pack">গ্রাম × পিস</option>
                      <option value="ml_pack">ml × পিস</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                    {(x.kind === "gram_pack" || x.kind === "ml_pack") && (
                      <div className="grid grid-cols-2 gap-2 sm:col-span-4">
                        <Field
                          label={
                            x.kind === "gram_pack"
                              ? "প্রতি প্যাকের ওজন (গ্রাম)"
                              : "প্রতি বোতলের পরিমাণ (ml)"
                          }
                        >
                          <input
                            className={input}
                            type="number"
                            min="0.01"
                            step="any"
                            aria-label="প্রতি প্যাকের পরিমাণ"
                            value={x.unit_size || ""}
                            onChange={(e) => {
                              const size = Number(e.target.value);
                              const count = x.pack_count || 1;
                              const unit = x.kind === "gram_pack" ? "গ্রাম" : "ml";
                              up({
                                unit_size: size,
                                pack_count: count,
                                label_bn: `${size.toLocaleString("bn-BD")} ${unit} × ${count.toLocaleString("bn-BD")} পিস`,
                                label_en: `${size} ${x.kind === "gram_pack" ? "g" : "ml"} × ${count} pcs`,
                              });
                            }}
                          />
                        </Field>
                        <Field label="প্যাক / পিস সংখ্যা">
                          <input
                            className={input}
                            type="number"
                            min="1"
                            max="20"
                            step="1"
                            aria-label="প্যাকের পিস সংখ্যা"
                            value={x.pack_count || ""}
                            onChange={(e) => {
                              const count = Number(e.target.value);
                              const size = x.unit_size || 0;
                              up({
                                pack_count: count,
                                label_bn: `${size.toLocaleString("bn-BD")} ${x.kind === "gram_pack" ? "গ্রাম" : "ml"} × ${count.toLocaleString("bn-BD")} পিস`,
                                label_en: `${size} ${x.kind === "gram_pack" ? "g" : "ml"} × ${count} pcs`,
                              });
                            }}
                          />
                        </Field>
                        <p className="text-xs sm:col-span-2">
                          এই combination-এর নিজস্ব PNG দিন: যেমন ২৫০ গ্রাম × ২ পিস। ছবিতে একই ওজনের
                          ঠিক সেই সংখ্যক প্যাক থাকবে। দামটি পুরো combination-এর।
                        </p>
                      </div>
                    )}
                    <input
                      data-admin-translation-field={"label_bn"}
                      className={input}
                      placeholder="নাম (বাংলা)"
                      value={x.label_bn}
                      onChange={(e) => up({ label_bn: e.target.value })}
                    />
                    <input
                      data-admin-translation-field={"label_en"}
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
                        className="admin-delete-button ml-auto"
                        onClick={() => setVariants(variants.filter((y) => y.id !== x.id))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </label>
                    {x.old_price != null && x.old_price > x.price && (
                      <p className="text-xs text-primary sm:col-span-4">
                        সাশ্রয় {BDT(x.old_price - x.price)}
                      </p>
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
              {[["bsti", "BSTI"], ...certs.map((c) => [`cert:${c.id}`, c.title])].map(
                ([k, l]: string[]) => (
                  <label key={k!} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={badges.includes(k!)}
                      onChange={(e) =>
                        set(
                          "badges",
                          e.target.checked ? [...badges, k!] : badges.filter((b) => b !== k),
                        )
                      }
                    />
                    {l}
                  </label>
                ),
              )}
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
                      onClick={() =>
                        set("related", on ? related.filter((r) => r !== id) : [...related, id])
                      }
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
              {str(v["image"]) && (
                <img src={str(v["image"])} alt="" className="h-full w-full object-contain p-2" />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-bold">{str(v["name_bn"]) || "নাম"}</p>
            <p className="text-sm font-extrabold">
              {BDT(price)}{" "}
              {old != null && old > price && (
                <span className="text-xs font-normal text-muted-foreground line-through">
                  {BDT(old)}
                </span>
              )}
            </p>
            {str(v["offer_text_bn"]) && (
              <p className="text-[11px] text-primary">{str(v["offer_text_bn"])}</p>
            )}
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
          {dirty && (
            <p className="text-center text-xs font-semibold text-destructive">
              সেভ না করা পরিবর্তন আছে
            </p>
          )}
        </aside>
      </div>
    </AdminEditor>
  );
}

/* ---------------- categories ---------------- */
function Categories() {
  const { data = [], refetch, isPending, isError } = useAdminCategories();
  const products = useAdminProducts();
  const [draft, setDraft] = useState<Row | null>(null);
  const inv = useInvalidate();
  const save = async () => {
    if (!str(draft!["key"]).trim() || !str(draft!["name_bn"]).trim())
      return void toast.error("কী ও বাংলা নাম দিন");
    // Only database columns: SortList adds an id solely for rendering.
    const payload = {
      key: str(draft!["key"]),
      name_bn: str(draft!["name_bn"]),
      name_en: str(draft!["name_en"]),
      icon: str(draft!["icon"]),
      visible: draft!["visible"] !== false,
      sort: Number(draft!["sort"] ?? 0),
    };
    const { error } = await supabase.from("categories").upsert(payload, { onConflict: "key" });
    if (error) return void toast.error(error.message);
    toast.success("সেভ হয়েছে");
    setDraft(null);
    refetch();
    inv("categories");
  };
  const removeCategory = async (key: string) => {
    if (!confirm(`“${key}” Category মুছবেন? এর Product-গুলো মুছবে না।`)) return;
    const r = await supabase.from("categories").delete().eq("key", key).select("key");
    if (r.error) return void toast.error(r.error.message);
    if (!r.data?.length)
      return void toast.error("Category মুছে যায়নি। Admin permission পরীক্ষা করুন।");
    toast.success("Category মুছে গেছে");
    await refetch();
    inv("categories");
  };
  if (draft)
    return (
      <AdminEditor title="ক্যাটাগরি সম্পাদনা" onBack={() => setDraft(null)}>
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
            <Text
              translationKey={"name_bn"}
              v={draft["name_bn"]}
              on={(s) => setDraft({ ...draft, name_bn: s })}
            />
          </Field>
          <Field label="Name (English)">
            <Text
              translationKey={"name_en"}
              v={draft["name_en"]}
              on={(s) => setDraft({ ...draft, name_en: s })}
            />
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
      </AdminEditor>
    );
  return (
    <div className="space-y-3">
      {!isPending && !isError && <AdminCollectionStats items={data} kind="categories" />}
      <button
        data-admin-open
        onClick={() =>
          setDraft({
            key: "",
            name_bn: "",
            name_en: "",
            icon: "",
            visible: true,
            sort: data.length + 1,
          })
        }
        className={`${btn} bg-ink text-background`}
      >
        + নতুন ক্যাটাগরি
      </button>

      <SortList
        layout="cards"
        items={data.map((c) => ({ ...c, id: c.key }))}
        onReorder={async (a) => {
          await saveOrder("categories", a, "key");
          refetch();
          inv("categories");
        }}
        render={(c) => (
          <article className="admin-product-card-content admin-category-card">
            <span className="admin-product-status" data-status={c.visible ? "published" : "hidden"}>
              {c.visible ? "দেখানো হচ্ছে" : "লুকানো"}
            </span>
            <AdminProductMedia src={c.icon || ""} name={c.name_bn} />
            <div className="admin-product-card-info">
              <h4>{c.name_bn}</h4>
              <p className="admin-product-card-summary">{c.name_en || c.key}</p>
              <div className="admin-product-card-meta">
                <span>কী: {c.key}</span>
                <span>
                  {products.isPending
                    ? "লোড হচ্ছে…"
                    : products.isError
                      ? "পণ্যের সংখ্যা পাওয়া যায়নি"
                      : `${products.data?.filter((p) => p.category === c.key).length.toLocaleString("bn-BD")} টি পণ্য`}
                </span>
              </div>
            </div>
            <div className="admin-product-card-actions">
              <button
                type="button"
                className="admin-edit-button"
                onClick={() => {
                  const { id: _displayId, ...category } = c;
                  setDraft(category as Row);
                }}
              >
                <PencilLine size={14} />
                এডিট
              </button>
              <button
                type="button"
                className="admin-delete-button"
                onClick={() => void removeCategory(c.key)}
              >
                <Trash2 size={14} />
                মুছুন
              </button>
            </div>
          </article>
        )}
      />
      <p className="text-xs text-muted-foreground">
        প্রোডাক্টের ক্যাটাগরি প্রোডাক্ট এডিটর থেকে বদলান।
      </p>
    </div>
  );
}

/* ---------------- banners & home ---------------- */
function Banners() {
  const { data = [], refetch } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const r = await supabase.from("banners").select("*").order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
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
  if (draft)
    return (
      <AdminEditor title="ব্যানার সম্পাদনা" onBack={() => setDraft(null)}>
        <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Upload
              folder="banners"
              value={str(draft["image"])}
              onChange={(u) => setDraft({ ...draft, image: u })}
            />
          </div>
          <div className="sm:col-span-2">
            <Upload
              folder="banners"
              label="Banner image (English, optional)"
              value={str(draft["image_en"])}
              onChange={(u) => setDraft({ ...draft, image_en: u })}
            />
          </div>
          <Field label="লিংক (যেমন /product/…)">
            <Text v={draft["link"]} on={(s) => setDraft({ ...draft, link: s })} />
          </Field>
          <Field label="ছবির বিবরণ (অ্যাক্সেসিবিলিটি)">
            <Text
              translationKey={"alt_bn"}
              v={draft["alt_bn"]}
              on={(s) => setDraft({ ...draft, alt_bn: s })}
            />
          </Field>
          <Field label="Image description (English)">
            <Text
              translationKey={"alt_en"}
              v={draft["alt_en"]}
              on={(s) => setDraft({ ...draft, alt_en: s })}
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
          {str(draft["image"]) && (
            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-muted-foreground">মোবাইল প্রিভিউ</p>
              <div
                className="mt-1 w-80 max-w-full overflow-hidden rounded-[1.75rem]"
                style={{ aspectRatio: "2.15/1" }}
              >
                <img src={str(draft["image"])} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          <Actions onSave={save} onCancel={() => setDraft(null)} />
        </div>
      </AdminEditor>
    );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        কোনো দৃশ্যমান ব্যানার না থাকলে হোমের ব্যানার অংশ লুকানো থাকবে। স্লাইড হাতে সোয়াইপ হয় ও
        নিচের বাঁকা ডিজাইন অ্যাপ নিজে যোগ করে। অনুপাত প্রায় ২.১৫:১ রাখুন।
      </p>
      <button
        data-admin-open
        onClick={() =>
          setDraft({
            image: "",
            link: "",
            alt_bn: "",
            alt_en: "",
            visible: true,
            sort: data.length + 1,
          })
        }
        className={`${btn} bg-ink text-background`}
      >
        + নতুন ব্যানার
      </button>

      <SortList
        layout="cards"
        items={data}
        onReorder={async (a) => {
          await saveOrder("banners", a);
          refetch();
          inv("banners");
        }}
        render={(b) => (
          <article className="admin-product-card-content admin-banner-card">
            <div className="admin-product-card-badges">
              <span
                className="admin-product-status"
                data-status={b.visible ? "published" : "hidden"}
              >
                {b.visible ? "দেখানো হচ্ছে" : "লুকানো"}
              </span>
              <span className="admin-product-featured">হোম ব্যানার</span>
            </div>
            <AdminProductMedia src={b.image || ""} name={b.alt_bn || "হোম ব্যানার"} />
            <div className="admin-product-card-info">
              <h4 title={b.alt_bn || b.alt_en || "বিবরণ দেওয়া নেই"}>
                {b.alt_bn || b.alt_en || "বিবরণ দেওয়া নেই"}
              </h4>
              <p className="admin-product-card-summary admin-banner-link" title={b.link || ""}>
                {b.link || "লিংক দেওয়া নেই"}
              </p>
              <div className="admin-product-card-meta">
                <span>বাংলা ছবি: {b.image ? "আছে" : "নেই"}</span>
                <span>English ছবি: {b.image_en ? "আছে" : "নেই"}</span>
              </div>
            </div>
            <div className="admin-product-card-actions">
              <button
                type="button"
                className="admin-edit-button"
                onClick={() => setDraft(b as Row)}
              >
                <PencilLine size={14} />
                এডিট
              </button>
              <button type="button" className="admin-delete-button" onClick={() => void del(b.id)}>
                <Trash2 size={14} />
                মুছুন
              </button>
            </div>
          </article>
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
  const [f, setF] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["admin-orders", f, page],
    queryFn: async () => {
      let request = supabase.from("orders").select("*", { count: "exact" });
      if (f !== "all") request = request.eq("status", f);
      const result = await request
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (result.error) throw result.error;
      return { rows: result.data, count: result.count || 0 };
    },
  });
  const update = async (id: string, patch: { status?: string; tracking?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("আপডেট হয়েছে");
      refetch();
    }
  };
  const list = data?.rows || [];
  return (
    <div className="space-y-3">
      <AdminBusinessDashboard overview />
      <p className="text-xs text-muted-foreground">
        এখানে শুধু অ্যাপ থেকে নিশ্চিত হওয়া অর্ডার। WhatsApp জিজ্ঞাসা এখানে আসে না। অর্ডারের দাম ও
        আইটেম পরিবর্তনযোগ্য নয়।
      </p>
      <select
        className={`${input} w-auto`}
        value={f}
        onChange={(e) => {
          setF(e.target.value);
          setPage(0);
        }}
      >
        <option value="all">সব</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_BN[s]}
          </option>
        ))}
      </select>
      {isLoading && <p>লোড হচ্ছে…</p>}
      {isError && (
        <p role="alert">
          অর্ডার লোড হয়নি। <button onClick={() => void refetch()}>আবার চেষ্টা করুন</button>
        </p>
      )}
      {!isLoading && !isError && !list.length && (
        <p className="text-muted-foreground">কোনো অর্ডার নেই।</p>
      )}
      <div className="flex items-center gap-3 text-sm">
        <button
          className="rounded-lg border px-3 py-2 disabled:opacity-40"
          disabled={page === 0 || isLoading}
          onClick={() => setPage((p) => p - 1)}
        >
          আগের পাতা
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil((data?.count || 0) / pageSize))}
        </span>
        <button
          className="rounded-lg border px-3 py-2 disabled:opacity-40"
          disabled={isLoading || (page + 1) * pageSize >= (data?.count || 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          পরের পাতা
        </button>
      </div>
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
        {o.trx_id ? ` · TrxID: ${o.trx_id}` : ""} · সাবটোটাল {BDT(o.subtotal)} + ডেলিভারি{" "}
        {BDT(o.delivery_fee)} = {BDT(o.total)}
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
  const pay = (v["payments"] ?? { cod: true, bkash: true, nagad: true, online: false }) as Record<
    string,
    boolean
  >;
  const save = async () => {
    if (
      str(v["play_store_url"]) &&
      !/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/.test(str(v["play_store_url"]))
    )
      return void toast.error("সঠিক Play Store app link দিন");
    for (const k of ["facebook", "instagram", "tiktok", "youtube"])
      if (str(v[k]) && !/^https?:\/\//.test(str(v[k])))
        return void toast.error(`${k} লিংক https:// দিয়ে শুরু করুন`);
    let imoValue = str(v["imo"]).trim();
    if (imoValue && !/^https?:\/\//.test(imoValue)) {
      const identity = loginIdentity(imoValue);
      if (!identity || !("phone" in identity))
        return void toast.error("সঠিক IMO মোবাইল নম্বর দিন (01XXXXXXXXX)");
      imoValue = identity.phone;
    }
    if (!(Number(v["fee_dhaka"]) >= 0) || !(Number(v["fee_outside"]) >= 0))
      return void toast.error("ডেলিভারি চার্জ ঠিক করুন");
    const { ticker_bn: _bn, ticker_en: _en, ticker_enabled: _enabled, ...contactSettings } = v;
    const { error } = await supabase
      .from("site_settings")
      .upsert({ ...contactSettings, imo: imoValue, id: 1 } as never);
    if (error) return void toast.error(error.message);
    toast.success("সেভ হয়েছে");
    setInit(v);
    inv("settings");
  };
  const t = (k: string, l: string, ph?: string) => (
    <Field key={k} label={l}>
      <Text
        translationKey={typeof k === "string" ? k : undefined}
        v={v[k]}
        ph={ph}
        on={(s) => set(k, s)}
      />
    </Field>
  );
  return (
    <div className="grid gap-3 rounded-2xl bg-card p-4 shadow-pill sm:grid-cols-2">
      {t(
        "play_store_url",
        "Rate Us — প্রকাশিত Play Store app link",
        "https://play.google.com/store/apps/details?id=…",
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={v["phone_auth_enabled"] === true}
          onChange={(e) => set("phone_auth_enabled", e.target.checked)}
        />
        SMS OTP লগইন চালু (SMS provider ও Cloud verification সেটআপ করার পর)
      </label>
      <p className="text-sm font-extrabold sm:col-span-2">যোগাযোগ</p>
      {t("support_phone", "সাধারণ কল নম্বর")}
      {t("whatsapp", "WhatsApp (8801…)")}
      {t("email", "সাপোর্ট ইমেইল")}
      {t("imo", "IMO মোবাইল নম্বর", "01XXXXXXXXX")}
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
        <Text
          type="number"
          v={v["free_delivery_min"]}
          on={(s) => set("free_delivery_min", num(s))}
        />
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
    queryFn: async () => {
      const r = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const { data: products = [] } = useAdminProducts();
  const names = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.name_bn])),
    [products],
  );
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
type CT = "offers" | "posts" | "reviews" | "certifications" | "doctors" | "outlets";
const CFG: Record<CT, { title: string; sortable?: boolean; fields: F[]; note?: string }> = {
  offers: {
    title: "title_bn",
    sortable: true,
    note: "প্রতিটি অফার একটি স্বতন্ত্র পণ্য। নিজের নাম, ছবি, বিবরণ, অফার মূল্য ও আগের দাম দিন। Order Now সরাসরি অ্যাপের নিজস্ব Checkout খুলবে; অর্ডারের Link লাগে না।",
    fields: [
      { key: "title_bn", label: "অফারের নাম (বাংলা)" },
      { key: "title_en", label: "Offer title (English)" },
      { key: "description_bn", label: "বিবরণ (বাংলা)", type: "area" },
      { key: "description_en", label: "Description (English)", type: "area" },
      { key: "image", label: "Offer product PNG — 1:1, 1200×1200px", type: "image" },
      { key: "product_id", label: "এই অফারের Product (ঐচ্ছিক)", type: "product" },
      { key: "price", label: "অফার মূল্য ৳ (অর্ডারের জন্য আবশ্যক)", type: "number" },
      { key: "old_price", label: "আগের দাম ৳ (ঐচ্ছিক)", type: "number" },
      { key: "visible", label: "Offers page-এ দেখাবে", type: "bool" },
    ],
  },
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
      { key: "excerpt_bn", label: "সংক্ষিপ্ত সারাংশ (বাংলা)", type: "area" },
      { key: "excerpt_en", label: "Excerpt (English)", type: "area" },
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
      { key: "name_en", label: "Customer name (English)" },
      { key: "rating", label: "রেটিং ১-৫ (ঐচ্ছিক)", type: "number" },
      { key: "text_bn", label: "মন্তব্য", type: "area" },
      { key: "text_en", label: "Review text (English)", type: "area" },
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
      { key: "title_en", label: "Title (English)" },
      { key: "issuer", label: "প্রদানকারী / মালিকানা" },
      { key: "issuer_en", label: "Issuer (English)" },
      { key: "cert_no", label: "নম্বর" },
      { key: "scope", label: "পরিধি (scope)" },
      { key: "scope_en", label: "Scope (English)" },
      { key: "valid_until", label: "মেয়াদ" },
      { key: "image", label: "ছবি", type: "image" },
      { key: "doc_url", label: "PDF / ল্যাব রিপোর্ট", type: "file" },
    ],
  },
  doctors: {
    title: "name",
    fields: [
      { key: "name", label: "নাম" },
      { key: "name_en", label: "Name (English)" },
      { key: "designation", label: "পদবি / বর্তমান ভূমিকা (বাংলা)" },
      { key: "designation_en", label: "Designation (English)" },
      { key: "degree", label: "ডিগ্রি" },
      { key: "degree_en", label: "Degree (English)" },
      { key: "education", label: "বিস্তারিত শিক্ষাগত যোগ্যতা (বাংলা)", type: "area" },
      { key: "education_en", label: "Detailed education (English)", type: "area" },
      { key: "achievements", label: "পেশাগত অর্জন (বাংলা)", type: "area" },
      { key: "achievements_en", label: "Professional achievements (English)", type: "area" },
      { key: "specialty_bn", label: "বিশেষজ্ঞতা (বাংলা)" },
      { key: "specialty_en", label: "Specialty (English)" },
      { key: "experience", label: "অভিজ্ঞতা" },
      { key: "experience_en", label: "Experience (English)" },
      { key: "schedule", label: "সময়/প্রাপ্যতা" },
      { key: "schedule_en", label: "Schedule (English)" },
      { key: "phone", label: "ফোন" },
      { key: "whatsapp", label: "WhatsApp (8801…)" },
      { key: "consultation_free", label: "ফোনে পরামর্শ বিনামূল্যে", type: "bool" },
      {
        key: "consultation_payment_url",
        label: "Fee payment link (https://…, খালি হলে পরে ফি দেবেন)",
      },
      { key: "consultation_fee", label: "ফোনে পরামর্শ ফি ৳ (0 = বিনামূল্যে)", type: "number" },
      { key: "in_person_free", label: "সরাসরি পরামর্শ বিনামূল্যে", type: "bool" },
      { key: "in_person_fee", label: "সরাসরি ফি ৳ (0 = বিনামূল্যে)", type: "number" },
      { key: "in_person_schedule", label: "সরাসরি দেখানোর সময়সূচি", type: "area" },
      { key: "in_person_schedule_en", label: "In-person schedule (English)", type: "area" },
      { key: "workplace", label: "কর্মস্থল / চেম্বারের ঠিকানা", type: "area" },
      { key: "workplace_en", label: "Workplace / chamber address (English)", type: "area" },
      {
        key: "availability",
        label: "বর্তমান প্রাপ্যতা",
        type: "select",
        options: [
          ["unknown", "দেখাবেন না"],
          ["online", "অনলাইন"],
          ["offline", "অফলাইন"],
        ],
      },
      { key: "followup_fee", label: "ফলো-আপ ফি ৳ (0 = ফ্রি)", type: "number" },
      { key: "followup_days", label: "ফলো-আপ কত দিনের মধ্যে", type: "number" },
      {
        key: "profile_rating",
        label: "ডাক্তারের যাচাইকৃত গড় রেটিং (০–৫, তথ্য না থাকলে ফাঁকা)",
        type: "number",
      },
      {
        key: "profile_review_count",
        label: "যাচাইকৃত রিভিউ সংখ্যা (তথ্য না থাকলে ফাঁকা)",
        type: "number",
      },
      { key: "patients_seen", label: "রোগী দেখেছেন (প্রকৃত সংখ্যা)", type: "number" },
      { key: "joined_on", label: "যোগদানের তারিখ", type: "date" },
      { key: "doctor_code", label: "Doctor কোড" },
      { key: "consultation_minutes", label: "পরামর্শের গড় সময় (মিনিট)", type: "number" },
      { key: "certification", label: "Certification / পেশাগত সনদ (যাচাই করা)" },
      { key: "certification_en", label: "Certification (English)" },
      { key: "certification_image", label: "সনদের ছবি", type: "image" },
      { key: "training_bn", label: "প্রশিক্ষণ ও পেশাগত অভিজ্ঞতা", type: "area" },
      { key: "training_en", label: "Training / professional experience (English)", type: "area" },
      { key: "services_bn", label: "সেবার বিষয়সমূহ", type: "area" },
      { key: "services_en", label: "Services (English)", type: "area" },
      { key: "languages_bn", label: "যোগাযোগের ভাষা" },
      { key: "languages_en", label: "Languages (English)" },
      { key: "bio_bn", label: "Doctor সম্পর্কে (বাংলা)", type: "area" },
      { key: "bio_en", label: "Doctor biography (English)", type: "area" },
      {
        key: "consultation_note",
        label: "বুকিং / পরামর্শের অতিরিক্ত নির্দেশনা (বাংলা)",
        type: "area",
      },
      { key: "consultation_note_en", label: "Booking guidance (English)", type: "area" },
      {
        key: "profile_position",
        label: "Portrait crop / ছবির ফোকাস",
        type: "select",
        options: [
          ["center top", "উপরের অংশ / মুখ"],
          ["center center", "ছবির মাঝখান"],
          ["center bottom", "নিচের অংশ"],
        ],
      },
      {
        key: "photo",
        label: "Portrait ছবি — 3:4, অন্তত 900×1200px; মুখ ও কাঁধের পাশে জায়গা রাখুন",
        type: "image",
      },
    ],
  },
  outlets: {
    title: "name",
    sortable: true,
    fields: [
      { key: "name", label: "নাম" },
      { key: "name_en", label: "Name (English)" },
      { key: "phone", label: "ফোন" },
      { key: "address", label: "ঠিকানা", type: "area" },
      { key: "address_en", label: "Address (English)", type: "area" },
      { key: "map_url", label: "ম্যাপ লিংক (খালি হলে ঠিকানা দিয়ে খুঁজবে)" },
      { key: "photo", label: "ছবি", type: "image" },
      { key: "visible", label: "দেখাবে", type: "bool" },
    ],
  },
};
const PUBLIC_KEY: Record<CT, string> = {
  offers: "offers",
  posts: "posts",
  reviews: "reviews",
  certifications: "certifications",
  doctors: "doctors",
  outlets: "outlets",
};

function Crud({ table }: { table: CT }) {
  const cfg = CFG[table];
  const [postKind, setPostKind] = useState<"tip" | "article">("tip");
  const inv = useInvalidate();
  const [edit, setEdit] = useState<{ init: Row; v: Row } | null>(null);
  const {
    data = [],
    refetch,
    isLoading,
    isError,
  } = useQuery({
    queryKey: table === "posts" ? ["admin", table, postKind] : ["admin", table],
    queryFn: async () => {
      let q = (supabase as SupabaseClient).from(table).select("*");
      if (table === "posts") q = q.eq("kind", postKind);
      const r = cfg.sortable
        ? await q.order("sort")
        : await q.order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return (r.data ?? []) as unknown as (Row & { id: string })[];
    },
  });
  const { data: products = [] } = useAdminProducts();
  const dirty = !!edit && JSON.stringify(edit.v) !== JSON.stringify(edit.init);
  useDirtyGuard(dirty);
  const postTabs =
    table === "posts" ? (
      <div
        role="tablist"
        aria-label="হেলথ টিপস ও আর্টিকেল"
        className="grid min-w-0 grid-cols-2 gap-2 rounded-xl bg-secondary p-1 sm:col-span-2"
      >
        {(
          [
            ["tip", "হেলথ টিপস"],
            ["article", "আর্টিকেল"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={postKind === kind}
            onClick={() => {
              if (kind !== postKind && confirmDiscard(dirty)) {
                setEdit(null);
                setPostKind(kind);
              }
            }}
            className={`min-w-0 rounded-lg px-2 py-3 text-sm font-semibold ${postKind === kind ? "bg-primary text-white" : "text-black"}`}
          >
            {label}
          </button>
        ))}
      </div>
    ) : null;
  const refresh = () => {
    refetch();
    inv(PUBLIC_KEY[table]);
  };
  const save = async () => {
    const { id, created_at, ...rest } = edit!.v;
    void created_at;
    if (table === "posts") {
      rest["kind"] = postKind;
      if (postKind === "article") rest["category"] = "";
    }
    if (
      table === "reviews" &&
      rest["rating"] != null &&
      (Number(rest["rating"]) < 1 || Number(rest["rating"]) > 5)
    )
      return void toast.error("রেটিং ১-৫");
    if (table === "reviews" && !str(rest["media_url"]))
      return void toast.error("ছবি/ভিডিও লিংক দিন");
    if (table === "offers") {
      if (!str(rest["title_bn"]).trim() || !str(rest["image"]).trim())
        return void toast.error("অফারের বাংলা নাম ও ছবি দিন");
      if (
        rest["price"] != null &&
        (!Number.isInteger(Number(rest["price"])) || Number(rest["price"]) <= 0)
      )
        return void toast.error("সঠিক অফার মূল্য দিন");
      if (
        rest["old_price"] != null &&
        (rest["price"] == null || Number(rest["old_price"]) <= Number(rest["price"]))
      )
        return void toast.error("আগের দাম অফার মূল্যের চেয়ে বেশি দিন");
    }
    if (table === "doctors") {
      if (
        rest["profile_rating"] != null &&
        (!Number.isFinite(Number(rest["profile_rating"])) ||
          Number(rest["profile_rating"]) < 0 ||
          Number(rest["profile_rating"]) > 5)
      )
        return void toast.error("রেটিং ০ থেকে ৫-এর মধ্যে দিন");
      if (rest["profile_review_count"] != null && Number(rest["profile_review_count"]) < 0)
        return void toast.error("রিভিউ সংখ্যা ঋণাত্মক হতে পারে না");
      const scheduleIssue = scheduleError(rest["booking_schedule"]);
      if (scheduleIssue) return void toast.error(scheduleIssue);
      if (rest["consultation_free"] === true) rest["consultation_fee"] = 0;
      else if (
        rest["consultation_fee"] == null ||
        !Number.isInteger(Number(rest["consultation_fee"])) ||
        Number(rest["consultation_fee"]) < 0
      )
        return void toast.error("Doctor-এর পরামর্শ ফি দিন অথবা বিনামূল্যে চালু করুন");
      rest["consultation_free"] = Number(rest["consultation_fee"]) === 0;
      if (rest["in_person_free"] === true) rest["in_person_fee"] = 0;
      if (
        rest["in_person_fee"] != null &&
        (!Number.isInteger(Number(rest["in_person_fee"])) || Number(rest["in_person_fee"]) < 0)
      )
        return void toast.error("সরাসরি দেখানোর সঠিক ফি দিন");
      rest["in_person_free"] = rest["in_person_fee"] === 0;
    }
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
    const set = (k: string, val: unknown) => {
      const next = { ...v, [k]: val };
      if (table === "doctors" && k === "consultation_fee") next["consultation_free"] = val === 0;
      if (table === "doctors" && k === "consultation_free") {
        if (val === true) next["consultation_fee"] = 0;
        else if (next["consultation_fee"] === 0) next["consultation_fee"] = null;
      }
      if (table === "doctors" && k === "in_person_fee") next["in_person_free"] = val === 0;
      if (table === "doctors" && k === "in_person_free") {
        if (val === true) next["in_person_fee"] = 0;
        else if (next["in_person_fee"] === 0) next["in_person_fee"] = null;
      }
      setEdit({ ...edit, v: next });
    };
    return (
      <AdminEditor
        title={
          table === "posts"
            ? postKind === "tip"
              ? "হেলথ টিপস সম্পাদনা"
              : "আর্টিকেল সম্পাদনা"
            : "তথ্য সম্পাদনা"
        }
        onBack={() => {
          if (confirmDiscard(dirty)) setEdit(null);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {postTabs}
          {cfg.fields
            .filter(
              (f) =>
                !(
                  table === "posts" &&
                  (f.key === "kind" || (f.key === "category" && postKind !== "tip"))
                ),
            )
            .map((f) => {
              const wide =
                (f.type === "area" && (!/_bn$|_en$/.test(f.key) || f.key.startsWith("body_"))) ||
                f.type === "image" ||
                f.type === "file";
              let el: ReactNode;
              if (f.type === "area")
                el = (
                  <Text
                    translationKey={typeof f.key === "string" ? f.key : undefined}
                    area
                    rows={f.key.startsWith("body_") ? 6 : 2}
                    v={v[f.key]}
                    on={(s) => set(f.key, s)}
                  />
                );
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
                el = (
                  <input
                    type="checkbox"
                    checked={!!v[f.key]}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                );
              else if (f.type === "number")
                el = (
                  <Text
                    translationKey={typeof f.key === "string" ? f.key : undefined}
                    type="number"
                    v={v[f.key]}
                    on={(s) =>
                      set(
                        f.key,
                        ((table === "doctors" &&
                          [
                            "consultation_fee",
                            "in_person_fee",
                            "followup_fee",
                            "followup_days",
                            "patients_seen",
                            "profile_rating",
                            "profile_review_count",
                            "consultation_minutes",
                          ].includes(f.key)) ||
                          table === "offers") &&
                          !s.trim()
                          ? null
                          : f.key === "profile_rating"
                            ? Number(s)
                            : num(s),
                      )
                    }
                  />
                );
              else if (f.type === "date")
                el = (
                  <Text
                    translationKey={typeof f.key === "string" ? f.key : undefined}
                    type="date"
                    v={v[f.key]}
                    on={(s) => set(f.key, s || null)}
                  />
                );
              else if (f.type === "image")
                el = (
                  <Upload
                    folder={
                      table === "doctors"
                        ? f.key === "photo"
                          ? "doctor-portraits"
                          : "doctor-certificates"
                        : table
                    }
                    value={str(v[f.key])}
                    onChange={(u) => set(f.key, u)}
                  />
                );
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
                  <select
                    className={input}
                    value={str(v[f.key])}
                    onChange={(e) => set(f.key, e.target.value || null)}
                  >
                    <option value="">— কোনো নির্দিষ্ট প্রোডাক্ট নয়</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name_bn}
                      </option>
                    ))}
                  </select>
                );
              else
                el = (
                  <Text
                    translationKey={typeof f.key === "string" ? f.key : undefined}
                    v={v[f.key]}
                    on={(s) => set(f.key, s)}
                  />
                );
              return (
                <Fragment key={f.key}>
                  {table === "doctors" &&
                    (
                      {
                        name: "01 · পরিচিতি ও যোগ্যতা",
                        schedule: "02 · যোগাযোগ, ফি ও সময়সূচি",
                        availability: "03 · প্রাপ্যতা ও পরামর্শের তথ্য",
                        certification: "04 · সনদ ও পেশাগত অভিজ্ঞতা",
                        bio_bn: "05 · পরিচিতি, বুকিং নির্দেশনা ও ছবি",
                      } as Record<string, string>
                    )[f.key] && (
                      <div className="admin-form-section-label sm:col-span-2">
                        <h4>
                          {
                            (
                              {
                                name: "01 · পরিচিতি ও যোগ্যতা",
                                schedule: "02 · যোগাযোগ, ফি ও সময়সূচি",
                                availability: "03 · প্রাপ্যতা ও পরামর্শের তথ্য",
                                certification: "04 · সনদ ও পেশাগত অভিজ্ঞতা",
                                bio_bn: "05 · পরিচিতি, বুকিং নির্দেশনা ও ছবি",
                              } as Record<string, string>
                            )[f.key]
                          }
                        </h4>
                      </div>
                    )}
                  <Field label={f.label} wide={wide}>
                    {el}
                  </Field>
                </Fragment>
              );
            })}
          {table === "posts" && (
            <details className="admin-post-preview rounded-xl border p-3 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-semibold">প্রিভিউ দেখুন</summary>
              <div className="max-h-80 overflow-y-auto">
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
            </details>
          )}
          {table === "doctors" && (
            <AdminDoctorSchedule
              value={v["booking_schedule"]}
              onChange={(x) => set("booking_schedule", x)}
            />
          )}
          <Actions onSave={save} onCancel={() => confirmDiscard(dirty) && setEdit(null)} />
        </div>
      </AdminEditor>
    );
  }
  const render = (r: Row & { id: string }) =>
    table === "reviews" ? (
      <article className="admin-product-card-content admin-review-card">
        <div className="admin-product-card-badges">
          <span className="admin-product-status" data-status={r["hidden"] ? "hidden" : "published"}>
            {r["hidden"] ? "লুকানো" : "দেখানো হচ্ছে"}
          </span>
          <span className="admin-product-featured">
            {r["media_type"] === "video" ? "ভিডিও রিভিউ" : "ছবি রিভিউ"}
          </span>
        </div>
        <AdminReviewMedia
          url={str(r["media_url"])}
          video={r["media_type"] === "video"}
          name={str(r["name"]) || "গ্রাহকের রিভিউ"}
        />
        <div className="admin-product-card-info">
          <h4>{str(r["name"]) || "নাম দেওয়া নেই"}</h4>
          <p className="admin-product-card-summary" title={str(r["text_bn"])}>
            {str(r["text_bn"]) || "আলাদা মন্তব্য নেই"}
          </p>
          <div className="admin-review-product">
            {products.find((p) => p.id === r["product_id"])?.name_bn ||
              (r["product_id"] ? "পণ্যের নাম পাওয়া যায়নি" : "সাধারণ রিভিউ")}
          </div>
          {Number(r["rating"]) >= 1 && Number(r["rating"]) <= 5 && (
            <div className="admin-review-rating">
              <Star size={13} />
              {Number(r["rating"]).toLocaleString("bn-BD")} / ৫
            </div>
          )}
        </div>
        <div className="admin-product-card-actions">
          <button
            type="button"
            className="admin-edit-button"
            onClick={() => setEdit({ init: r, v: r })}
          >
            <PencilLine size={14} />
            এডিট
          </button>
          <button type="button" className="admin-delete-button" onClick={() => void del(r.id)}>
            <Trash2 size={14} />
            মুছুন
          </button>
        </div>
      </article>
    ) : table === "doctors" ? (
      <article className="admin-product-card-content admin-doctor-card">
        <div className="admin-product-card-badges">
          <span className="admin-product-featured">
            <Stethoscope size={12} />
            ডাক্তার
          </span>
          {str(r["availability"]) !== "unknown" && str(r["availability"]) && (
            <span
              className="admin-product-status"
              data-status={r["availability"] === "online" ? "published" : "hidden"}
            >
              {r["availability"] === "online" ? "অনলাইন" : "অফলাইন"}
            </span>
          )}
        </div>
        <AdminProductMedia src={str(r["photo"])} name={str(r["name"]) || "ডাক্তার"} />
        <div className="admin-product-card-info">
          <h4 title={str(r["name"])}>{str(r["name"]) || "নাম দেওয়া নেই"}</h4>
          <p className="admin-product-card-summary" title={str(r["specialty_bn"])}>
            {str(r["specialty_bn"]) || "বিশেষজ্ঞতা দেওয়া নেই"}
          </p>
          <p className="admin-doctor-degree" title={str(r["degree"])}>
            {str(r["degree"]) || "ডিগ্রি দেওয়া নেই"}
          </p>
          <div className="admin-doctor-fees">
            {[
              ["ফোনে পরামর্শ", "consultation_fee", "consultation_free"],
              ["সরাসরি পরামর্শ", "in_person_fee", "in_person_free"],
            ].map(([label, key, free]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>
                  {r[free!] === true
                    ? "বিনামূল্যে"
                    : r[key!] == null || r[key!] === ""
                      ? "ফি দেওয়া নেই"
                      : Number(r[key!]) === 0
                        ? "বিনামূল্যে"
                        : BDT(Number(r[key!]))}
                </strong>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-product-card-actions">
          <button
            type="button"
            className="admin-edit-button"
            onClick={() => setEdit({ init: r, v: r })}
          >
            <PencilLine size={14} />
            এডিট
          </button>
          <button type="button" className="admin-delete-button" onClick={() => void del(r.id)}>
            <Trash2 size={14} />
            মুছুন
          </button>
        </div>
      </article>
    ) : (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold">
          {str(r[cfg.title]) || str(r["media_url"]) || "—"}
          {r["status"] ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {STATUS_LABEL[str(r["status"])] ?? str(r["status"])}
            </span>
          ) : null}
          {r["hidden"] ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">লুকানো</span>
          ) : null}
        </span>
        <span className="flex shrink-0 gap-3">
          <button
            onClick={() => setEdit({ init: r, v: r })}
            className="admin-edit-button underline"
          >
            এডিট
          </button>
          <button
            onClick={() => del(r.id)}
            className="admin-delete-button text-destructive underline"
          >
            মুছুন
          </button>
        </span>
      </div>
    );
  const blank: Row =
    table === "offers"
      ? { visible: false, sort: data.length + 1, price: null, old_price: null }
      : table === "posts"
        ? { status: "draft", kind: postKind, category: "" }
        : table === "outlets"
          ? { visible: true, sort: data.length + 1 }
          : cfg.sortable
            ? { sort: data.length + 1 }
            : {};
  return (
    <div className="space-y-2">
      {table === "reviews" && <AdminCustomerReviews />}
      {table === "reviews" && <h3 className="text-lg font-semibold">ছবি ও ভিডিও রিভিউ</h3>}
      {postTabs}
      {isLoading && <p>লোড হচ্ছে…</p>}
      {isError && (
        <p role="alert">
          তালিকা লোড হয়নি।{" "}
          <button className="underline" onClick={() => void refetch()}>
            আবার চেষ্টা করুন
          </button>
        </p>
      )}
      {table === "posts" && !isLoading && !isError && !data.length && (
        <p className="py-3 text-sm">
          {postKind === "tip"
            ? "এখনো কোনো হেলথ টিপস যোগ করা হয়নি।"
            : "এখনো কোনো আর্টিকেল যোগ করা হয়নি।"}
        </p>
      )}
      {cfg.note && <p className="text-xs text-muted-foreground">{cfg.note}</p>}
      <button
        data-admin-open
        onClick={() => setEdit({ init: blank, v: blank })}
        className={`${btn} bg-ink text-background`}
      >
        {table === "posts"
          ? postKind === "tip"
            ? "+ নতুন হেলথ টিপস"
            : "+ নতুন আর্টিকেল"
          : "+ নতুন"}
      </button>
      {!isLoading && !isError && <AdminCollectionStats items={data} kind={table} />}
      {cfg.sortable ? (
        <SortList
          layout={table === "reviews" ? "cards" : "list"}
          items={data}
          onReorder={async (a) => {
            await saveOrder(table as "reviews", a);
            refresh();
          }}
          render={render}
        />
      ) : (
        <div className={table === "doctors" ? "admin-product-grid" : "space-y-2"}>
          {data.map((r) => (
            <div
              key={r.id}
              className={
                table === "doctors"
                  ? "admin-doctor-grid-card"
                  : "rounded-2xl bg-card p-3 shadow-pill"
              }
            >
              {render(r)}
            </div>
          ))}
        </div>
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
        <h2 className="text-xl font-extrabold">
          গ্রাহক {q.data && `(${q.data.total.toLocaleString("bn-BD")})`}
        </h2>
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
                        {c.avatar && (
                          <img
                            src={c.avatar}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        )}
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
                      <button
                        className="font-semibold text-primary underline"
                        onClick={() => setSelected(c.id)}
                      >
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.data.rows.length === 0 && (
              <p className="p-5 text-center">কোনো গ্রাহক পাওয়া যায়নি।</p>
            )}
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
