import { ProductCustomerReviews } from "@/components/ProductCustomerReviews";
import { FileText, MessageSquare } from "lucide-react";
import { flyToCart } from "@/lib/cart-animation";
import { productPurpose } from "@/lib/product-purpose";
import { EditableIcon } from "@/lib/presentation";
import { NumberText } from "@/components/NumberText";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Heart, ShieldCheck, Sparkles, Star, Share2 } from "lucide-react";
import { ProductImageBox } from "@/components/ProductImageBox";
import { OrderBar } from "@/components/OrderBar";
import { Shell } from "@/components/Shell";
import { ReviewGallery, useReviews, useReviewRatings } from "@/components/ReviewGallery";
import { ProductCard } from "@/components/ProductCard";
import {
  BDT,
  pick,
  productVariants,
  productVariantImage,
  useProducts,
  useStore,
  type Product,
} from "@/lib/store";
import { offerPrice, reviewStats } from "@/lib/merchandising";
import { toast } from "sonner";
import { TrustRow } from "@/components/TrustRow";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "প্রোডাক্ট বিস্তারিত — ইকোরি" },
      {
        name: "description",
        content: "ইকোরি প্রোডাক্টের মূল্য, প্যাক, উপকারিতা ও ব্যবহারের তথ্য।",
      },
      { property: "og:title", content: "প্রোডাক্ট বিস্তারিত — ইকোরি" },
      {
        property: "og:description",
        content: "ইকোরি প্রোডাক্টের মূল্য, প্যাক, উপকারিতা ও ব্যবহারের তথ্য।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  return <ProductDetails id={id} />;
}
export function ProductDetails({
  id,
  productOverride,
  offerId,
  linkedProduct = true,
}: {
  id: string;
  productOverride?: Product;
  offerId?: string;
  linkedProduct?: boolean;
}) {
  const { t, lang, add, favourites, toggleFavourite } = useStore();
  const nav = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const p = productOverride ?? products.find((x) => x.id === id);
  const variants = p ? productVariants(p) : [];
  const { data: ratings } = useReviewRatings();
  const stats = ratings?.[id] || { rating: null, count: 0 };
  const [detailTab, setDetailTab] = useState<"description" | "reviews">("description");
  const [variantId, setVariantId] = useState<string | undefined>();
  const qty = 1;
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setVariantId(variants[0]?.id);
    setDetailTab("description");
  }, [id, variants.length]);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const { price, oldPrice, discount } = p
    ? offerPrice(p, variant ?? variants[0])
    : { price: 0, oldPrice: null, discount: 0 };
  const image = p ? productVariantImage(p, variant) : "";
  const imageReady = !!image;
  const related = p
    ? products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4)
    : [];
  const sections = p
    ? [
        { key: "benefits", title: t("benefits"), body: pick(p, "benefits", lang), icon: Sparkles },
        {
          key: "ingredients",
          title: lang === "bn" ? "উপাদান" : "Ingredients",
          body: pick(p, "ingredients", lang),
          icon: BadgeCheck,
        },
        { key: "usage", title: t("usage"), body: pick(p, "usage", lang), icon: BadgeCheck },
        { key: "caution", title: t("caution"), body: pick(p, "caution", lang), icon: ShieldCheck },
      ].filter((x) => x.body)
    : [];

  const order = () => {
    if (!p || !imageReady) return;
    nav({
      to: "/checkout",
      search: offerId ? { offer: offerId, qty } : { buy: p.id, variant: variant?.id, qty },
    });
  };

  const shareProduct = async () => {
    if (!p) return;
    const url = new URL(
      offerId
        ? `/offers?offer=${encodeURIComponent(offerId)}`
        : `/product/${encodeURIComponent(p.id)}`,
      "https://https-ecory-lovable-app.lovable.app",
    );
    if (!offerId) url.search = "";
    url.hash = "";
    const link = url.toString();
    if (navigator.share) {
      try {
        await navigator.share({ title: pick(p, "name", lang), url: link });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success(lang === "bn" ? "প্রোডাক্ট লিংক কপি হয়েছে" : "Product link copied");
    } catch {
      setShareUrl(link);
    }
  };

  return (
    <Shell
      title={p ? pick(p, "name", lang) : ""}
      headerAction={
        p ? (
          <button
            type="button"
            onClick={() => void shareProduct()}
            aria-label={lang === "bn" ? "প্রোডাক্ট শেয়ার করুন" : "Share product"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
          >
            <EditableIcon name="icon_share2">
              <Share2 size={20} />
            </EditableIcon>
          </button>
        ) : undefined
      }
      bottomBar={
        p ? (
          <OrderBar
            total={price * qty}
            onOrder={order}
            disabled={!p.in_stock || variant?.in_stock === false || !imageReady}
            onAdd={
              offerId
                ? undefined
                : () => {
                    add(p.id, 1, variant?.id);
                    flyToCart(
                      document.querySelector<HTMLImageElement>("[data-product-detail-image] img"),
                    );
                    toast.success(t("added"));
                  }
            }
          />
        ) : undefined
      }
    >
      {isLoading && !productOverride ? null : !p ? (
        <p className="py-10 text-center text-muted-foreground">—</p>
      ) : (
        <div className="pb-4">
          {shareUrl && (
            <div className="mb-3 rounded-lg border bg-white p-3">
              <label className="text-xs font-bold">
                {lang === "bn" ? "শেয়ার করতে লিংকটি কপি করুন" : "Copy this link to share"}
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-2 w-full rounded-md border p-2 text-xs"
                />
              </label>
              <button
                type="button"
                onClick={() => setShareUrl("")}
                className="mt-2 text-xs underline"
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          )}
          <div data-product-detail-image>
            <ProductImageBox src={image} alt={pick(p, "name", lang)}>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => toggleFavourite(p.id)}
                className="absolute right-3 top-3 bg-white shadow-none"
                style={{ borderRadius: "50%" }}
                aria-label={favourites.includes(p.id) ? "Remove favourite" : "Add favourite"}
              >
                <EditableIcon name="icon_heart">
                  <Heart
                    className={`h-5 w-5 ${favourites.includes(p.id) ? "fill-primary text-primary" : ""}`}
                  />
                </EditableIcon>
              </Button>
            </ProductImageBox>
          </div>
          <h2 className="ecory-product-detail-title mt-2 text-base font-extrabold leading-snug">
            {pick(p, "name", lang)}
            {productPurpose(p, lang) && (
              <span className="ecory-product-detail-purpose text-sm font-normal">
                ({productPurpose(p, lang)})
              </span>
            )}
          </h2>
          {variant && (
            <p className="ecory-number mt-1 text-[11px] font-semibold text-muted-foreground">
              <NumberText value={lang === "bn" ? variant.label_bn : variant.label_en} />
            </p>
          )}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <EditableIcon name="icon_star">
              <Star size={12} className="text-primary fill-primary" />
            </EditableIcon>
            {stats.rating?.toFixed(1) ?? "—"} · {stats.count} {t("reviews")}
          </div>
          <div
            className={`mt-2 grid items-center gap-2 py-2 ${oldPrice ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "grid-cols-1"}`}
          >
            <div className="min-w-0 text-left">
              <p className="text-[10px] text-muted-foreground">
                {lang === "bn"
                  ? oldPrice
                    ? "অফার মূল্য"
                    : "বর্তমান দাম"
                  : oldPrice
                    ? "Discounted price"
                    : "Price"}
              </p>
              <strong className="ecory-price ecory-detail-price text-xl font-bold">
                <NumberText value={BDT(price)} />
              </strong>
            </div>
            {oldPrice && (
              <>
                <span
                  className="ecory-discount-pill ecory-number rounded-full border px-3 py-1.5 text-center text-[12px] font-semibold"
                  style={{ borderRadius: 9999 }}
                >
                  <NumberText value={lang === "bn" ? `${discount}% সাশ্রয়` : `Save ${discount}%`} />
                </span>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] text-muted-foreground">
                    {lang === "bn" ? "আগের দাম" : "Original price"}
                  </p>
                  <del className="ecory-number text-sm text-muted-foreground">
                    <NumberText value={BDT(oldPrice)} />
                  </del>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {variants.length > 0 ? (
              <h3 className="text-sm font-bold">{t("selectPack")}</h3>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                setDetailTab("reviews");
                document
                  .getElementById("product-detail-tabs")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="ecory-review-button min-h-10 min-w-[130px] shrink-0 rounded-lg border border-primary px-4 py-2 text-[13px] font-bold text-accent-foreground"
            >
              {lang === "bn" ? "কাস্টমার রিভিউ" : "Customer Review"}
            </button>
          </div>

          {variants.length > 0 && (
            <section>
              <div className="ecory-variant-grid mt-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    type="button"
                    aria-pressed={variant?.id === v.id}
                    className="ecory-variant-option"
                  >
                    <span className="ecory-number block">
                      <NumberText value={lang === "bn" ? v.label_bn : v.label_en} />
                    </span>
                    <span className="ecory-number mt-0.5 block">
                      <NumberText value={BDT(v.price)} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {pick(p, "offer_text", lang) && (
            <p className="mt-3 text-xs font-bold text-accent-foreground">
              {pick(p, "offer_text", lang)}
            </p>
          )}
          <div
            id="product-detail-tabs"
            className="ecory-product-tabs"
            role="tablist"
            aria-label={lang === "bn" ? "পণ্যের তথ্য" : "Product information"}
          >
            {(
              [
                ["description", lang === "bn" ? "বিবরণ" : "Description", FileText],
                ["reviews", lang === "bn" ? "রিভিউ" : "Reviews", MessageSquare],
              ] as const
            ).map(([tab, label, Icon]) => (
              <button
                type="button"
                key={tab}
                role="tab"
                id={`product-tab-${tab}`}
                aria-selected={detailTab === tab}
                aria-controls={`product-panel-${tab}`}
                tabIndex={detailTab === tab ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = tab === "description" ? "reviews" : "description";
                    setDetailTab(next);
                    document.getElementById(`product-tab-${next}`)?.focus();
                  }
                }}
                onClick={() => setDetailTab(tab)}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="product-panel-description"
            aria-labelledby="product-tab-description"
            hidden={detailTab !== "description"}
          >
            <section className="mt-4 border-b pb-4">
              <h3 className="ecory-detail-heading font-semibold">
                {lang === "bn" ? "প্রোডাক্ট পরিচিতি" : "Product description"}
              </h3>
              <p className="ecory-detail-text mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                <NumberText value={pick(p, "desc", lang)} />
              </p>
            </section>
            {sections.map((s) => (
              <section key={s.title} className="mt-4 border-b pb-4">
                <h3 className="flex items-center gap-2 font-extrabold">
                  <EditableIcon name={`detail_${s.key}`}>
                    <s.icon className="h-5 w-5 text-primary" />
                  </EditableIcon>
                  {s.title}
                </h3>
                <p className="ecory-detail-text mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  <NumberText value={s.body} />
                </p>
              </section>
            ))}
            {p.source_url && (
              <a
                href={p.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs font-semibold text-primary"
              >
                {t("verifiedSource")}
              </a>
            )}
          </div>
          <div
            role="tabpanel"
            id="product-panel-reviews"
            aria-labelledby="product-tab-reviews"
            hidden={detailTab !== "reviews"}
          >
            {detailTab === "reviews" && linkedProduct && (
              <ProductCustomerReviews key={p.id} productId={p.id} />
            )}
            {detailTab === "reviews" && <ProductReviews id={p.id} />}
          </div>
          {linkedProduct && <TrustRow productId={p.id} bn={lang === "bn"} />}

          {!offerId && related.length > 0 && (
            <>
              <h3 className="mt-7 font-extrabold">{t("related")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {related.map((x) => (
                  <ProductCard
                    key={x.id}
                    product={x}
                    lang={lang}
                    favourite={favourites.includes(x.id)}
                    onFavourite={() => toggleFavourite(x.id)}
                    onAdd={() => add(x.id, 1)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Shell>
  );
}
function ProductReviews({ id }: { id: string }) {
  const { data = [], isLoading, isError } = useReviews(id);
  const { lang } = useStore();
  return (
    <section id="product-reviews" className="mt-7 scroll-mt-3">
      <h3 className="mb-3 font-extrabold">
        {lang === "bn" ? "ছবি ও ভিডিও রিভিউ" : "Photo & video reviews"}
      </h3>
      {isLoading || isError || data.length > 0 ? (
        <ReviewGallery productId={id} />
      ) : (
        <p className="text-xs text-muted-foreground">
          {lang === "bn"
            ? "এই প্রোডাক্টের রিভিউ এখনো যোগ হয়নি।"
            : "No reviews for this product yet."}
        </p>
      )}
    </section>
  );
}
