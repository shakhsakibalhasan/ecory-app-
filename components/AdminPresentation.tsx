import { useSettings } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/admin-upload";
import {
  DEFAULT_UI,
  FONT_CONTROLS,
  UI_ICON_KEYS,
  safeOfferLink,
  uiClient,
  usePresentation,
  type UIConfig,
} from "@/lib/presentation";
const labels: Record<string, string> = {
  nav_home: "Navigation — Home",
  nav_cart: "Navigation — Cart",
  nav_products: "Navigation — All Products",
  nav_doctor: "Navigation — Doctor",
  nav_profile: "Navigation — Profile",
  contact_call: "Home — Call",
  contact_whatsapp: "Home — WhatsApp",
  contact_imo: "Home — IMO",
  social_facebook: "Facebook Logo",
  social_instagram: "Instagram Logo",
  social_tiktok: "TikTok Logo",
  social_youtube: "YouTube Logo",
  social_website: "Website Logo",
  header_cart: "Header Cart",
  header_menu: "Menu",
  header_back: "Back",
  product_share: "Share",
  empty_cart: "Empty Cart ছবি",
  empty_wishlist: "Empty Wishlist ছবি",
  payment_cod: "Cash on Delivery",
  payment_bkash: "bKash",
  payment_online: "Online Payment",
};
const SHORTCUTS = [
  ["offers", "সব অফার", "Offers"],
  ["doctor", "Navigation — ডাক্তার", "Doctor"],
  ["reviews", "রিভিউ", "Reviews"],
  ["certificates", "সার্টিফিকেশন", "Certificates"],
  ["tips", "হেলথ টিপস", "Health Tips"],
] as const;
export function AdminPresentation() {
  const q = usePresentation();
  const qc = useQueryClient();
  const [v, setV] = useState<UIConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    if (q.data && !dirty) setV(q.data);
  }, [q.data, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const set = (next: UIConfig) => {
    setV(next);
    setDirty(true);
  };
  const upload = async (key: string, file: File | undefined, shortcut = false) => {
    if (!file || !v) return;
    setBusy(key);
    try {
      if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("PNG বা JPG দিন");
      const { url } = await uploadMedia(file, "ui/" + key);
      if (shortcut)
        set({
          ...v,
          shortcuts: {
            ...v.shortcuts,
            [key]: { bn: v.shortcuts[key]?.bn || "", en: v.shortcuts[key]?.en || "", image: url },
          },
        });
      else set({ ...v, icons: { ...v.icons, [key]: url } });
      toast.success("আপলোড হয়েছে। পরিবর্তন সেভ করুন।");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const save = async () => {
    if (!v) return;
    const imoLink = v.shortcuts["imo_link"]?.en;
    if (imoLink) {
      try {
        const u = new URL(imoLink);
        if (u.protocol !== "https:" || !(u.hostname === "imo.im" || u.hostname.endsWith(".imo.im")))
          throw new Error();
      } catch {
        return void toast.error("IMO-এর আসল https://...imo.im link দিন");
      }
    }
    setBusy("save");
    const {
      ticker_link: _ticker,
      nav_items: _navItems,
      profile_items: _profileItems,
      ...branding
    } = v;
    const { error } = await uiClient.from("app_ui_settings").upsert({ ...branding, id: 1 });
    setBusy("");
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["presentation"] });
    setDirty(false);
    toast.success("UI সেটিংস সেভ হয়েছে");
  };
  if (q.isError)
    return (
      <p role="alert" className="rounded-xl border p-4">
        UI Settings.sql এখনও চালানো হয়নি বা সেটিংস লোড হয়নি।{" "}
        <button className="underline" onClick={() => void q.refetch()}>
          আবার দেখুন
        </button>
      </p>
    );
  if (!v) return <p>লোড হচ্ছে…</p>;
  const control = "mt-1 w-full rounded-lg border bg-white p-2 text-sm";
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold">অ্যাপের Button, Icon, Logo ও Font</h2>
      <p className="text-xs text-muted-foreground">
        Product, Banner, Category, Review, Certificate, Doctor ও Outlet-এর আসল ছবিগুলো তাদের নিজস্ব
        Admin section থেকেই বদলাবেন। এখানে interface-এর icon ও logo বদলাবেন। Icon-এর জন্য
        transparent PNG/SVG (1:1, 512×512px) দিন। একই icon সাধারণ অবস্থায় কালো, active/selected ও
        চাপ দেওয়ার সময় সাদা হবে; আলাদা দুই রঙের file লাগবে না। Background-সহ JPG বা পূর্ণ রঙিন
        circle নয়—শুধু icon shape দিন।
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SHORTCUTS.map(([key, bn, en]) => (
          <section key={key} className="rounded-xl border bg-white p-4">
            <h3 className="font-semibold">{bn}</h3>
            <label className="mt-2 block text-xs">
              বাংলা Text
              <input
                data-admin-translation-field={"bn"}
                className={control}
                value={v.shortcuts[key]?.bn || ""}
                placeholder={bn}
                onChange={(e) =>
                  set({
                    ...v,
                    shortcuts: {
                      ...v.shortcuts,
                      [key]: {
                        bn: e.target.value,
                        en: v.shortcuts[key]?.en || "",
                        image: v.shortcuts[key]?.image || "",
                      },
                    },
                  })
                }
              />
            </label>
            <label className="mt-2 block text-xs">
              English Text
              <input
                data-admin-translation-field={"en"}
                className={control}
                value={v.shortcuts[key]?.en || ""}
                placeholder={en}
                onChange={(e) =>
                  set({
                    ...v,
                    shortcuts: {
                      ...v.shortcuts,
                      [key]: {
                        en: e.target.value,
                        bn: v.shortcuts[key]?.bn || "",
                        image: v.shortcuts[key]?.image || "",
                      },
                    },
                  })
                }
              />
            </label>
            {v.shortcuts[key]?.image && (
              <img src={v.shortcuts[key]?.image} alt="" className="my-3 h-16 w-16 object-contain" />
            )}
            <label className="mt-3 block text-xs">
              Button-এর ছবি (ঐচ্ছিক) — ১:১, ৫১২×৫১২px PNG
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={!!busy}
                className={control}
                onChange={(e) => {
                  void upload(key, e.target.files?.[0], true);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              className="mt-2 text-xs underline"
              onClick={() =>
                set({
                  ...v,
                  shortcuts: {
                    ...v.shortcuts,
                    [key]: {
                      bn: v.shortcuts[key]?.bn || "",
                      en: v.shortcuts[key]?.en || "",
                      image: "",
                    },
                  },
                })
              }
            >
              ছবি সরিয়ে Icon দেখান
            </button>
          </section>
        ))}
      </div>
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="font-semibold">Profile / About — প্রতিষ্ঠানের তথ্য</h3>
        {(["bn", "en"] as const).map((language) => (
          <label key={language} className="block text-sm">
            {language === "bn" ? "সম্পূর্ণ তথ্য (বাংলা)" : "Full company information (English)"}
            <textarea
              data-admin-translation-field={typeof language === "string" ? language : undefined}
              rows={7}
              className={control}
              value={v.shortcuts["about"]?.[language] || ""}
              placeholder="খালি রাখলে ecorybd.com-এর তথ্য দেখাবে"
              onChange={(e) =>
                set({
                  ...v,
                  shortcuts: {
                    ...v.shortcuts,
                    about: {
                      bn: v.shortcuts["about"]?.bn || "",
                      en: v.shortcuts["about"]?.en || "",
                      image: "",
                      [language]: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
        ))}
        <label className="block text-sm">
          IMO থেকে পাওয়া Contact / Global Call link
          <input
            data-admin-translation-field={"en"}
            className={control}
            value={v.shortcuts["imo_link"]?.en || ""}
            placeholder="https://...imo.im/..."
            onChange={(e) =>
              set({
                ...v,
                shortcuts: { ...v.shortcuts, imo_link: { bn: "", en: e.target.value, image: "" } },
              })
            }
          />
        </label>
        <p className="text-xs">
          শুধু নম্বর থেকে direct chat link বানানো হবে না। IMO-তে তৈরি আসল link দিলে Contact button
          সেটি খুলবে।
        </p>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold">Font Size — সরাসরি Preview</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FONT_CONTROLS.map((f) => (
            <label key={f.key} className="text-sm">
              {f.label}: {v.fonts[f.key] || f.value}px
              <input
                data-admin-translation-field={typeof f.key === "string" ? f.key : undefined}
                type="range"
                className="mt-2 w-full"
                min={f.min}
                max={f.max}
                value={v.fonts[f.key] || f.value}
                onChange={(e) =>
                  set({ ...v, fonts: { ...v.fonts, [f.key]: Number(e.target.value) } })
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-5 space-y-3 rounded-xl border bg-[#F6F7F2] p-4 font-['Hind_Siliguri']">
          <h4 style={{ fontSize: v.fonts["title"] || 18 }}>ইকোরি • Ecory</h4>
          <p style={{ fontSize: v.fonts["product"] || 15 }}>
            মেথিমিক্স প্রিমিয়াম • Methi Mix Premium
          </p>
          <p style={{ fontSize: v.fonts["price"] || 20 }} className="font-semibold text-[#86BF3C]">
            ৳৫৯০ • ৳590
          </p>
          <p style={{ fontSize: v.fonts["detail"] || 15 }}>প্রাকৃতিক যত্ন, প্রতিদিনের স্বস্তি।</p>
          <button
            style={{ fontSize: v.fonts["button"] || 13 }}
            className="rounded-lg bg-primary px-4 py-2"
          >
            অর্ডার করুন • Order Now
          </button>
        </div>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold">Icon / Social Logo Upload</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Home contact icon পুরো circle ভরবে। সাদা ফাঁকা অংশ ছাড়া square PNG/JPG দিলে ভালো দেখাবে।
          Navigation ও সাধারণ icon স্বাভাবিক অনুপাতে থাকবে।
        </p>
        <input
          className={control}
          placeholder="Icon খুঁজুন…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {UI_ICON_KEYS.filter((k) =>
            (labels[k] || k).toLowerCase().includes(filter.toLowerCase()),
          ).map((key) => (
            <div key={key} className="min-w-0 rounded-lg border p-3">
              <p className="break-words text-xs font-medium">
                {labels[key] || key.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-xs">
                ১:১ • ৫১২×৫১২px PNG; contact logo-তে বাইরের ফাঁকা margin রাখবেন না।
              </p>
              {v.icons[key] && (
                <img src={v.icons[key]} alt="" className="my-2 h-12 w-12 object-contain" />
              )}
              <input
                aria-label={`${key} upload`}
                type="file"
                accept="image/png,image/jpeg"
                disabled={!!busy}
                className="mt-2 w-full text-[10px]"
                onChange={(e) => {
                  void upload(key, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                className="mt-2 text-xs underline"
                onClick={() => set({ ...v, icons: { ...v.icons, [key]: "" } })}
              >
                Default Icon
              </button>
            </div>
          ))}
        </div>
      </section>
      <button
        className="rounded-xl bg-primary px-5 py-3 font-semibold disabled:opacity-50"
        disabled={!dirty || !!busy}
        onClick={() => void save()}
      >
        {busy === "save" ? "সেভ হচ্ছে…" : "UI পরিবর্তন সেভ করুন"}
      </button>
    </section>
  );
}

export function OfferLinkEditor() {
  const q = usePresentation();
  const settings = useSettings();
  const qc = useQueryClient();
  const offers = useQuery({
    queryKey: ["admin-ticker-offers"],
    queryFn: async () => {
      const r = await supabase.from("offers").select("id,title_bn,visible").order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const [v, setV] = useState({ bn: "", en: "", enabled: false, offer: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data && settings.data && !dirty) {
      let id = "";
      try {
        id = new URL(q.data.ticker_link || "", "https://ecory.app").searchParams.get("offer") || "";
      } catch {}
      setV({
        bn: settings.data.ticker_bn || "",
        en: settings.data.ticker_en || "",
        enabled: !!settings.data.ticker_enabled,
        offer: id,
      });
    }
  }, [q.data, settings.data, dirty]);
  const set = (next: typeof v) => {
    setV(next);
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const a = await supabase
        .from("site_settings")
        .update({ ticker_bn: v.bn, ticker_en: v.en, ticker_enabled: v.enabled })
        .eq("id", 1);
      if (a.error) throw a.error;
      const b = await uiClient
        .from("app_ui_settings")
        .upsert({ id: 1, ticker_link: v.offer ? `/checkout?offer=${v.offer}` : "" });
      if (b.error) throw b.error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["settings"] }),
        qc.invalidateQueries({ queryKey: ["presentation"] }),
      ]);
      setDirty(false);
      toast.success("চলমান অফার বার সেভ হয়েছে");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (q.isError || settings.isError || offers.isError)
    return (
      <p className="mb-4 rounded-xl border p-3">অফার বারের সেটিংস লোড হয়নি। আবার এই বিভাগ খুলুন।</p>
    );
  if (q.isLoading || settings.isLoading || offers.isLoading) return <p>লোড হচ্ছে…</p>;
  if (!q.data || !settings.data)
    return <p role="alert">সেটিংস পাওয়া যায়নি। প্রাথমিক settings SQL চালিয়ে আবার চেষ্টা করুন।</p>;
  return (
    <section className="mb-6 space-y-3 rounded-xl border bg-white p-4">
      <h2 className="text-base font-semibold">হোমের চলমান অফার বার</h2>
      <label className="block text-sm">
        অফারের লেখা (বাংলা)
        <textarea
          data-admin-translation-field={"bn"}
          className="mt-1 w-full rounded-lg border p-2"
          value={v.bn}
          onChange={(e) => set({ ...v, bn: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        Offer message (English)
        <textarea
          data-admin-translation-field={"en"}
          className="mt-1 w-full rounded-lg border p-2"
          value={v.en}
          onChange={(e) => set({ ...v, en: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        বারে চাপলে যে অফারের Checkout খুলবে
        <select
          className="mt-1 w-full rounded-lg border p-2"
          value={v.offer}
          onChange={(e) => set({ ...v, offer: e.target.value })}
        >
          <option value="">সব অফারের পেজ</option>
          {offers.data?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title_bn}
              {!o.visible ? " (লুকানো)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.enabled}
          onChange={(e) => set({ ...v, enabled: e.target.checked })}
        />
        হোমে অফার বার দেখাবে
      </label>
      <button
        type="button"
        disabled={busy || !dirty}
        onClick={() => void save()}
        className="rounded-lg bg-primary px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "সেভ হচ্ছে…" : "অফার বার সেভ করুন"}
      </button>
    </section>
  );
}
