import { NumberText } from "@/components/NumberText";
import { EditableIcon } from "@/lib/presentation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Clock, ExternalLink } from "lucide-react";
import { Shell } from "@/components/Shell";
import { pick, useStore, useTable } from "@/lib/store";
import { readMinutes, useBookmarks } from "@/lib/bookmarks";
import { ArticleCard } from "./tips";

export const Route = createFileRoute("/article/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "স্বাস্থ্য আর্টিকেল — ইকোরি" },
      {
        name: "description",
        content: "তথ্যসূত্র ও রিভিউর তারিখসহ ইকোরির বাংলা স্বাস্থ্য আর্টিকেল।",
      },
      { property: "og:title", content: "স্বাস্থ্য আর্টিকেল — ইকোরি" },
      { property: "og:description", content: "তথ্যসূত্রসহ বাংলা স্বাস্থ্য আর্টিকেল।" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const { lang, t } = useStore();
  const bn = lang === "bn";
  const { data = [], isLoading } = useTable("posts");
  const { has, toggle } = useBookmarks();
  const p = data.find((x) => x.id === id);
  if (!p)
    return (
      <Shell title={t("articles")}>
        <p className="p-6 text-center text-sm text-muted-foreground">
          {isLoading ? "…" : bn ? "আর্টিকেলটি পাওয়া যায়নি।" : "Article not found."}
        </p>
      </Shell>
    );
  const blocks = pick(p, "body", lang)
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const sources = p.sources.split(/\s+/).filter((s) => /^https?:\/\//.test(s));
  const related = data.filter((x) => x.kind === "article" && x.id !== p.id).slice(0, 3);
  return (
    <Shell title={t("articles")}>
      <article className="mx-auto max-w-prose">
        {p.image && (
          <img src={p.image} alt="" className="aspect-[16/9] w-full rounded-3xl object-cover" />
        )}
        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-muted-foreground">
            <EditableIcon name="icon_clock">
              <Clock className="h-3 w-3" />
            </EditableIcon>
            {readMinutes(pick(p, "body", lang))} {bn ? "মিনিট পড়া" : "min read"}
          </span>
          <button
            onClick={() => toggle(p.id)}
            aria-pressed={has(p.id)}
            className="ml-auto flex items-center gap-1 rounded-full bg-card px-3 py-1.5 shadow-pill"
          >
            {has(p.id) ? (
              <EditableIcon name="icon_bookmark_check">
                <BookmarkCheck className="h-4 w-4 text-primary" />
              </EditableIcon>
            ) : (
              <EditableIcon name="icon_bookmark">
                <Bookmark className="h-4 w-4" />
              </EditableIcon>
            )}
            {has(p.id) ? (bn ? "সংরক্ষিত" : "Saved") : bn ? "সংরক্ষণ" : "Save"}
          </button>
        </div>
        <h1 className="mt-3 text-[22px] font-extrabold leading-snug">{pick(p, "title", lang)}</h1>
        {p.reviewed_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            {bn ? "তথ্য রিভিউ" : "Reviewed"}:{" "}
            {new Date(p.reviewed_at).toLocaleDateString(bn ? "bn-BD" : "en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
        <div className="mt-4 space-y-4 text-[15px] leading-8">
          {blocks.map((b, i) =>
            b.startsWith("## ") ? (
              <h2 key={i} className="pt-2 text-lg font-extrabold leading-snug">
                {b.slice(3)}
              </h2>
            ) : (
              <p key={i} className="whitespace-pre-line">
                <NumberText value={b} />
              </p>
            ),
          )}
        </div>
        {!!sources.length && (
          <section className="mt-6 rounded-3xl bg-card p-4 shadow-pill">
            <h2 className="text-sm font-extrabold">{bn ? "তথ্যসূত্র" : "Sources"}</h2>
            <ul className="mt-2 space-y-1.5">
              {sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 break-all text-xs text-primary underline"
                  >
                    <EditableIcon name="icon_external_link">
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </EditableIcon>
                    {s.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-xs leading-6 text-muted-foreground">
          {t("disclaimer")}
        </p>
        {!!related.length && (
          <section className="mt-6">
            <h2 className="mb-3 text-base font-extrabold">
              {bn ? "আরও পড়ুন" : "Related articles"}
            </h2>
            <div className="space-y-3">
              {related.map((r) => (
                <ArticleCard
                  key={r.id}
                  p={r}
                  saved={has(r.id)}
                  onToggle={() => toggle(r.id)}
                  bn={bn}
                />
              ))}
            </div>
          </section>
        )}
        <Link
          to="/tips"
          search={{ kind: "article" }}
          className="mt-6 block text-center text-sm font-semibold underline"
        >
          {bn ? "সব আর্টিকেল" : "All articles"}
        </Link>
      </article>
    </Shell>
  );
}
