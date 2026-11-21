import { createContext, useContext, useMemo, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@/lib/query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export const uiClient = supabase as SupabaseClient;
export const UI_ICON_KEYS = [
  "icon_gift",
  "nav_home",
  "nav_cart",
  "nav_products",
  "nav_doctor",
  "nav_profile",
  "menu_reviews",
  "menu_track",
  "menu_certificates",
  "menu_outlets",
  "menu_doctor",
  "menu_articles",
  "menu_admin",
  "header_menu",
  "header_cart",
  "header_favourite",
  "header_notification",
  "header_back",
  "product_share",
  "product_favourite",
  "button_cart",
  "button_order",
  "empty_cart",
  "empty_wishlist",
  "contact_call",
  "contact_whatsapp",
  "contact_imo",
  "social_facebook",
  "social_instagram",
  "social_tiktok",
  "social_youtube",
  "social_website",
  "shortcut_doctor",
  "shortcut_offers",
  "menu_about",
  "menu_contact",
  "shortcut_reviews",
  "shortcut_certificates",
  "shortcut_tips",
  "payment_cod",
  "payment_bkash",
  "payment_online",
  "payment_nagad",
  "trust_iso",
  "trust_gmp",
  "trust_authentic",
  "trust_bsti",
  "detail_benefits",
  "detail_usage",
  "detail_caution",
  "icon_badge_check",
  "icon_bell",
  "icon_bookmark",
  "icon_bookmark_check",
  "icon_check",
  "icon_check_circle2",
  "icon_chevron_down",
  "icon_chevron_left",
  "icon_chevron_right",
  "icon_chevron_up",
  "icon_clock",
  "icon_copy",
  "icon_external_link",
  "icon_eye",
  "icon_eye_off",
  "icon_globe",
  "icon_headset",
  "icon_heart",
  "icon_leaf",
  "icon_loader2",
  "icon_lock_keyhole",
  "icon_log_out",
  "icon_mail",
  "icon_map_pin",
  "icon_megaphone",
  "icon_menu",
  "icon_message_circle",
  "icon_minus",
  "icon_navigation",
  "icon_package",
  "icon_package_search",
  "icon_pencil",
  "icon_phone",
  "icon_play",
  "icon_plus",
  "icon_search",
  "icon_share2",
  "icon_shield_check",
  "icon_shopping_bag",
  "icon_shopping_cart",
  "icon_star",
  "icon_stethoscope",
  "icon_trash2",
  "icon_user_round",
  "icon_x",
] as const;
export const FONT_CONTROLS = [
  { key: "body", label: "সাধারণ লেখা", value: 14, min: 12, max: 18 },
  { key: "title", label: "শিরোনাম", value: 18, min: 15, max: 24 },
  { key: "product", label: "প্রোডাক্টের নাম", value: 15, min: 13, max: 20 },
  { key: "price", label: "প্রোডাক্ট / Order-এর দাম", value: 20, min: 16, max: 26 },
  { key: "detail", label: "প্রোডাক্টের বিস্তারিত", value: 15, min: 13, max: 20 },
  { key: "button", label: "Button-এর লেখা", value: 13, min: 11, max: 17 },
  { key: "navigation", label: "Navigation-এর লেখা", value: 10, min: 9, max: 12 },
  { key: "offer", label: "চলমান অফার", value: 15, min: 13, max: 18 },
] as const;
export type UIConfig = {
  id: number;
  icons: Record<string, string>;
  fonts: Record<string, number>;
  shortcuts: Record<string, { bn: string; en: string; image: string }>;
  ticker_link: string;
  nav_items?: unknown;
  profile_items?: unknown;
};
export const DEFAULT_UI: UIConfig = { id: 1, icons: {}, fonts: {}, shortcuts: {}, ticker_link: "" };
function usePresentationQuery() {
  return useQuery({
    queryKey: ["presentation"],
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await uiClient
        .from("app_ui_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_UI, ...data } as UIConfig;
    },
    retry: 1,
  });
}
type PresentationState = Pick<
  ReturnType<typeof usePresentationQuery>,
  "data" | "error" | "isError" | "isLoading" | "refetch"
>;
const PresentationContext = createContext<PresentationState | null>(null);
export function PresentationProvider({ children }: { children: ReactNode }) {
  const q = usePresentationQuery();
  const value = useMemo(
    () => ({
      data: q.data,
      error: q.error,
      isError: q.isError,
      isLoading: q.isLoading,
      refetch: q.refetch,
    }),
    [q.data, q.error, q.isError, q.isLoading, q.refetch],
  );
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}
export function usePresentation() {
  const value = useContext(PresentationContext);
  if (!value) throw new Error("PresentationProvider missing");
  return value;
}
/** One transparent icon asset, recoloured by the control state. */
export function UploadedIcon({
  src,
  children,
  className = "h-5 w-5",
  monochrome = false,
}: {
  src?: string | undefined;
  children: ReactNode;
  className?: string;
  monochrome?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken)
    return (
      <span
        aria-hidden="true"
        className={`ecory-icon-fallback inline-flex shrink-0 items-center justify-center ${className}`}
      >
        {children}
      </span>
    );
  if (!monochrome)
    return (
      <img
        src={src}
        alt=""
        className={`ecory-original-icon shrink-0 object-contain ${className}`}
        onError={() => setBroken(true)}
      />
    );
  const mask = `url(${JSON.stringify(src)})`;
  return (
    <span
      aria-hidden="true"
      className={`ecory-uploaded-icon ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <img src={src} alt="" crossOrigin="anonymous" hidden onError={() => setBroken(true)} />
    </span>
  );
}
export function EditableIcon({
  name,
  children,
  className = "h-5 w-5",
  fill: _fill = false,
}: {
  name: string;
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  const { data } = usePresentation();
  return (
    <UploadedIcon
      src={data?.icons[name]}
      className={className}
      monochrome={name.startsWith("nav_")}
    >
      {children}
    </UploadedIcon>
  );
}
export function safeOfferLink(value: string) {
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
