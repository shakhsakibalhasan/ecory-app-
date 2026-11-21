import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type Lang = "bn" | "en";

const DICT = {
  home: ["হোম", "Home"],
  search: ["আপনি কী খুঁজছেন?", "What are you looking for?"],
  categories: ["ক্যাটাগরি", "Categories"],
  seeAll: ["সব দেখুন", "See all"],
  products: ["প্রোডাক্ট", "Products"],
  buy: ["কিনুন", "Shop now"],
  healthTips: ["হেলথ টিপস", "Health Tips"],
  healthTipsSub: ["প্রাকৃতিক স্বাস্থ্যকর অভ্যাস", "Natural healthy habits"],
  articles: ["আর্টিকেল", "Articles"],
  reviews: ["রিভিউ", "Reviews"],
  reviewsSub: ["গ্রাহকদের ছবি ও ভিডিও", "Customer photos & videos"],
  doctor: ["ডাক্তারের পরামর্শ", "Talk to Doctor"],
  doctorSub: ["সরাসরি কথা বলে সমাধান নিন", "Get direct consultation"],
  certs: ["সার্টিফিকেশন ও BSTI", "Certifications & BSTI"],
  certsSub: ["আমাদের মান ও অনুমোদন", "Our quality approvals"],
  track: ["অর্ডার ট্র্যাক", "Track Order"],
  cart: ["কার্ট", "Cart"],
  addToCart: ["কার্টে যোগ করুন", "Add to cart"],
  added: ["কার্টে যোগ হয়েছে", "Added to cart"],
  emptyCart: ["কার্ট খালি", "Your cart is empty"],
  checkout: ["অর্ডার করুন", "Place order"],
  name: ["আপনার নাম", "Your name"],
  phone: ["মোবাইল নম্বর", "Mobile number"],
  address: ["পূর্ণ ঠিকানা", "Full address"],
  note: ["নোট (ঐচ্ছিক)", "Note (optional)"],
  area: ["ডেলিভারি এলাকা", "Delivery area"],
  dhaka: ["ঢাকার ভিতরে (৳৮০)", "Inside Dhaka (৳80)"],
  outside: ["ঢাকার বাইরে (৳১২০)", "Outside Dhaka (৳120)"],
  payment: ["পেমেন্ট পদ্ধতি", "Payment method"],
  cod: ["ক্যাশ অন ডেলিভারি", "Cash on delivery"],
  bkash: ["বিকাশ", "bKash"],
  nagad: ["নগদ", "Nagad"],
  online: ["অনলাইন পেমেন্ট", "Online payment"],
  sendMoney: ["এই নম্বরে Send Money করে TrxID দিন:", "Send money to this number and enter TrxID:"],
  trx: ["ট্রানজেকশন আইডি (TrxID)", "Transaction ID (TrxID)"],
  subtotal: ["সাবটোটাল", "Subtotal"],
  delivery: ["ডেলিভারি চার্জ", "Delivery charge"],
  total: ["সর্বমোট", "Total"],
  orderDone: ["অর্ডার সফল হয়েছে!", "Order placed!"],
  orderCode: ["আপনার অর্ডার কোড", "Your order code"],
  orderCode2: ["অর্ডার কোড", "Order code"],
  trackBtn: ["ট্র্যাক করুন", "Track"],
  notFound: ["অর্ডার পাওয়া যায়নি", "Order not found"],
  call: ["কল করুন", "Call"],
  whatsapp: ["WhatsApp", "WhatsApp"],
  support: ["সাপোর্ট", "Support"],
  back: ["ফিরে যান", "Back"],
  experience: ["অভিজ্ঞতা", "Experience"],
  schedule: ["সময়", "Schedule"],
  certNo: ["নম্বর", "No."],
  disclaimer: [
    "* সাধারণ পরামর্শ — গুরুতর সমস্যায় ডাক্তারের পরামর্শ নিন।",
    "* General advice — consult a doctor for serious issues.",
  ],
  pending: ["অপেক্ষমাণ", "Pending"],
  confirmed: ["কনফার্মড", "Confirmed"],
  shipped: ["পাঠানো হয়েছে", "Shipped"],
  delivered: ["ডেলিভারি হয়েছে", "Delivered"],
  cancelled: ["বাতিল", "Cancelled"],
  required: ["সব তথ্য দিন", "Please fill all fields"],
  more: ["আরও", "More"],
  all: ["সব", "All"],
  allProducts: ["সব প্রোডাক্ট", "All Products"],
  profile: ["প্রোফাইল", "Profile"],
  favourites: ["পছন্দের প্রোডাক্ট", "Favourites"],
  saved: ["সেভ করা", "Saved"],
  menu: ["মেনু", "Menu"],
  outlets: ["আমাদের আউটলেট", "Our Outlet"],
  authenticity: ["বিশুদ্ধতা ও মান", "Authenticity & Quality"],
  benefits: ["উপকারিতা", "Benefits"],
  usage: ["খাওয়ার / ব্যবহারের নিয়ম", "How to use"],
  caution: ["সতর্কতা", "Caution"],
  related: ["আরও প্রোডাক্ট", "You may also like"],
  orderNow: ["এখনই অর্ডার করুন", "Order now"],
  selectPack: ["প্যাক নির্বাচন করুন", "Choose a pack"],
  verifiedSource: ["Ecory ওয়েবসাইটে প্রকাশিত তথ্য", "Information published on Ecory website"],
} as const;
export type DictKey = keyof typeof DICT;

export const CATEGORIES = [
  { key: "stomach", bn: "পেট ও হজম", en: "Digestion" },
  { key: "joint", bn: "ব্যথার যত্ন", en: "Pain Care" },
  { key: "heart", bn: "হার্ট ও সুগার", en: "Heart & Sugar" },
  { key: "lungs", bn: "শ্বাসযত্ন ও অ্যালার্জি", en: "Breathing & Allergy" },
  { key: "energy", bn: "শক্তি ও ওয়েলনেস", en: "Energy & Wellness" },
  { key: "nutrition", bn: "দৈনন্দিন পুষ্টি", en: "Daily Nutrition" },
] as const;

export type ProductVariant = {
  kind?: "pack" | "gram" | "ml" | "other" | "gram_pack" | "ml_pack";
  unit_size?: number;
  pack_count?: number;
  id: string;
  label_bn: string;
  label_en: string;
  price: number;
  old_price?: number | null;
  sku?: string;
  in_stock?: boolean;
  disabled?: boolean;
  image?: string;
};
type CartItem = { id: string; qty: number; variantId?: string };
type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  cart: CartItem[];
  add: (id: string, qty?: number, variantId?: string) => void;
  setQty: (id: string, qty: number, variantId?: string) => void;
  setVariant: (
    id: string,
    oldVariantId: string | undefined,
    newVariantId: string | undefined,
  ) => void;
  clear: () => void;
  favourites: string[];
  toggleFavourite: (id: string) => void;
};
// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __ecoryStoreCtx?: import("react").Context<Ctx | null> };
const StoreCtx = g.__ecoryStoreCtx ?? (g.__ecoryStoreCtx = createContext<Ctx | null>(null));

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [lang, setLangState] = useState<Lang>("bn");
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const favouritesRef = useRef<string[]>([]);
  const favouriteOwnerRef = useRef<string | null>(null);

  const setFavouriteState = (ids: string[]) => {
    const unique = [...new Set(ids)];
    favouritesRef.current = unique;
    setFavourites(unique);
  };

  useEffect(() => {
    const l = localStorage.getItem("ecory-lang");
    if (l === "en") setLangState("en");
    let guestFavourites: string[] = [];
    try {
      cartRef.current = JSON.parse(localStorage.getItem("ecory-cart") || "[]");
      setCart(cartRef.current);
      guestFavourites = JSON.parse(localStorage.getItem("ecory-favourites") || "[]");
      setFavouriteState(guestFavourites);
    } catch {}

    let active = true;
    const syncAccount = async (userId: string | null) => {
      favouriteOwnerRef.current = userId;
      if (!userId) {
        let guest: string[] = [];
        try {
          guest = JSON.parse(localStorage.getItem("ecory-favourites") || "[]");
        } catch {}
        setFavouriteState(guest);
        return;
      }
      const local = favouritesRef.current;
      const { data, error } = await supabase
        .from("favourites")
        .select("product_id")
        .eq("user_id", userId);
      if (!active || favouriteOwnerRef.current !== userId || error) return;
      const merged = [...new Set([...(data ?? []).map((row) => row.product_id), ...local])];
      if (local.length) {
        const { error: mergeError } = await supabase.from("favourites").upsert(
          local.map((productId) => ({ user_id: userId, product_id: productId })),
          { onConflict: "user_id,product_id", ignoreDuplicates: true },
        );
        if (!active || favouriteOwnerRef.current !== userId || mergeError) return;
      }
      localStorage.removeItem("ecory-favourites");
      setFavouriteState(merged);
    };
    void supabase.auth
      .getSession()
      .then(({ data }) => syncAccount(data.session?.user.id ?? null))
      .catch(() => {});
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setTimeout(() => {
        if (active) void syncAccount(session?.user.id ?? null).catch(() => {});
      }, 0);
    });
    return () => {
      active = false;
      auth.subscription.unsubscribe();
    };
  }, []);
  const save = (c: CartItem[]) => {
    cartRef.current = c;
    setCart(c);
    localStorage.setItem("ecory-cart", JSON.stringify(c));
  };
  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);
  const value: Ctx = {
    lang,
    setLang: (l) => {
      setLangState(l);
      localStorage.setItem("ecory-lang", l);
    },
    t: (k) => DICT[k][lang === "bn" ? 0 : 1],
    cart,
    add: (id, qty = 1, variantId) => {
      const cart = cartRef.current;
      const product = qc.getQueryData<Product[]>(["products"])?.find((p) => p.id === id);
      variantId = variantId ?? (product ? productVariants(product)[0]?.id : undefined);
      const ex = cart.find((c) => c.id === id && c.variantId === variantId);
      const item: CartItem = variantId ? { id, qty, variantId } : { id, qty };
      save(
        ex
          ? cart.map((c) =>
              c.id === id && c.variantId === variantId ? { ...c, qty: c.qty + qty } : c,
            )
          : [...cart, item],
      );
    },
    setQty: (id, qty, variantId) =>
      save(
        qty <= 0
          ? cart.filter((c) => !(c.id === id && c.variantId === variantId))
          : cart.map((c) => (c.id === id && c.variantId === variantId ? { ...c, qty } : c)),
      ),
    setVariant: (id, oldVariantId, newVariantId) => {
      const old = cart.find((c) => c.id === id && c.variantId === oldVariantId);
      if (!old) return;
      const target = cart.find((c) => c.id === id && c.variantId === newVariantId && c !== old);
      const rest = cart.filter((c) => c !== old && c !== target);
      save([
        ...rest,
        {
          id,
          qty: Math.min(99, old.qty + (target?.qty ?? 0)),
          ...(newVariantId ? { variantId: newVariantId } : {}),
        },
      ]);
    },
    clear: () => save([]),
    favourites,
    toggleFavourite: (id) => {
      const wasSaved = favouritesRef.current.includes(id);
      const next = wasSaved
        ? favouritesRef.current.filter((x) => x !== id)
        : [...favouritesRef.current, id];
      setFavouriteState(next);
      const owner = favouriteOwnerRef.current;
      if (!owner) {
        localStorage.setItem("ecory-favourites", JSON.stringify(next));
        return;
      }
      const request = wasSaved
        ? supabase.from("favourites").delete().eq("user_id", owner).eq("product_id", id)
        : supabase
            .from("favourites")
            .upsert({ user_id: owner, product_id: id }, { onConflict: "user_id,product_id" });
      void request.then(({ error }) => {
        if (error && favouriteOwnerRef.current === owner)
          setFavouriteState(
            wasSaved
              ? [...favouritesRef.current, id]
              : favouritesRef.current.filter((x) => x !== id),
          );
      });
    },
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function pick<T extends Record<string, unknown>>(row: T, field: string, lang: Lang): string {
  const v = row[`${field}_${lang}`] as string | undefined;
  return v || (lang === "bn" ? (row[field] as string) || "" : "");
}

export const BDT = (n: number) => `৳ ${n.toLocaleString("bn-BD")}`;

/** A size × count combination must use its own supplied packaging composition. */
export function productVariantImage(product: Product, variant?: ProductVariant): string {
  if (variant?.image) return variant.image;
  if (variant?.kind === "gram_pack" || variant?.kind === "ml_pack") return "";
  return product.image;
}

export function productVariants(product: Product): ProductVariant[] {
  if (!Array.isArray(product.variants)) return [];
  return product.variants
    .filter((v): v is ProductVariant => {
      if (!v || typeof v !== "object" || Array.isArray(v)) return false;
      const row = v as Record<string, unknown>;
      return (
        row["disabled"] !== true &&
        typeof row["id"] === "string" &&
        typeof row["label_bn"] === "string" &&
        typeof row["label_en"] === "string" &&
        typeof row["price"] === "number"
      );
    })
    .map((v) => ({
      ...v,
      label_en: v.label_en.replace(/\bjars?\b/gi, (m) =>
        m.toLowerCase() === "jars" ? "files" : "file",
      ),
    }));
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .eq("status", "published")
        .order("sort");
      if (error) throw error;
      return data;
    },
  });
}
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    refetchInterval: 300000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("visible", true)
        .order("sort");
      if (error) throw error;
      return data.map((c) => ({
        key: c.key,
        bn: c.name_bn,
        en: c.name_en || "Category",
        icon: c.icon,
      }));
    },
  });
}
export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("visible", true)
        .order("sort");
      if (error) throw error;
      return data;
    },
  });
}
export function deliveryFee(
  s:
    | { fee_dhaka?: number; fee_outside?: number; free_delivery_min?: number | null }
    | null
    | undefined,
  area: string,
  subtotal: number,
) {
  if (s?.free_delivery_min != null && subtotal >= s.free_delivery_min) return 0;
  return area === "dhaka" ? (s?.fee_dhaka ?? 80) : (s?.fee_outside ?? 120);
}
export function useTable<T extends "posts" | "reviews" | "doctors" | "certifications">(table: T) {
  return useQuery({
    queryKey: [table],
    refetchInterval: 300000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let request = supabase.from(table).select("*");
      if (table === "posts") request = (request as any).eq("status", "published");
      const { data, error } = await request.order("created_at", { ascending: false });
      if (error) throw error;
      return (
        table === "posts"
          ? (data as unknown as Tables<"posts">[]).filter((p) => p.status === "published")
          : data
      ) as Tables<T>[];
    },
  });
}

export function contentText(row: Record<string, unknown>, field: string, lang: Lang): string {
  return String((lang === "bn" ? row[field] : row[field + "_en"]) || "");
}
