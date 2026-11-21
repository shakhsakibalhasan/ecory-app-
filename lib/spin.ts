import { uiClient } from "./presentation";
export type SpinPrize = {
  id: string;
  name_bn: string;
  name_en: string;
  details_bn: string;
  details_en: string;
  image: string;
  link: string;
  kind: "offer" | "gift" | "fixed" | "percent" | "delivery";
  value: number;
  minimum: number;
  weight: number;
  eligible: boolean;
  coupon: string;
};
export type SpinConfig = {
  enabled: boolean;
  campaign: string;
  title_bn: string;
  title_en: string;
  subtitle_bn: string;
  subtitle_en: string;
  logo: string;
  prizes: SpinPrize[];
  version?: string;
};
export type SpinAward = {
  id: string;
  customer_name: string;
  phone: string;
  prize: SpinPrize;
  expires_at: string;
  order_code: string | null;
};
export const EMPTY_SPIN: SpinConfig = {
  enabled: false,
  campaign: "launch",
  title_bn: "স্পিন করুন, উপহার জিতুন",
  title_en: "Spin & Win",
  subtitle_bn: "আপনার জন্য ইকোরির বিশেষ আয়োজন",
  subtitle_en: "Something special from Ecory",
  logo: "",
  prizes: [],
};
export function spinTarget(value: string): string | null {
  try {
    const u = new URL(value, "https://ecory.app");
    if (
      u.protocol !== "https:" ||
      ![
        "ecory.app",
        "www.ecory.app",
        "https-ecory-app.lovable.app",
        "https-ecory-lovable-app.lovable.app",
      ].includes(u.hostname)
    )
      return null;
    if (!/^\/(products|offers|product\/[^/]+|checkout)\/?$/.test(u.pathname)) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}
export async function spinCampaign() {
  const r = await uiClient.rpc("get_spin_campaign");
  if (r.error) throw r.error;
  return { ...EMPTY_SPIN, ...r.data } as SpinConfig;
}

export type GuestClaim = {
  campaign: string;
  name: string;
  phone: string;
  token: string;
  award?: SpinAward;
};
export function readGuestClaim(): GuestClaim | null {
  try {
    return JSON.parse(localStorage.getItem("ecory-guest-spin-claim") || "null");
  } catch {
    return null;
  }
}
export function saveGuestClaim(c: GuestClaim) {
  try {
    localStorage.setItem("ecory-guest-spin-claim", JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}
export function eightSlots(
  rows: SpinPrize[],
  count = Math.max(3, Math.min(12, rows.length || 8)),
): SpinPrize[] {
  return Array.from({ length: count }, (_, i) => ({
    ...{
      id: crypto.randomUUID(),
      name_bn: "",
      name_en: "",
      details_bn: "",
      details_en: "",
      image: "",
      link: "/products",
      kind: "fixed" as const,
      value: 0,
      minimum: 0,
      weight: 1,
      eligible: false,
      coupon: "",
    },
    ...rows[i],
  }));
}
