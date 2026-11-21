import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { MyDoctorBookings } from "@/components/DoctorBooking";
import { useSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
export const Route = createFileRoute("/doctor-bookings")({
  validateSearch: (s: Record<string, unknown>) => ({
    doctor: typeof s["doctor"] === "string" ? s["doctor"] : undefined,
  }),
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "আমার ডাক্তার বুকিং — ইকোরি" },
      { name: "description", content: "আপনার ইকোরি ডাক্তার পরামর্শের বুকিং দেখুন।" },
      { property: "og:title", content: "আমার ডাক্তার বুকিং — ইকোরি" },
      { property: "og:description", content: "আপনার ইকোরি ডাক্তার পরামর্শের বুকিং দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Bookings,
});
function Bookings() {
  const { doctor } = Route.useSearch();
  const { lang } = useStore();
  const { user, ready } = useSession();
  const bn = lang === "bn";
  return (
    <Shell title={bn ? "আমার বুকিং" : "My bookings"}>
      {!ready ? (
        <p>{bn ? "লোড হচ্ছে…" : "Loading…"}</p>
      ) : user ? (
        <MyDoctorBookings bn={bn} doctorId={doctor} />
      ) : (
        <Link to="/profile" className="underline">
          {bn ? "বুকিং দেখতে Login করুন" : "Sign in to view your bookings"}
        </Link>
      )}
    </Shell>
  );
}
