import { EmptyShopping } from "@/components/EmptyShopping";
import { OrderItemRow } from "@/components/OrderItemRow";
import { OrderAction } from "@/components/OrderAction";
import { NumberText } from "@/components/NumberText";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { OrderBar } from "@/components/OrderBar";
import { Shell } from "@/components/Shell";
import { BDT, pick, productVariants, useProducts, useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "কার্ট ও চেকআউট — ইকোরি" },
      {
        name: "description",
        content: "ক্যাশ অন ডেলিভারি, বিকাশ, নগদ বা অনলাইনে পেমেন্ট করে অর্ডার করুন।",
      },
      { property: "og:title", content: "কার্ট ও চেকআউট — ইকোরি" },
      {
        property: "og:description",
        content: "ক্যাশ অন ডেলিভারি, বিকাশ, নগদ বা অনলাইনে পেমেন্ট করে অর্ডার করুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { t, lang, cart, setQty, setVariant, add, favourites, toggleFavourite } = useStore();
  const { data: products = [], isLoading } = useProducts();
  const nav = useNavigate();
  const lines = cart
    .map((c) => ({ ...c, p: products.find((p) => p.id === c.id) }))
    .filter((l) => l.p);
  return (
    <Shell
      title={t("cart")}
      bottomBar={
        lines.length ? (
          <OrderAction onClick={() => nav({ to: "/checkout", search: {} })} />
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="py-10 text-center">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</p>
      ) : !lines.length ? (
        <EmptyShopping />
      ) : (
        <div className="space-y-3">
          {lines.map((l) => (
            <OrderItemRow
              key={`${l.id}-${l.variantId ?? "base"}`}
              product={l.p!}
              variantId={l.variantId}
              qty={l.qty}
              onQty={(q) => setQty(l.id, q, l.variantId)}
              onVariant={(v) => setVariant(l.id, l.variantId, v)}
              onRemove={() => setQty(l.id, 0, l.variantId)}
            />
          ))}
        </div>
      )}
      {!isLoading && !lines.length && (
        <section className="mt-4">
          <div className="ecory-recommendation mb-5 rounded-2xl border p-4 text-center">
            <h2 className="text-lg font-semibold">
              {lang === "bn" ? "আপনার জন্য বাছাই করা" : "Just For You"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn"
                ? "প্রাকৃতিক যত্নে আপনার পছন্দের পণ্য"
                : "Discover your next natural favourite"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                lang={lang}
                favourite={favourites.includes(p.id)}
                onFavourite={() => toggleFavourite(p.id)}
                onAdd={() => add(p.id, 1)}
              />
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
