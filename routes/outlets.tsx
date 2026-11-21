import { EditableIcon } from "@/lib/presentation";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Navigation } from "lucide-react";
import { Shell } from "@/components/Shell";
import { useQuery } from "@/lib/query";
import { supabase } from "@/integrations/supabase/client";
import { contentText, useStore } from "@/lib/store";
import photo from "@/assets/outlet-jashore.png.asset.json";

export const Route = createFileRoute("/outlets")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "আউটলেট — ইকোরি" },
      {
        name: "description",
        content: "ইকোরি ফুড এন্ড কনজিউমার প্রোডাক্টস আউটলেট, নিউ মার্কেট বাসস্ট্যান্ড, যশোর।",
      },
      { property: "og:title", content: "আউটলেট — ইকোরি" },
      { property: "og:description", content: "যশোরে ইকোরি আউটলেটের ঠিকানা ও দিকনির্দেশনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Outlets,
});

const ADDRESS = "10/A, Sector-7, Below Hotel Al-Safa, New Market Bus Stand, Jessore";

function Outlets() {
  const { lang } = useStore();
  const bn = lang === "bn";
  const { data: outlets = [] } = useQuery({
    queryKey: ["outlets"],
    queryFn: async () =>
      (await supabase.from("outlets").select("*").eq("visible", true).order("sort")).data ?? [],
  });
  return (
    <Shell title={bn ? "আমাদের আউটলেট" : "Our outlets"}>
      <div className="space-y-4">
        {outlets.map((o) => {
          const tel = o.phone.replace(/[^\d+]/g, "");
          const map =
            o.map_url ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Ecory " + (o.address || ADDRESS))}`;
          return (
            <article
              key={o.id}
              className="overflow-hidden rounded-[1.6rem] bg-card shadow-pill motion-card"
            >
              <img
                src={o.photo || photo.url}
                alt={contentText(o, "name", lang)}
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <h2 className="text-lg font-extrabold">{contentText(o, "name", lang)}</h2>
                {o.address && (
                  <p className="flex gap-2 text-sm text-muted-foreground">
                    <EditableIcon name="icon_map_pin"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /></EditableIcon>
                    {contentText(o, "address", lang)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      aria-label={o.phone}
                      className="flex items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-bold"
                    >
                      <EditableIcon name="icon_phone"><Phone className="h-4 w-4" /></EditableIcon>
                      {bn ? "আউটলেটে কল করুন" : "Call outlet"}
                    </a>
                  )}
                  <a
                    href={map}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
                  >
                    <EditableIcon name="icon_navigation"><Navigation className="h-4 w-4" /></EditableIcon>
                    {bn ? "ম্যাপে দেখুন" : "Directions"}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Shell>
  );
}

