import { whatsappNumber, whatsappLink } from "./whatsapp";
// Single source of truth for customer-facing contacts and social links.
export const SUPPORT = {
  callDisplay: "09613-825382",
  callHref: "tel:+8809613825382",
  whatsappDisplay: "+880 1901-468790",
  whatsappNumber: "8801901468790",
  whatsappHref: "https://wa.me/8801901468790",
};

export const OUTLET = {
  callDisplay: "+880 1805-009750",
  callHref: "tel:+8801805009750",
};

export const waLink = (message?: string) =>
  message ? `${SUPPORT.whatsappHref}?text=${encodeURIComponent(message)}` : SUPPORT.whatsappHref;

// Facebook intentionally omitted until a verified page URL is supplied.
export const SOCIALS = [
  { key: "instagram", name: "Instagram", href: "https://www.instagram.com/ecory_bd/" },
  { key: "tiktok", name: "TikTok", href: "https://www.tiktok.com/@ecory.com.bd" },
  { key: "youtube", name: "YouTube", href: "https://www.youtube.com/@ecorybd" },
] as const;

// Explicit product IDs eligible for the BSTI badge (per owner instruction).
export const BSTI_PRODUCT_IDS = new Set([
  "f33eca21-6626-4a0f-9379-5a94ceb6df49", // Methimix
  "7245d01a-a86b-4f0f-82b6-73a4bce2feb6", // Beetroot Powder
  "4158f24b-50e5-49b1-9220-7362e80f3568", // Chia Seed
  "0dcb9999-ee68-46e8-b5dc-074a2d38f4e9", // Honey
]);

// Live contacts from admin settings, falling back to the verified defaults above.
import { loginIdentity } from "@/lib/customer-identity";
import { useSettings } from "@/lib/store";
const digits = (s: string) => s.replace(/[^\d]/g, "");
export function useContacts() {
  const { data: s } = useSettings();
  const call = s?.support_phone || SUPPORT.callDisplay;
  const wa = whatsappNumber(s?.whatsapp || "") || SUPPORT.whatsappNumber;
  const callDigits = digits(call);
  const support = {
    callDisplay: call,
    callHref: `tel:${callDigits.startsWith("0") ? "+88" + callDigits : "+" + callDigits}`,
    whatsappDisplay: s?.whatsapp ? `+${wa}` : SUPPORT.whatsappDisplay,
    whatsappNumber: wa,
    whatsappHref: whatsappLink(wa),
  };
  const socials = s
    ? ([["facebook", "Facebook", s.facebook], ["instagram", "Instagram", s.instagram], ["tiktok", "TikTok", s.tiktok], ["youtube", "YouTube", s.youtube], ["imo", "imo", s.imo]] as const)
        .filter(([, , h]) => /^https?:\/\//.test(h || ""))
        .map(([key, name, href]) => ({ key, name, href: href as string }))
    : SOCIALS.map((x) => ({ ...x }));
  const imoIdentity = loginIdentity(s?.imo || "");
  const imoNumber = imoIdentity && "phone" in imoIdentity ? imoIdentity.phone : "";
  return { support, socials, imoNumber, email: s?.email || "" };
}
