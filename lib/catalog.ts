import stomach from "@/assets/cat-stomach.png.asset.json";
import joint from "@/assets/cat-arthritis.png.asset.json";
import heart from "@/assets/cat-heart-problem.png.asset.json";
import lungs from "@/assets/cat-lungs.png.asset.json";
import energy from "@/assets/cat-bolt.png.asset.json";
import nutrition from "@/assets/cat-vegan.png.asset.json";

export const CATEGORY_ICONS: Record<string, string> = {
  stomach: stomach.url,
  joint: joint.url,
  heart: heart.url,
  lungs: lungs.url,
  energy: energy.url,
  nutrition: nutrition.url,
};

export const FALLBACK_BANNERS = [
  "https://ecorybd.com/wp-content/uploads/2026/01/Honey-web-7.jpg",
  "https://ecorybd.com/wp-content/uploads/2025/11/Flower-Tea-Combo-7-low.jpg",
  "https://ecorybd.com/wp-content/uploads/2025/12/Roselle-Tea-100gm-3.jpg",
];