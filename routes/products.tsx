import { EditableIcon } from "@/lib/presentation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { CategoryRail } from "@/components/CategoryRail";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, useStore } from "@/lib/store";

export const Route = createFileRoute("/products")({
  staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>) => ({ category: typeof s["category"] === "string" ? s["category"] : undefined }),
  head: () => ({ meta: [{ title: "সব প্রোডাক্ট — ইকোরি" }, { name: "description", content: "ইকোরির সব প্রাকৃতিক সাপ্লিমেন্ট ও হারবাল পণ্য দেখুন।" }, { property: "og:title", content: "সব প্রোডাক্ট — ইকোরি" }, { property: "og:description", content: "ইকোরির সব প্রাকৃতিক সাপ্লিমেন্ট ও হারবাল পণ্য দেখুন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Products,
});

function Products() {
  const { category } = Route.useSearch();
  const { t, lang, add, favourites, toggleFavourite } = useStore();
  const { data: products = [] } = useProducts();
  const [cat, setCat] = useState<string | null>(category ?? null);
  useEffect(() => setCat(category ?? null), [category]);
  const [q, setQ] = useState("");
  const list = products.filter((p) => (!cat || p.category === cat) && (!q || `${p.name_bn} ${p.name_en}`.toLowerCase().includes(q.toLowerCase())));
  return <Shell title={t("allProducts")} commerceActions>
    <div className="flex items-center gap-2 rounded-full bg-card px-4 py-3 shadow-pill"><EditableIcon name="icon_search"><Search className="h-4 w-4 text-muted-foreground" /></EditableIcon><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="w-full bg-transparent text-sm outline-none" /></div>
    <div className="mt-4"><CategoryRail excludeOffers lang={lang} active={cat} onSelect={(key) => setCat(cat === key ? null : key)} /></div>
    <p className="mt-4 text-xs font-semibold text-muted-foreground">{list.length} {t("products")}</p>
    <div className="mt-3 grid grid-cols-2 gap-3.5">{list.map((p) => <ProductCard key={p.id} product={p} lang={lang} favourite={favourites.includes(p.id)} onFavourite={() => toggleFavourite(p.id)} onAdd={() => add(p.id, 1)} />)}</div>
  </Shell>;
}