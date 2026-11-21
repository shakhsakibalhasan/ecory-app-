import { RequestedDoctorSchedule } from "@/components/RequestedDoctorSchedule";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { Download, CalendarDays, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { useStore, BDT, contentText } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { bookingDate, bookingTime, bookingStatus, bookingTimestamp } from "@/lib/booking-format";
import { saveBookingPdf } from "@/lib/booking-pdf";
import { NumberText } from "@/components/NumberText";

export const Route = createFileRoute("/doctor-booking/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "ডাক্তার বুকিং বিস্তারিত — ইকোরি" },
      { name: "description", content: "আপনার ইকোরি ডাক্তার বুকিংয়ের সময় ও আপডেট দেখুন।" },
      { property: "og:title", content: "ডাক্তার বুকিং বিস্তারিত — ইকোরি" },
      { property: "og:description", content: "আপনার ইকোরি ডাক্তার বুকিংয়ের সময় ও আপডেট দেখুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingDetails,
});
function BookingDetails() {
  const { id } = Route.useParams();
  const { lang } = useStore();
  const bn = lang === "bn";
  const { user, ready } = useSession();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["doctor-booking", id, user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const b = await supabase.from("doctor_bookings").select("*").eq("id", id).maybeSingle();
      if (b.error) throw b.error;
      if (!b.data) throw new Error("Booking not found");
      const [doctor, events] = await Promise.all([
        supabase.from("doctors").select("*").eq("id", b.data.doctor_id).maybeSingle(),
        supabase.from("doctor_booking_events").select("*").eq("booking_id", id).order("created_at"),
      ]);
      if (events.error) throw events.error;
      return { booking: b.data, doctor: doctor.data, events: events.data || [] };
    },
  });
  async function cancel() {
    if (!confirm(bn ? "এই booking বাতিল করবেন?" : "Cancel this booking?")) return;
    setBusy(true);
    try {
      const r = await supabase.rpc("cancel_doctor_booking", { p_booking: id });
      if (r.error) throw r.error;
      await q.refetch();
      await client.invalidateQueries({ queryKey: ["my-doctor-bookings"] });
      toast.success(bn ? "Booking বাতিল হয়েছে" : "Booking cancelled");
    } catch (e) {
      toast.error((e as { message?: string }).message || "Unable to cancel");
    } finally {
      setBusy(false);
    }
  }
  if (!ready || q.isLoading)
    return (
      <Shell title={bn ? "বুকিং বিস্তারিত" : "Booking details"}>
        <p>{bn ? "লোড হচ্ছে…" : "Loading…"}</p>
      </Shell>
    );
  if (!user)
    return (
      <Shell title={bn ? "বুকিং বিস্তারিত" : "Booking details"}>
        <Link to="/profile" className="underline">
          {bn ? "আপনার বুকিং দেখতে Login করুন" : "Sign in to view your booking"}
        </Link>
      </Shell>
    );
  if (q.error || !q.data)
    return (
      <Shell title={bn ? "বুকিং বিস্তারিত" : "Booking details"}>
        <p>
          {bn ? "বুকিং লোড হয়নি। পরে চেষ্টা করুন।" : "Could not load booking. Try again later."}
        </p>
        <button onClick={() => void q.refetch()} className="mt-3 rounded-lg border p-3">
          {bn ? "আবার চেষ্টা করুন" : "Retry"}
        </button>
      </Shell>
    );
  const { booking: b, doctor, events } = q.data;
  const name = doctor ? contentText(doctor, "name", lang) : bn ? "Doctor" : "Doctor";
  const accepted = b.status === "confirmed" || b.status === "completed";
  const tone =
    b.status === "cancelled"
      ? "border-red-200 bg-red-50"
      : accepted
        ? "border-[#b6d898] bg-[#edf6e6]"
        : "border-[#e2d0a5] bg-[#fff8e9]";
  const serial = (b as unknown as { serial_number?: string }).serial_number;
  const latestChange = [...events].reverse().find((e) => e.kind === "rescheduled");
  const payable = "";
  async function pdf() {
    setBusy(true);
    try {
      const lines = [
        `${bn ? "সিরিয়াল" : "Serial"}: ${serial || "—"}`,
        `${bn ? "বুকিং নম্বর" : "Booking ID"}: ${b.id}`,
        `${bn ? "Doctor" : "Doctor"}: ${name}`,
        `${bn ? "পরামর্শের ধরন" : "Consultation mode"}: ${b.consultation_mode === "in_person" ? (bn ? "সরাসরি" : "In person") : bn ? "ফোনে" : "Phone"}`,
        `${bn ? "রোগীর নাম" : "Patient name"}: ${b.patient_name}`,
        `${bn ? "মোবাইল" : "Phone"}: ${b.phone}`,
        `${bn ? "বয়স" : "Age"}: ${b.patient_age ?? "—"}`,
        `${bn ? "ঠিকানা" : "Address"}: ${b.address || "—"}`,
        `${bn ? "তারিখ" : "Date"}: ${bookingDate(b.preferred_date, bn)}`,
        `${bn ? "সময়" : "Time"}: ${bookingTime(b.preferred_time)}`,
        `${bn ? "ফি" : "Fee"}: ${b.fee === 0 ? (bn ? "বিনামূল্যে" : "Free") : b.fee == null ? "—" : BDT(b.fee)}`,
        `${bn ? "অবস্থা" : "Status"}: ${bookingStatus(b.status, bn)}`,
        `${bn ? "Payment" : "Payment"}: ${bookingStatus(b.payment_status, bn)}`,
        `${bn ? "সমস্যা" : "Concern"}: ${b.concern || "—"}`,
        `${bn ? "নোট" : "Note"}: ${b.admin_note || "—"}`,
        "",
        bn ? "বুকিং আপডেটের ইতিহাস" : "Booking update history",
      ];
      for (const e of events) {
        lines.push(
          `${bookingTimestamp(e.created_at, bn)} — ${e.kind === "rescheduled" ? (bn ? "সময় পরিবর্তন" : "Rescheduled") : e.kind === "payment" ? bookingStatus(e.payment_status, bn) : e.kind === "note" ? (bn ? "নোট আপডেট" : "Note updated") : e.kind === "imported" ? (bn ? "বর্তমান অবস্থার রেকর্ড" : "Current status record") : bookingStatus(e.status, bn)}`,
        );
        if (e.kind === "rescheduled") {
          lines.push(
            `${bn ? "আগে" : "Before"}: ${bookingDate(e.previous_date!, bn)} ${bookingTime(e.previous_time!)}`,
            `${bn ? "এখন" : "Now"}: ${bookingDate(e.appointment_date, bn)} ${bookingTime(e.appointment_time)}`,
          );
        }
        if (e.note) lines.push(e.note);
      }
      await saveBookingPdf(id, bn ? "Doctor বুকিং বিস্তারিত" : "Doctor booking details", lines, bn);
    } catch (e) {
      toast.error(
        bn
          ? "PDF নেওয়া যায়নি। APK হলে নতুন version install করে চেষ্টা করুন।"
          : (e as Error).message || "Unable to save PDF",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title={bn ? "বুকিং বিস্তারিত" : "Booking details"}>
      <section className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
        <div className="flex items-start gap-3">
          {b.status === "cancelled" ? (
            <XCircle size={26} />
          ) : accepted ? (
            <CheckCircle2 size={26} />
          ) : (
            <Clock size={26} />
          )}
          <div>
            <h2
              className={`inline-block rounded-full border px-4 py-1.5 text-base font-semibold ${tone}`}
            >
              {bookingStatus(b.status, bn)}
            </h2>
            <p className="mt-1 text-sm">
              {b.status === "requested"
                ? bn
                  ? "Doctor-এর পক্ষ থেকে সময় নিশ্চিত করার অপেক্ষায়।"
                  : "Waiting for appointment confirmation."
                : b.status === "cancelled"
                  ? bn
                    ? "এই appointment বাতিল করা হয়েছে।"
                    : "This appointment has been cancelled."
                  : bn
                    ? "আপনার booking-এর বর্তমান তথ্য নিচে দেওয়া আছে।"
                    : "Your current booking details are below."}
            </p>
          </div>
        </div>
      </section>
      {latestChange && (
        <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarDays size={19} />
            {bn ? "সময় পরিবর্তন করা হয়েছে" : "Appointment rescheduled"}
          </h3>
          <p className="mt-2 text-sm">
            {bn ? "আগে: " : "Before: "}
            {bookingDate(latestChange.previous_date!, bn)} ·{" "}
            {bookingTime(latestChange.previous_time!)}
          </p>
          <p className="mt-1 text-sm">
            {bn ? "নতুন: " : "Now: "}
            {bookingDate(b.preferred_date, bn)} · {bookingTime(b.preferred_time)}
          </p>
          <p className="mt-1 text-xs">{bookingTimestamp(latestChange.created_at, bn)}</p>
        </section>
      )}
      <RequestedDoctorSchedule booking={b} bn={bn} />
      <section className="mt-4 space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">{name}</h3>
        {doctor && <p className="text-sm">{contentText(doctor, "degree", lang)}</p>}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#dce7d0] bg-[#f5f8f1] p-4">
          <div>
            <p className="text-xs">{bn ? "তারিখ" : "Date"}</p>
            <p className="mt-1 font-semibold">{bookingDate(b.preferred_date, bn)}</p>
          </div>
          <div>
            <p className="text-xs">{bn ? "সময়" : "Time"}</p>
            <p className="mt-1 font-semibold">{bookingTime(b.preferred_time)}</p>
          </div>
        </div>
        <p className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold">
          {bn ? "সিরিয়াল: " : "Serial: "}
          {serial || (bn ? "নিশ্চিত করা হবে" : "To be assigned")}
        </p>
        <dl className="grid gap-2 text-sm">
          {[
            [
              bn ? "ধরন" : "Mode",
              b.consultation_mode === "in_person"
                ? bn
                  ? "সরাসরি"
                  : "In person"
                : bn
                  ? "ফোনে"
                  : "Phone",
            ],
            [bn ? "রোগীর নাম" : "Patient", b.patient_name],
            [bn ? "মোবাইল" : "Phone", b.phone],
            [bn ? "বয়স" : "Age", b.patient_age ?? "—"],
            [bn ? "ঠিকানা" : "Address", b.address || "—"],
            [
              bn ? "ফি" : "Fee",
              b.fee === 0 ? (bn ? "বিনামূল্যে" : "Free") : b.fee == null ? "—" : BDT(b.fee),
            ],
            ["Payment", bookingStatus(b.payment_status, bn)],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-black/5 bg-[#fafbf8] px-3 py-2.5"
            >
              <dt>{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {b.concern && (
          <div>
            <h4 className="font-semibold">{bn ? "সমস্যার বিবরণ" : "Concern"}</h4>
            <p className="mt-1 whitespace-pre-line text-sm">
              <NumberText value={b.concern} />
            </p>
          </div>
        )}
        {b.admin_note && (
          <p className="whitespace-pre-line rounded-lg bg-[#f4f6f1] p-3 text-sm">
            <NumberText value={b.admin_note} />
          </p>
        )}
        <p className="break-all text-xs">
          {bn ? "বুকিং নম্বর: " : "Booking ID: "}
          {b.id}
        </p>
      </section>
      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">{bn ? "বুকিংয়ের অগ্রগতি" : "Booking timeline"}</h3>
        <ol className="mt-4 space-y-4">
          {events.map((e) => (
            <li
              key={e.id}
              className={`rounded-xl border border-l-4 p-4 ${e.kind === "rescheduled" ? "border-amber-400 bg-amber-50" : e.status === "cancelled" ? "border-red-400 bg-red-50" : e.status === "confirmed" || e.status === "completed" ? "border-[#86BF3C] bg-[#f0f7e9]" : "border-[#b7c0ac] bg-[#f4f6f1]"}`}
            >
              <p className="text-sm font-semibold">
                {e.kind === "rescheduled"
                  ? bn
                    ? "সময় পরিবর্তন করা হয়েছে"
                    : "Appointment rescheduled"
                  : e.kind === "payment"
                    ? bookingStatus(e.payment_status, bn)
                    : e.kind === "note"
                      ? bn
                        ? "নোট আপডেট"
                        : "Note updated"
                      : e.kind === "imported"
                        ? bn
                          ? "বর্তমান অবস্থার রেকর্ড"
                          : "Current status record"
                        : bookingStatus(e.status, bn)}
              </p>
              <p className="mt-1 text-xs">{bookingTimestamp(e.created_at, bn)}</p>
              {e.kind === "rescheduled" && (
                <div className="mt-2 text-sm">
                  <p>
                    {bn ? "আগে: " : "Before: "}
                    {bookingDate(e.previous_date!, bn)} · {bookingTime(e.previous_time!)}
                  </p>
                  <p>
                    {bn ? "নতুন: " : "After: "}
                    {bookingDate(e.appointment_date, bn)} · {bookingTime(e.appointment_time)}
                  </p>
                </div>
              )}
              {e.note && (
                <p className="mt-2 whitespace-pre-line text-sm">
                  <NumberText value={e.note} />
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <div className="mt-4 space-y-3">
        <button
          disabled={busy}
          onClick={() => void pdf()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 font-semibold text-primary-foreground"
        >
          <Download size={18} />
          {busy ? (bn ? "অপেক্ষা করুন…" : "Please wait…") : bn ? "PDF নিন" : "Download PDF"}
        </button>
        {payable && b.status !== "cancelled" && (
          <a
            href={payable}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-primary p-3 text-center font-semibold"
          >
            {bn ? "ফি দিন" : "Pay fee"}
          </a>
        )}
        {["requested", "confirmed"].includes(b.status) &&
          (!b.preferred_date ||
            !b.preferred_time ||
            new Date(`${b.preferred_date}T${b.preferred_time}+06:00`).getTime() > Date.now()) && (
            <button
              disabled={busy}
              onClick={() => void cancel()}
              className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm"
            >
              {bn ? "বুকিং বাতিল করুন" : "Cancel booking"}
            </button>
          )}
        <Link to="/doctor-bookings" search={{ doctor: undefined }} className="block p-2 text-center text-sm underline">
          {bn ? "আমার সব বুকিং" : "All my bookings"}
        </Link>
      </div>
    </Shell>
  );
}
