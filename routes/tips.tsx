import { visiblePosts } from "@/lib/post-list";
import { NumberText } from "@/components/NumberText";
import { EditableIcon } from "@/lib/presentation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Clock, Search, HeartPulse, Sprout, Wheat, Utensils, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { pick, useStore, useTable } from "@/lib/store";
import { POST_CATEGORIES, catLabel, readMinutes, useBookmarks } from "@/lib/bookmarks";

import "./tips.css";

type Kind = "tip" | "article" | "saved";
export const Route = createFileRoute("/tips")({
  staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { kind?: Kind | undefined } => ({
    kind: s["kind"] === "article" || s["kind"] === "saved" ? (s["kind"] as Kind) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "হেলথ টিপস ও আর্টিকেল — ইকোরি" },
      {
        name: "description",
        content:
          "প্রাকৃতিক খাবার, ভেষজ ও দৈনন্দিন যত্ন নিয়ে তথ্যসূত্রসহ বাংলা আর্টিকেল ও সহজ হেলথ টিপস।",
      },
      { property: "og:title", content: "হেলথ টিপস ও আর্টিকেল — ইকোরি" },
      {
        property: "og:description",
        content: "তথ্যসূত্রসহ বাংলা স্বাস্থ্য আর্টিকেল ও সহজ দৈনন্দিন টিপস।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tips,
});

const shortCategory = (key: string | null, bn: boolean) => {
  const labels: Record<string, [string, string]> = {
    digestion: ["হজম", "Digestion"],
    herbs: ["ভেষজ", "Herbs"],
    seeds: ["পুষ্টি", "Nutrition"],
    foods: ["খাবার", "Food"],
    daily: ["যত্ন", "Care"],
  };
  return key && labels[key] ? labels[key][bn ? 0 : 1] : bn ? "সব" : "All";
};

function TipIcon({ category }: { category: string }) {
  const Icon = category === "digestion" ? HeartPulse
    : category === "herbs" ? Sprout
    : category === "seeds" ? Wheat
    : category === "foods" ? Utensils
    : ShieldCheck;
  return <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.6} />;
}

function Tips() {
  const { t, lang } = useStore();
  const bn = lang === "bn";
  const { kind } = Route.useSearch();
  const tab: Kind = kind ?? "tip";
  const { data = [] } = useTable("posts");
  const { ids, toggle } = useBookmarks();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const list = visiblePosts(data, tab, cat, q, ids);
  const tabCls = (on: boolean) =>
    `min-w-0 rounded-full px-1 py-2 text-center text-xs sm:text-sm font-semibold whitespace-normal break-words ${on ? "bg-primary text-primary-foreground" : ""}`;

  return (
    <Shell title={tab === "tip" ? t("healthTips") : t("articles")}>
      <div className="ecory-tips-tabs grid w-full min-w-0 grid-cols-3 gap-1 rounded-2xl bg-card p-1 shadow-pill">
        <Link to="/tips" search={{}} className={tabCls(tab === "tip")}>
          {t("healthTips")}
        </Link>
        <Link to="/tips" search={{ kind: "article" }} className={tabCls(tab === "article")}>
          {t("articles")}
        </Link>
        <Link to="/tips" search={{ kind: "saved" }} className={tabCls(tab === "saved")}>
          {bn ? "সংরক্ষিত" : "Saved"}
          {ids.length ? ` (${ids.length})` : ""}
        </Link>
      </div>

      <label className="ecory-tips-search mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-pill">
        <EditableIcon name="icon_search">
          <Search className="h-4 w-4 text-muted-foreground" />
        </EditableIcon>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={bn ? "খুঁজুন…" : "Search…"}
          className="min-w-0 w-full bg-transparent text-sm outline-none"
        />
      </label>
      {tab === "tip" && (
        <div
          className="ecory-tip-categories"
          aria-label={bn ? "হেলথ টিপসের ক্যাটাগরি" : "Health tip categories"}
        >
          {[{ key: null, bn: "সব", en: "All" }, ...POST_CATEGORIES].map((c) => (
            <button
              key={c.key ?? "all"}
              onClick={() => setCat(c.key)}
              aria-pressed={cat === c.key}
              title={bn ? c.bn : c.en}
              className={`ecory-tip-category ${cat === c.key ? "is-active" : ""}`}
            >
              {shortCategory(c.key, bn)}
            </button>
          ))}
        </div>
      )}

      <div className="ecory-tips-list mt-4 space-y-3">
        {!list.length && (
          <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-pill">
            {tab === "saved"
              ? bn
                ? "কোনো আর্টিকেল সংরক্ষণ করা হয়নি।"
                : "No saved articles yet."
              : bn
                ? "কিছু পাওয়া যায়নি।"
                : "Nothing found."}
          </p>
        )}
        {tab === "tip"
          ? list.map((p) => (
              <article key={p.id} className="ecory-health-tip">
                {p.image && (
                  <img
                    src={p.image}
                    alt={pick(p, "title", lang)}
                    loading="lazy"
                    decoding="async"
                    className="ecory-health-tip-image"
                  />
                )}
                <header className="ecory-health-tip-header">
                  <span className="ecory-health-tip-icon">
                    <TipIcon category={p.category} />
                  </span>
                  <div className="min-w-0">
                    <p className="ecory-health-tip-category">{catLabel(p.category, bn)}</p>
                    <h2 className="ecory-health-tip-title">{pick(p, "title", lang)}</h2>
                  </div>
                </header>
                <p className="ecory-health-tip-summary">
                  <NumberText value={pick(p, "excerpt", lang) || pick(p, "body", lang)} />
                </p>
              </article>
            ))
          : list.map((p) => (
              <ArticleCard
                key={p.id}
                p={p}
                saved={ids.includes(p.id)}
                onToggle={() => toggle(p.id)}
                bn={bn}
              />
            ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </Shell>
  );
}

export function ArticleCard({
  p,
  saved,
  onToggle,
  bn,
}: {
  p: {
    id: string;
    title_bn: string;
    title_en: string;
    excerpt_bn: string;
    excerpt_en: string;
    body_bn: string;
    body_en: string;
    image: string;
    category: string;
  };
  saved: boolean;
  onToggle: () => void;
  bn: boolean;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-card shadow-pill">
      <Link to="/article/$id" params={{ id: p.id }} className="block">
        {p.image ? (
          <img
            src={p.image}
            alt={bn ? p.title_bn : p.title_en}
            loading="lazy"
            decoding="async"
            className="aspect-[16/9] w-full object-cover"
          />
        ) : null}
        <div className="p-4">
          <div className="flex items-center gap-2 text-[10.5px] font-bold">
            <span className="flex items-center gap-1 text-muted-foreground">
              <EditableIcon name="icon_clock">
                <Clock className="h-3 w-3" />
              </EditableIcon>
              {readMinutes(bn ? p.body_bn : p.body_en)} {bn ? "মিনিট" : "min"}
            </span>
          </div>
          <h2 className="mt-2 pr-8 text-[15px] font-extrabold leading-snug">
            {bn ? p.title_bn : p.title_en}
          </h2>
          {(bn ? p.excerpt_bn : p.excerpt_en) && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
              <NumberText value={bn ? p.excerpt_bn : p.excerpt_en} />
            </p>
          )}
        </div>
      </Link>
      <button
        onClick={onToggle}
        aria-label={saved ? "সংরক্ষণ বাতিল" : "সংরক্ষণ করুন"}
        aria-pressed={saved}
        className={`absolute right-3 ${p.image ? "top-3 bg-card/90" : "top-3"} flex h-9 w-9 items-center justify-center rounded-full`}
      >
        {saved ? (
          <EditableIcon name="icon_bookmark_check">
            <BookmarkCheck className="h-5 w-5 text-primary" />
          </EditableIcon>
        ) : (
          <EditableIcon name="icon_bookmark">
            <Bookmark className="h-5 w-5" />
          </EditableIcon>
        )}
      </button>
    </article>
  );
}
