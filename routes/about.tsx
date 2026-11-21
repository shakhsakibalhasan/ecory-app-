import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { AboutEcory } from "@/components/AboutEcory";
import { useStore } from "@/lib/store";
export const Route=createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "আমাদের সম্পর্কে — ইকোরি" }, { name: "description", content: "ইকোরি ও আমাদের প্রাকৃতিক সাপ্লিমেন্ট ও হারবাল পণ্য সম্পর্কে জানুন।" }, { property: "og:title", content: "আমাদের সম্পর্কে — ইকোরি" }, { property: "og:description", content: "ইকোরি ও আমাদের প্রাকৃতিক সাপ্লিমেন্ট ও হারবাল পণ্য সম্পর্কে জানুন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),component:About});
function About(){const {lang}=useStore();return <Shell title={lang==="bn"?"আমাদের সম্পর্কে":"About"}><AboutEcory bn={lang==="bn"}/></Shell>;}
