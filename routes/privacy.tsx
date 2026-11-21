import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { PRIVACY_CONTACT, PRIVACY_SECTIONS } from "@/lib/privacy-content";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:title", content: "Privacy Policy — Ecory" }, { property: "og:description", content: "Ecory privacy policy, information use and account deletion requests." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { title: "Privacy Policy — Ecory" },
      {
        name: "description",
        content: "Ecory privacy policy, information use and account deletion requests.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { lang } = useStore();
  const bn = lang === "bn";
  return (
    <Shell title={bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}>
      <article className="space-y-5 rounded-2xl bg-white p-4 text-black">
        <h1 className="text-xl font-bold">
          {bn ? "Ecory — গোপনীয়তা নীতি" : "Ecory — Privacy Policy"}
        </h1>
        {PRIVACY_SECTIONS[bn ? "bn" : "en"].map(([title, body]) => (
          <section key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-7">{body}</p>
          </section>
        ))}
        <Link
          to="/delete-account"
          className="block rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground"
        >
          {bn ? "অ্যাকাউন্ট ও তথ্য মুছে দেওয়ার আবেদন" : "Request account and data deletion"}
        </Link>
        <a href={`mailto:${PRIVACY_CONTACT.email}`} className="block break-all underline">
          {PRIVACY_CONTACT.email}
        </a>
      </article>
    </Shell>
  );
}
