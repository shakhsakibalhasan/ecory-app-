import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { ReviewGallery } from "@/components/ReviewGallery";

export const Route = createFileRoute("/reviews")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "কাস্টমার রিভিউ — ইকোরি" },
      { name: "description", content: "ইকোরির গ্রাহকদের আসল ছবি ও ভিডিও রিভিউ।" },
      { property: "og:title", content: "কাস্টমার রিভিউ — ইকোরি" },
      { property: "og:description", content: "ইকোরির গ্রাহকদের আসল ছবি ও ভিডিও রিভিউ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reviews,
});

function Reviews() {
  const { t, lang } = useStore();
  return (
    <Shell title={t("reviews")}>
      <h2 className="mb-3 text-lg font-extrabold">
        {lang === "bn" ? "গ্রাহকদের অভিজ্ঞতা" : "Customer experiences"}
      </h2>
      <ReviewGallery />
    </Shell>
  );
}
