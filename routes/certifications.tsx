import { EditableIcon } from "@/lib/presentation";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { contentText, useStore, useTable } from "@/lib/store";

export const Route = createFileRoute("/certifications")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "সার্টিফিকেশন ও BSTI — ইকোরি" },
      { name: "description", content: "ইকোরির প্রোডাক্টের BSTI অনুমোদন ও অন্যান্য সার্টিফিকেশন।" },
      { property: "og:title", content: "সার্টিফিকেশন ও BSTI — ইকোরি" },
      {
        property: "og:description",
        content: "ইকোরির প্রোডাক্টের BSTI অনুমোদন ও অন্যান্য সার্টিফিকেশন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Certs,
});

function Certs() {
  const { t, lang } = useStore();
  const { data = [] } = useTable("certifications");
  return (
    <Shell title={t("certs")}>
      <div className="grid grid-cols-2 gap-3">
        {data.map((c) => (
          <a key={c.id} href={c.doc_url || c.image || undefined} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-3xl bg-card shadow-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {c.image ? (
                <img
                  src={c.image}
                  alt={contentText(c, "title", lang)}
                  className="aspect-[3/4] w-full object-cover"
                />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-primary-soft">
                <EditableIcon name="icon_badge_check"><BadgeCheck className="h-14 w-14 text-accent-foreground" /></EditableIcon>
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-bold">{contentText(c, "title", lang)}</p>
              <p className="text-xs text-muted-foreground">
                {contentText(c, "issuer", lang)}
                {c.cert_no ? ` · ${t("certNo")} ${c.cert_no}` : ""}
              </p>
              {c.doc_url && <p className="mt-2 text-xs font-medium text-accent-foreground">{lang === "bn" ? "সম্পূর্ণ PDF দেখুন ↗" : "View full PDF ↗"}</p>}
            </div>
          </a>
        ))}
      </div>
    </Shell>
  );
}
