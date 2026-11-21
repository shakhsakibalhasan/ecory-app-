import { useState } from "react";
import { toast } from "sonner";
import { EmptyShopping } from "@/components/EmptyShopping";
import { OrderItemRow } from "@/components/OrderItemRow";
import { OrderAction } from "@/components/OrderAction";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { OrderBar } from "@/components/OrderBar";
import { Shell } from "@/components/Shell";
import { productVariants, useProducts, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favourites")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "পছন্দের পণ্য — ইকোরি" },
      { name: "description", content: "আপনার সেভ করা ইকোরি প্রোডাক্ট দেখুন এবং অর্ডার করুন।" },
      { property: "og:title", content: "পছন্দের পণ্য — ইকোরি" },
      {
        property: "og:description",
        content: "আপনার সেভ করা ইকোরি প্রোডাক্ট দেখুন এবং অর্ডার করুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavouritesPage,
});

function FavouritesPage() {
  const { lang, favourites, toggleFavourite, add } = useStore();
  const { data: products = [], isLoading } = useProducts();
  const [selections, setSelections] = useState<
    Record<string, { variantId?: string | undefined; qty: number }>
  >({});
  const saved = products.filter((p) => favourites.includes(p.id));
  const nav = useNavigate();
  return (
    <Shell
      title={lang === "bn" ? "পছন্দের পণ্য" : "Wishlist"}
      bottomBar={
        saved.length ? (
          <OrderAction
            onClick={() => {
              if (saved.some(p => !p.in_stock || productVariants(p).find(v => v.id === (selections[p.id]?.variantId ?? productVariants(p)[0]?.id))?.in_stock === false)) {
                toast.error(lang === "bn" ? "স্টক নেই এমন পণ্য সরিয়ে আবার চেষ্টা করুন" : "Remove out-of-stock items before ordering"); return;
              }
              saved.forEach((p) => {
                const choice = selections[p.id];
                add(p.id, choice?.qty ?? 1, choice?.variantId ?? productVariants(p)[0]?.id);
              });
              void nav({ to: "/cart" });
            }}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="py-10 text-center">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</p>
      ) : saved.length ? (
        <div className="space-y-3">
          {saved.map((p) => {
            const choice = selections[p.id] ?? { variantId: productVariants(p)[0]?.id, qty: 1 };
            return (
              <OrderItemRow
                key={p.id}
                product={p}
                variantId={choice.variantId}
                qty={choice.qty}
                onQty={(qty) => setSelections({ ...selections, [p.id]: { ...choice, qty } })}
                onVariant={(variantId) =>
                  setSelections({ ...selections, [p.id]: { ...choice, variantId } })
                }
                onRemove={() => toggleFavourite(p.id)}
                extra={
                  <button
                    type="button"
                    disabled={!p.in_stock || productVariants(p).find(v => v.id === choice.variantId)?.in_stock === false}
                    onClick={() => {
                      add(p.id, choice.qty, choice.variantId);
                      toast.success(lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
                    }}
                    className="rounded-lg bg-primary-soft px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    {lang === "bn" ? "কার্টে যোগ" : "Add to Cart"}
                  </button>
                }
              />
            );
          })}
        </div>
      ) : (
        <>
          <EmptyShopping wishlist />
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
        </>
      )}
    </Shell>
  );
}
