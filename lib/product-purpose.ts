import defaults from "./product-purposes.json";
import type { Product, Lang } from "./store";

// Admin content takes precedence; verified catalogue defaults cover existing rows.
export function productPurpose(product: Product, lang: Lang): string {
  const configured = lang === "bn" ? product.purpose_bn : product.purpose_en;
  if (configured?.trim()) return configured.trim();
  const entry = (defaults as Record<string, { bn: string; en: string }>)[product.id];
  return entry?.[lang] ?? "";
}
