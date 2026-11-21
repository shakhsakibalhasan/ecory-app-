import { notificationPath } from "@/lib/notification-links";
import { EntryOffer } from "@/components/EntryOffer";
import { UploadedIcon, EditableIcon, usePresentation } from "@/lib/presentation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Camera, Stethoscope, BadgeCheck, HeartPulse, Tags } from "lucide-react";
import { Shell } from "@/components/Shell";
import { OfferTicker } from "@/components/OfferTicker";
import { CategoryRail } from "@/components/CategoryRail";
import { ProductCard } from "@/components/ProductCard";
import { ReviewGallery } from "@/components/ReviewGallery";
import { useBanners, useProducts, useStore } from "@/lib/store";

type Slide = { kind: "image"; src: string; alt?: string; link?: string };

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ইকোরি — ন্যাচারাল সাপ্লিমেন্ট স্টোর" },
      { name: "description", content: "খাঁটি ও প্রাকৃতিক সাপ্লিমেন্ট, মধু ও হারবাল পণ্য।" },
      { property: "og:title", content: "ইকোরি — ন্যাচারাল সাপ্লিমেন্ট স্টোর" },
      { property: "og:description", content: "খাঁটি ও প্রাকৃতিক সাপ্লিমেন্ট, মধু ও হারবাল পণ্য।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, lang, add, favourites, toggleFavourite } = useStore();
  const { data: dbBanners = [] } = useBanners();
  const BANNERS: Slide[] = dbBanners.length
    ? dbBanners.map((b) => ({
        kind: "image" as const,
        src: lang === "en" ? b.image_en || b.image : b.image,
        alt: lang === "bn" ? b.alt_bn : b.alt_en,
        link: b.link,
      }))
    : [];
  const { data: products = [] } = useProducts();

  const [q, setQ] = useState("");
  const [slide, setSlide] = useState(0);
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{ startX: number; startY: number; active: boolean; moved: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
    moved: false,
  });

  const lastInteraction = useRef(0);
  useEffect(() => {
    setSlide((v) => Math.min(v, Math.max(0, BANNERS.length - 1)));
    if (BANNERS.length < 2) return;
    const reset = () => {
      lastInteraction.current = Date.now();
    };
    const timer = setInterval(() => {
      if (!document.hidden && !drag.current.active && Date.now() - lastInteraction.current >= 3000)
        setSlide((v) => (v + 1) % BANNERS.length);
    }, 3000);
    document.addEventListener("visibilitychange", reset);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [BANNERS.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    lastInteraction.current = Date.now();
    drag.current = { startX: e.clientX, startY: e.clientY, active: true, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.abs(dy) > Math.abs(dx)) {
      drag.current.active = false;
      setDragX(0);
      return;
    }
    if (Math.abs(dx) > 6) drag.current.moved = true;
    setDragX(dx);
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    lastInteraction.current = Date.now();
    if (dragX < -60) setSlide((v) => Math.min(v + 1, BANNERS.length - 1));
    else if (dragX > 60) setSlide((v) => Math.max(v - 1, 0));
    setDragX(0);
  };
  const list = products.filter(
    (p) => !q || `${p.name_bn} ${p.name_en}`.toLowerCase().includes(q.toLowerCase()),
  );
  const { data: ui } = usePresentation();
  const shortcuts = [
    { key: "offers", to: "/offers", icon: Tags, label: lang === "bn" ? "সব অফার" : "Offers" },
    { key: "reviews", to: "/reviews", icon: Camera, label: t("reviews") },
    { key: "certificates", to: "/certifications", icon: BadgeCheck, label: t("certs") },
    { key: "tips", to: "/tips", icon: HeartPulse, label: t("healthTips") },
  ] as const;

  return (
    <Shell commerceActions>
      <div className="ecory-home-search flex items-center gap-2 rounded-full bg-card py-3 pl-5 pr-3 shadow-pill">
        <EditableIcon name="icon_search">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        </EditableIcon>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {BANNERS.length > 0 && (
        <section className="relative mt-5 select-none">
          <div
            className="banner-mask relative aspect-[2.15/1] touch-pan-y overflow-hidden rounded-[1.75rem]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={(e) => {
              if (drag.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                drag.current.moved = false;
              }
            }}
          >
            <div
              className="flex h-full"
              style={{
                transform: `translateX(calc(${-slide * 100}% + ${dragX}px))`,
                transition: drag.current.active
                  ? "none"
                  : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {BANNERS.map((s, i) => (
                <div key={i} className="h-full w-full shrink-0">
                  <BannerSlide slide={s} index={i} current={slide} />
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  lastInteraction.current = Date.now();
                  setSlide(i);
                }}
                className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </section>
      )}
      <EntryOffer />
      <OfferTicker />

      <div className="mt-4 grid grid-cols-2 gap-2">
        {shortcuts.map((x) => (
          <Link
            key={x.to}
            to={x.to}
            className="ecory-home-shortcut flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-white px-1 py-3 text-center"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-accent-foreground">
              {ui?.shortcuts[x.key]?.image ? (
                <UploadedIcon src={ui.shortcuts[x.key]?.image} className="h-7 w-7">
                  <x.icon className="h-4.5 w-4.5" />
                </UploadedIcon>
              ) : (
                <EditableIcon name={`shortcut_${x.key}`}>
                  <x.icon className="h-4.5 w-4.5 text-accent-foreground" />
                </EditableIcon>
              )}
            </span>
            <span className="line-clamp-1 text-[11px] font-bold">
              {(lang === "bn" ? ui?.shortcuts[x.key]?.bn : ui?.shortcuts[x.key]?.en) || x.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-extrabold">{t("categories")}</h3>
        <Link
          to="/products"
          search={{ category: undefined }}
          className="text-xs font-bold text-primary"
        >
          {lang === "bn" ? "সব ক্যাটাগরি" : "All categories"}
        </Link>
      </div>
      <div className="mt-3">
        <CategoryRail lang={lang} excludeOffers />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-extrabold">{t("allProducts")}</h3>
        <Link
          to="/products"
          search={{ category: undefined }}
          className="text-xs font-bold text-primary"
        >
          {t("seeAll")}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3.5">
        {list.slice(0, 12).map((p) => (
          <ProductCard
            appearance="home"
            key={p.id}
            product={p}
            lang={lang}
            favourite={favourites.includes(p.id)}
            onFavourite={() => toggleFavourite(p.id)}
            onAdd={() => add(p.id, 1)}
          />
        ))}
      </div>
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-extrabold">
            {lang === "bn" ? "গ্রাহকদের অভিজ্ঞতা" : "Customer experiences"}
          </h3>
          <Link to="/reviews" className="text-xs font-bold text-primary">
            {t("seeAll")}
          </Link>
        </div>
        <ReviewGallery limit={4} />
      </section>
    </Shell>
  );
}

function BannerSlide({ slide, index, current }: { slide: Slide; index: number; current: number }) {
  const image = (
    <img
      src={Math.abs(index - current) <= 1 ? slide.src : undefined}
      alt={slide.alt || ""}
      draggable={false}
      decoding="async"
      loading={index === current ? "eager" : "lazy"}
      fetchPriority={index === current ? "high" : "low"}
      className="h-full w-full object-cover"
    />
  );
  const internal = notificationPath(slide.link);
  if (internal)
    return (
      <Link to={internal} className="block h-full w-full" draggable={false}>
        {image}
      </Link>
    );
  if (slide.link && /^https:\/\//i.test(slide.link))
    return (
      <a
        href={slide.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
        draggable={false}
      >
        {image}
      </a>
    );
  return image;
}
