import { ProfileSpinWins, useAttachSpinClaim } from "@/components/ProfileSpinWins";
import { configuredMenu, PROFILE_DEFAULTS } from "@/lib/app-menus";
import { Info } from "lucide-react";
import { uiClient } from "@/lib/presentation";
import { EditableIcon, UploadedIcon, usePresentation } from "@/lib/presentation";
import { MyOrders } from "@/components/MyOrders";
import { NumberText } from "@/components/NumberText";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import {
  Gift,
  BadgeCheck,
  ChevronRight,
  Globe,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  PackageSearch,
  Pencil,
  Phone,
  ShieldCheck,
  Star,
  Share2,
  Trash2,
  UserRound,
  Headset,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { OrderBar } from "@/components/OrderBar";
import { BDT, productVariants, useProducts, useStore } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useContacts } from "@/lib/contacts";
import { CustomerAuth } from "@/components/CustomerAuth";
import { useSettings } from "@/lib/store";
import { SocialLinks } from "@/components/SocialLinks";

export const Route = createFileRoute("/profile")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "আমার প্রোফাইল — ইকোরি" },
      { name: "description", content: "অর্ডার, ঠিকানা, পছন্দের পণ্য ও অ্যাকাউন্ট সেটিংস।" },
      { property: "og:title", content: "আমার প্রোফাইল — ইকোরি" },
      { property: "og:description", content: "অর্ডার, ঠিকানা, পছন্দের পণ্য ও অ্যাকাউন্ট সেটিংস।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

type View = "spin" | "home" | "auth" | "edit" | "orders" | "addresses" | "support";
const input =
  "w-full rounded-2xl bg-card px-4 py-3 text-sm shadow-pill outline-none focus:ring-2 focus:ring-ring";

function Profile() {
  const { lang, setLang, cart } = useStore();
  const bn = lang === "bn";
  const { data: ui } = usePresentation();
  const { user, ready } = useSession();
  const { data: settings } = useSettings();
  const { data: products = [] } = useProducts();
  const [view, setView] = useState<View>("home");
  const [afterAuth, setAfterAuth] = useState<View>("home");
  useAttachSpinClaim(user?.id);
  const [appShareUrl, setAppShareUrl] = useState("");
  usePendingProfile();
  const nav = useNavigate();
  const bookingExists = useQuery({
    queryKey: ["my-doctor-bookings-exists", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const r = await supabase
        .from("doctor_bookings")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      if (r.error) throw r.error;
      return !!r.data.length;
    },
  });
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const cartTotal = cart.reduce((a, c) => {
    const p = products.find((x) => x.id === c.id);
    const v = p ? productVariants(p).find((x) => x.id === c.variantId) : undefined;
    return a + (v?.price ?? p?.price ?? 0) * c.qty;
  }, 0);
  const bar =
    cart.length && cartTotal ? (
      <OrderBar total={cartTotal} onOrder={() => nav({ to: "/checkout", search: {} })} />
    ) : undefined;

  const logout = async () => {
    await qc.cancelQueries();
    await supabase.auth.signOut();
    qc.removeQueries({ queryKey: ["profile"] });
    qc.removeQueries({ queryKey: ["myorders"] });
    qc.removeQueries({ queryKey: ["addresses"] });
    setView("home");
    toast.success(bn ? "লগআউট হয়েছে" : "Logged out");
  };

  const shareApp = async () => {
    const url = settings?.play_store_url?.trim() || "https://ecory.app/";
    if (navigator.share) {
      try {
        await navigator.share({ title: bn ? "ইকোরি অ্যাপ" : "Ecory App", url });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(bn ? "অ্যাপের লিংক কপি হয়েছে" : "App link copied");
    } catch {
      setAppShareUrl(url);
    }
  };

  const needLogin = (v: View) => {
    if (user) setView(v);
    else {
      setAfterAuth(v);
      setView("auth");
    }
  };

  let body: ReactNode;
  if (!ready)
    body = (
      <EditableIcon name="icon_loader2">
        <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" />
      </EditableIcon>
    );
  else if (view === "auth")
    body = (
      <>
        <CustomerAuth onDone={() => setView(afterAuth)} />
      </>
    );
  else if (view === "edit" && user)
    body = (
      <>
        <EditProfile
          userId={user.id}
          email={user.email ?? ""}
          initial={profile.data}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            setView("home");
          }}
        />
      </>
    );
  else if (view === "spin" && user) body = <ProfileSpinWins userId={user.id} bn={bn} />;
  else if (view === "orders" && user)
    body = (
      <>
        <MyOrders userId={user.id} />
      </>
    );
  else if (view === "addresses" && user)
    body = (
      <>
        <Addresses userId={user.id} />
      </>
    );
  else if (view === "support")
    body = (
      <>
        <Support />
      </>
    );
  else {
    const name = profile.data?.full_name || user?.email?.split("@")[0] || "";
    const initials = name.slice(0, 2).toUpperCase();
    const row = (
      icon: ReactNode,
      label: string,
      onClick?: () => void,
      to?: string,
      extra?: ReactNode,
    ) => {
      const cls = "ecory-profile-menu-row flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold";
      const inner = (
        <>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
            {icon}
          </span>
          <span className="flex-1">{label}</span>
          {extra ?? (
            <EditableIcon name="icon_chevron_right">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </EditableIcon>
          )}
        </>
      );
      return to ? (
        <Link to={to} className={cls}>
          {inner}
        </Link>
      ) : (
        <button onClick={onClick} className={cls}>
          {inner}
        </button>
      );
    };
    body = (
      <>
        <section className="rounded-3xl bg-card p-5 shadow-pill">
          {user ? (
            <div className="flex items-center gap-4">
              {profile.data?.avatar ? (
                <img
                  src={profile.data.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground">
                  {initials || (
                    <EditableIcon name="icon_user_round">
                      <UserRound />
                    </EditableIcon>
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold">{name}</h2>
                <p className="text-sm text-muted-foreground">{profile.data?.phone || user.email}</p>
                <button
                  onClick={() => setView("edit")}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-accent-foreground"
                >
                  <EditableIcon name="icon_pencil">
                    <Pencil className="h-3 w-3" />
                  </EditableIcon>
                  {bn ? "এডিট প্রোফাইল" : "Edit profile"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <EditableIcon name="icon_user_round">
                  <UserRound className="h-7 w-7 text-muted-foreground" />
                </EditableIcon>
              </span>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {bn
                    ? "অর্ডার ও জেতা পুরস্কার দেখতে লগইন করুন"
                    : "Sign in to order and view your rewards"}
                </p>
                <button
                  onClick={() => setView("auth")}
                  className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  {bn ? "লগইন / অ্যাকাউন্ট খুলুন" : "Log in / Sign up"}
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-pill">
          {configuredMenu(ui?.profile_items, PROFILE_DEFAULTS, true)
            .filter((x) => x.visible && (x.target !== "/doctor-bookings" || bookingExists.data))
            .map((x) => {
              const fallback =
                (
                  {
                    icon_gift: Gift,
                    icon_package: Package,
                    icon_map_pin: MapPin,
                    icon_heart: Heart,
                    icon_globe: Globe,
                    icon_headset: Headset,
                    icon_badge_check: BadgeCheck,
                    menu_about: Info,
                    icon_shield_check: ShieldCheck,
                    icon_star: Star,
                    icon_share2: Share2,
                    nav_doctor: Info,
                  } as Record<string, typeof Info>
                )[x.icon] || Info;
              const Icon = fallback;
              const icon = (
                <UploadedIcon src={x.icon.startsWith("https:") ? x.icon : ui?.icons[x.icon]}>
                  <Icon className="h-4 w-4" />
                </UploadedIcon>
              );
              const label = bn ? x.bn : x.en;
              let action: (() => void) | undefined;
              let extra: ReactNode;
              if (x.target === "action:spin") action = () => needLogin("spin");
              else if (x.target === "action:orders") action = () => needLogin("orders");
              else if (x.target === "action:addresses") action = () => needLogin("addresses");
              else if (x.target === "action:support") action = () => setView("support");
              else if (x.target === "action:share") action = () => void shareApp();
              else if (x.target === "action:rate")
                action = () => {
                  if (settings?.play_store_url)
                    window.open(settings.play_store_url, "_blank", "noopener,noreferrer");
                  else
                    toast.info(
                      bn
                        ? "Play Store link এখনো যোগ করা হয়নি"
                        : "Play Store link has not been added yet",
                    );
                };
              else if (x.target === "action:language")
                extra = (
                  <div className="flex rounded-full bg-secondary p-1 text-xs">
                    {(["bn", "en"] as const).map((l) => (
                      <button
                        type="button"
                        key={l}
                        onClick={() => setLang(l)}
                        className={`rounded-full px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {l === "bn" ? "বাংলা" : "English"}
                      </button>
                    ))}
                  </div>
                );
              if (x.target.startsWith("https:"))
                return (
                  <a
                    key={x.id}
                    href={x.target}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold"
                  >
                    {icon}
                    <span className="flex-1">{label}</span>
                    <ChevronRight size={16} />
                  </a>
                );
              if (x.target === "action:language")
                return (
                  <div
                    key={x.id}
                    className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold"
                  >
                    {icon}
                    <span className="flex-1">{label}</span>
                    {extra}
                  </div>
                );
              return (
                <div key={x.id}>
                  {row(
                    icon,
                    label,
                    action,
                    x.target.startsWith("action:") ? undefined : x.target,
                    extra,
                  )}
                </div>
              );
            })}
        </section>
        {appShareUrl && (
          <div className="mt-3 rounded-lg border bg-white p-3">
            <label className="text-xs">
              {bn ? "শেয়ার করার লিংক" : "Share link"}
              <input
                readOnly
                value={appShareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-1 w-full rounded-md border p-2 text-xs"
              />
            </label>
            <button onClick={() => setAppShareUrl("")} className="mt-2 text-xs underline">
              {bn ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        )}
        <section className="mt-4 overflow-hidden rounded-2xl bg-card shadow-pill">
          {row(<ShieldCheck className="h-4 w-4" />, bn ? "গোপনীয়তা নীতি" : "Privacy Policy", undefined, "/privacy")}
          {row(<Trash2 className="h-4 w-4" />, bn ? "অ্যাকাউন্ট ও তথ্য মুছে দেওয়ার আবেদন" : "Delete account and data", undefined, "/delete-account")}
        </section>
        <SocialLinks bn={bn} />
        {user && (
          <section className="mt-4 overflow-hidden rounded-3xl bg-card shadow-pill">
            {row(
              <EditableIcon name="icon_log_out">
                <LogOut className="h-4 w-4" />
              </EditableIcon>,
              bn ? "লগআউট" : "Log out",
              logout,
            )}
          </section>
        )}
      </>
    );
  }
  return (
    <Shell
      title={
        view === "spin"
          ? bn
            ? "স্পিন উইন"
            : "Spin Win"
          : view === "orders"
            ? bn
              ? "আমার অর্ডার"
              : "My Orders"
            : bn
              ? "প্রোফাইল"
              : "Profile"
      }
      bottomBar={view === "auth" ? undefined : bar}
      hideNavigation={view === "auth"}
      onBack={view !== "home" ? () => setView("home") : undefined}
    >
      {body}
    </Shell>
  );
}

type ProfileRow =
  { full_name: string; phone: string; email: string; avatar: string } | null | undefined;
function EditProfile({
  userId,
  email,
  initial,
  onDone,
}: {
  userId: string;
  email: string;
  initial: ProfileRow;
  onDone: () => void;
}) {
  const { lang } = useStore();
  const bn = lang === "bn";
  const [f, setF] = useState({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email || email,
    avatar: initial?.avatar ?? "",
  });
  const [busy, setBusy] = useState(false);
  const onPhoto = (file?: File) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = 200;
      c.width = s;
      c.height = s;
      const ctx = c.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      setF((x) => ({ ...x, avatar: c.toDataURL("image/jpeg", 0.8) }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };
  const save = async () => {
    if (!f.full_name.trim() || (f.phone && !/^01\d{9}$/.test(f.phone))) {
      toast.error(bn ? "নাম ও সঠিক মোবাইল নম্বর দিন" : "Enter name and valid mobile");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: f.full_name.trim().slice(0, 100),
      phone: f.phone,
      email: f.email.trim().slice(0, 255),
      avatar: f.avatar,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error(bn ? "সেভ হয়নি" : error.message);
      return;
    }
    toast.success(bn ? "প্রোফাইল সেভ হয়েছে" : "Profile saved");
    onDone();
  };
  return (
    <div className="space-y-3">
      <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-2">
        {f.avatar ? (
          <img src={f.avatar} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <EditableIcon name="icon_user_round">
              <UserRound className="h-10 w-10 text-muted-foreground" />
            </EditableIcon>
          </span>
        )}
        <span className="text-xs font-bold text-primary">
          {bn ? "ছবি পরিবর্তন" : "Change photo"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
      </label>
      <input
        className={input}
        maxLength={100}
        placeholder={bn ? "নাম" : "Name"}
        value={f.full_name}
        onChange={(e) => setF({ ...f, full_name: e.target.value })}
      />
      <input
        className={input}
        maxLength={11}
        inputMode="tel"
        placeholder={bn ? "মোবাইল নম্বর" : "Mobile"}
        value={f.phone}
        onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })}
      />
      <input
        className={input}
        type="email"
        maxLength={255}
        placeholder={bn ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
      />
      <button
        disabled={busy}
        onClick={save}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy && (
          <EditableIcon name="icon_loader2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </EditableIcon>
        )}
        {bn ? "সেভ করুন" : "Save"}
      </button>
    </div>
  );
}

const STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;
const STATUS_BN: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "কনফার্মড",
  shipped: "পথে আছে",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};
type OrderItem = { name: string; qty: number; price: number; variant?: string; image?: string };
function Orders({ userId }: { userId: string }) {
  const { lang } = useStore();
  const bn = lang === "bn";
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["myorders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, code, status, total, subtotal, delivery_fee, payment_method, items, address, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading)
    return (
      <EditableIcon name="icon_loader2">
        <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" />
      </EditableIcon>
    );
  if (q.error)
    return (
      <p className="text-center text-sm text-destructive">
        {bn ? "অর্ডার লোড হয়নি" : "Could not load orders"}
      </p>
    );
  if (!q.data?.length)
    return (
      <div className="py-10 text-center">
        <EditableIcon name="icon_package">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        </EditableIcon>
        <p className="mt-3 text-sm text-muted-foreground">
          {bn ? "এখনও কোনো অর্ডার নেই" : "No orders yet"}
        </p>
        <Link
          to="/products"
          search={{ category: undefined }}
          className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          {bn ? "কেনাকাটা শুরু করুন" : "Start shopping"}
        </Link>
      </div>
    );
  return (
    <div className="space-y-3">
      {q.data.map((o) => {
        const idx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
        const items = (o.items as unknown as OrderItem[]) ?? [];
        return (
          <div key={o.id} className="rounded-3xl bg-card p-4 shadow-pill">
            <button
              onClick={() => setOpen(open === o.id ? null : o.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="font-extrabold tracking-wide">{o.code}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString(bn ? "bn-BD" : "en-GB")}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${o.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-accent-foreground"}`}
                >
                  {bn ? (STATUS_BN[o.status] ?? o.status) : o.status}
                </span>
                <p className="mt-1 ecory-price text-sm font-bold text-accent-foreground">
                  <NumberText value={BDT(o.total)} />
                </p>
              </div>
            </button>
            {open === o.id && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {o.status !== "cancelled" && (
                  <div className="flex items-center">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex flex-1 flex-col items-center gap-1">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${i <= idx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                        >
                          <EditableIcon name="icon_check">
                            <Check className="h-3.5 w-3.5" />
                          </EditableIcon>
                        </span>
                        <span className="text-[10px]">{bn ? STATUS_BN[s] : s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {it.image && (
                      <img
                        src={it.image}
                        alt=""
                        className="h-10 w-10 rounded-xl bg-secondary object-contain p-1"
                      />
                    )}
                    <span className="flex-1">
                      {it.name}
                      {it.variant ? ` · ${it.variant}` : ""} × {it.qty}
                    </span>
                    <span className="font-bold text-accent-foreground">
                      <span className="ecory-price">
                        <NumberText value={BDT(it.price * it.qty)} />
                      </span>
                    </span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground">
                  {bn ? "ডেলিভারি" : "Delivery"}: <NumberText value={BDT(o.delivery_fee)} /> ·{" "}
                  {o.address}
                </div>
                <Link
                  to="/track"
                  search={{ code: o.code }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <EditableIcon name="icon_package_search">
                    <PackageSearch className="h-4 w-4" />
                  </EditableIcon>
                  {bn ? "ট্র্যাকিং পেজে দেখুন" : "Open tracking"}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type Addr = {
  id?: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  area: "dhaka" | "outside";
  is_default: boolean;
};
function Addresses({ userId }: { userId: string }) {
  const { lang } = useStore();
  const bn = lang === "bn";
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Addr | null>(null);
  const q = useQuery({
    queryKey: ["addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses"] });
  const makeDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    refresh();
  };
  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim() || !/^01\d{9}$/.test(edit.phone) || edit.address.trim().length < 5) {
      toast.error(bn ? "নাম, মোবাইল ও ঠিকানা দিন" : "Name, mobile and address required");
      return;
    }
    const row = {
      label: edit.label.slice(0, 40),
      name: edit.name.trim().slice(0, 100),
      phone: edit.phone,
      address: edit.address.trim().slice(0, 500),
      district_id: "",
      upazila_id: "",
      street_address: "",
      local_area: "",
      area: edit.area,
      user_id: userId,
      is_default: edit.is_default || !q.data?.length,
    };
    if (row.is_default)
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = edit.id
      ? await uiClient.from("addresses").update(row).eq("id", edit.id)
      : await uiClient.from("addresses").insert(row);
    if (error) {
      toast.error(bn ? "সেভ হয়নি" : error.message);
      return;
    }
    setEdit(null);
    refresh();
    toast.success(bn ? "ঠিকানা সেভ হয়েছে" : "Address saved");
  };
  const del = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    refresh();
  };
  if (edit)
    return (
      <div className="space-y-3">
        <input
          className={input}
          maxLength={40}
          placeholder={bn ? "লেবেল (বাসা / অফিস)" : "Label (Home / Office)"}
          value={edit.label}
          onChange={(e) => setEdit({ ...edit, label: e.target.value })}
        />
        <input
          className={input}
          maxLength={100}
          placeholder={bn ? "প্রাপকের নাম" : "Recipient name"}
          value={edit.name}
          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
        />
        <input
          className={input}
          maxLength={11}
          inputMode="tel"
          placeholder={bn ? "মোবাইল নম্বর" : "Mobile"}
          value={edit.phone}
          onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, "") })}
        />
        <textarea
          className={input}
          rows={2}
          maxLength={500}
          placeholder={bn ? "পূর্ণ ঠিকানা" : "Full address"}
          value={edit.address}
          onChange={(e) => setEdit({ ...edit, address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          {(["dhaka", "outside"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setEdit({ ...edit, area: a })}
              className={`rounded-2xl py-3 text-sm font-semibold shadow-pill ${edit.area === a ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {a === "dhaka"
                ? bn
                  ? "ঢাকার ভিতরে"
                  : "Inside Dhaka"
                : bn
                  ? "ঢাকার বাইরে"
                  : "Outside Dhaka"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={edit.is_default}
            onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })}
          />
          {bn ? "ডিফল্ট ঠিকানা" : "Default address"}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setEdit(null)}
            className="flex-1 rounded-2xl bg-card py-3 font-bold shadow-pill"
          >
            {bn ? "বাতিল" : "Cancel"}
          </button>
          <button
            onClick={save}
            className="flex-1 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"
          >
            {bn ? "সেভ" : "Save"}
          </button>
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      {q.isLoading ? (
        <EditableIcon name="icon_loader2">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </EditableIcon>
      ) : !q.data?.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {bn ? "কোনো ঠিকানা সেভ করা নেই" : "No saved addresses"}
        </p>
      ) : (
        q.data.map((a) => (
          <div key={a.id} className="rounded-3xl bg-card p-4 shadow-pill">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold">
                  {a.label || a.name}{" "}
                  {a.is_default && (
                    <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      {bn ? "ডিফল্ট" : "Default"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.name} · {a.phone}
                </p>
                <p className="mt-1 text-sm">{a.address}</p>
              </div>
              <div className="flex gap-1">
                <button
                  aria-label="edit"
                  onClick={() => setEdit({ ...a, area: a.area as Addr["area"] })}
                  className="rounded-full bg-secondary p-2"
                >
                  <EditableIcon name="icon_pencil">
                    <Pencil className="h-3.5 w-3.5" />
                  </EditableIcon>
                </button>
                <button
                  aria-label="delete"
                  onClick={() => del(a.id)}
                  className="rounded-full bg-secondary p-2 text-destructive"
                >
                  <EditableIcon name="icon_trash2">
                    <Trash2 className="h-3.5 w-3.5" />
                  </EditableIcon>
                </button>
              </div>
            </div>
            {!a.is_default && (
              <button
                onClick={() => makeDefault(a.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary"
              >
                <EditableIcon name="icon_star">
                  <Star className="h-3.5 w-3.5" />
                </EditableIcon>
                {bn ? "ডিফল্ট করুন" : "Set default"}
              </button>
            )}
          </div>
        ))
      )}
      <button
        onClick={() =>
          setEdit({ label: "", name: "", phone: "", address: "", area: "dhaka", is_default: false })
        }
        className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground"
      >
        {bn ? "+ নতুন ঠিকানা" : "+ Add address"}
      </button>
    </div>
  );
}

function Support() {
  const SUPPORT = useContacts().support;
  const { lang } = useStore();
  const bn = lang === "bn";
  const items = [
    {
      href: SUPPORT.callHref,
      icon: Phone,
      label: bn ? "কল করুন" : "Call us",
      sub: SUPPORT.callDisplay,
    },
    {
      href: SUPPORT.whatsappHref,
      icon: MessageCircle,
      label: "WhatsApp",
      sub: SUPPORT.whatsappDisplay,
    },
  ];
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-pill"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <i.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold">{i.label}</p>
            <p className="text-sm text-muted-foreground">{i.sub}</p>
          </div>
        </a>
      ))}
      <p className="rounded-2xl bg-primary-soft p-3 text-xs text-accent-foreground">
        {bn
          ? "ইমেইল সহায়তার ঠিকানা এখনো যোগ করা হয়নি।"
          : "Email support is currently unavailable."}
      </p>
    </div>
  );
}

// Save signup metadata only for the authenticated account.
function usePendingProfile() {
  const qc = useQueryClient();
  const { user } = useSession();
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem("ecory-pending-profile");
    const meta = user.user_metadata as { full_name?: string; phone?: string; address?: string };
    let pending: { full_name?: string; phone?: string; email?: string } | null = null;
    try {
      pending = raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("ecory-pending-profile");
    }
    const p = meta?.full_name ? meta : pending?.email === user.email ? pending : null;
    if (!p) return;
    supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data)
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: p.full_name ?? "",
            phone: (p.phone ?? user.phone ?? "").replace(/^\+88/, ""),
            email: user.email ?? "",
          });
        if (meta.address?.trim()) {
          const { data: addresses } = await supabase
            .from("addresses")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);
          if (!addresses?.length)
            await supabase.from("addresses").insert({
              user_id: user.id,
              name: meta.full_name ?? "",
              phone: (meta.phone ?? user.phone ?? "").replace(/^\+88/, ""),
              address: meta.address.trim().slice(0, 500),
              label: "Home",
              area: "outside",
              is_default: true,
            });
        }
        localStorage.removeItem("ecory-pending-profile");
      });
  }, [user?.id]);
}
