export type AppMenuItem = {
  id: string;
  bn: string;
  en: string;
  target: string;
  icon: string;
  visible: boolean;
};
export const NAV_DEFAULTS: AppMenuItem[] = [
  { id: "home", bn: "হোম", en: "Home", target: "/", icon: "nav_home", visible: true },
  { id: "cart", bn: "কার্ট", en: "Cart", target: "/cart", icon: "nav_cart", visible: true },
  {
    id: "products",
    bn: "সব পণ্য",
    en: "Products",
    target: "/products",
    icon: "nav_products",
    visible: true,
  },
  {
    id: "doctor",
    bn: "ডাক্তার",
    en: "Doctor",
    target: "/doctor",
    icon: "nav_doctor",
    visible: true,
  },
  {
    id: "profile",
    bn: "প্রোফাইল",
    en: "Profile",
    target: "/profile",
    icon: "nav_profile",
    visible: true,
  },
];
export const PROFILE_DEFAULTS: AppMenuItem[] = [
  {
    id: "spin_win",
    bn: "স্পিন উইন",
    en: "Spin Win",
    target: "action:spin",
    icon: "icon_gift",
    visible: true,
  },
  {
    id: "orders",
    bn: "আমার অর্ডার",
    en: "My orders",
    target: "action:orders",
    icon: "icon_package",
    visible: true,
  },
  {
    id: "bookings",
    bn: "আমার বুকিং",
    en: "My bookings",
    target: "/doctor-bookings",
    icon: "nav_doctor",
    visible: true,
  },
  {
    id: "addresses",
    bn: "সংরক্ষিত ঠিকানা",
    en: "Saved addresses",
    target: "action:addresses",
    icon: "icon_map_pin",
    visible: true,
  },
  {
    id: "favourites",
    bn: "পছন্দের পণ্য",
    en: "Favourites",
    target: "/favourites",
    icon: "icon_heart",
    visible: true,
  },
  {
    id: "language",
    bn: "ভাষা",
    en: "Language",
    target: "action:language",
    icon: "icon_globe",
    visible: true,
  },
  {
    id: "support",
    bn: "সহায়তা",
    en: "Support",
    target: "action:support",
    icon: "icon_headset",
    visible: true,
  },
  {
    id: "outlets",
    bn: "আমাদের আউটলেট",
    en: "Our outlets",
    target: "/outlets",
    icon: "icon_map_pin",
    visible: true,
  },
  {
    id: "certificates",
    bn: "সার্টিফিকেট",
    en: "Certificates",
    target: "/certifications",
    icon: "icon_badge_check",
    visible: true,
  },
  {
    id: "about",
    bn: "আমাদের সম্পর্কে",
    en: "About us",
    target: "/about",
    icon: "menu_about",
    visible: true,
  },
  {
    id: "privacy",
    bn: "গোপনীয়তা নীতি ও শর্তাবলি",
    en: "Privacy & terms",
    target: "/privacy",
    icon: "icon_shield_check",
    visible: true,
  },
  {
    id: "rate",
    bn: "অ্যাপের রেটিং দিন",
    en: "Rate Us",
    target: "action:rate",
    icon: "icon_star",
    visible: true,
  },
  {
    id: "share",
    bn: "অ্যাপ শেয়ার করুন",
    en: "Share App",
    target: "action:share",
    icon: "icon_share2",
    visible: true,
  },
];
export const MENU_PAGES = [
  "/",
  "/profile",
  "/products",
  "/cart",
  "/doctor",
  "/doctor-bookings",
  "/favourites",
  "/track",
  "/reviews",
  "/certifications",
  "/outlets",
  "/about",
  "/contact",
  "/offers",
  "/tips",
  "/privacy",
];
export function validMenuTarget(target: string, profile = false) {
  if (
    profile &&
    [
      "action:spin",
      "action:orders",
      "action:addresses",
      "action:language",
      "action:support",
      "action:rate",
      "action:share",
    ].includes(target)
  )
    return true;
  if (target.startsWith("/") && !target.startsWith("//")) {
    return MENU_PAGES.includes(target.split(/[?#]/)[0]!);
  }
  try {
    return new URL(target).protocol === "https:";
  } catch {
    return false;
  }
}
export function configuredMenu(
  value: unknown,
  fallback: AppMenuItem[],
  profile = false,
): AppMenuItem[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter(
    (x): x is AppMenuItem =>
      !!x &&
      typeof x.id === "string" &&
      typeof x.bn === "string" &&
      typeof x.en === "string" &&
      typeof x.target === "string" &&
      typeof x.icon === "string" &&
      typeof x.visible === "boolean" &&
      validMenuTarget(x.target, profile),
  );
}
