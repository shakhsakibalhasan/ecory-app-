import {
  CalendarDays,
  Clock3,
  ArrowUpRight,
  UserRound,
  Phone,
  MapPin,
  CalendarCheck2,
} from "lucide-react";
import { RequestedDoctorSchedule } from "./RequestedDoctorSchedule";
import "@/doctor.css";
import { DoctorSchedulePicker } from "./DoctorSchedulePicker";
import { doctorSchedule, validBookingChoice } from "@/lib/doctor-schedule";
import { bookingDate, bookingTime, bookingStatus } from "@/lib/booking-format";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSession } from "@/lib/auth";
import { BDT, useTable, contentText, useSettings } from "@/lib/store";
import { uiClient } from "@/lib/presentation";
import { toast } from "sonner";
export function DoctorBooking({
  doctor,
  bn,
  mode = "phone",
  openRequest = 0,
  hideTrigger = false,
}: {
  doctor: Tables<"doctors">;
  bn: boolean;
  mode?: "phone" | "in_person";
  openRequest?: number;
  hideTrigger?: boolean;
}) {
  const { user, ready } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false);
  const id = useRef(crypto.randomUUID());
  const config = doctorSchedule((doctor as unknown as Record<string, unknown>)["booking_schedule"]);
  const [selectedDate, setSelectedDate] = useState(""),
    [selectedTime, setSelectedTime] = useState("");
  const [method, setMethod] = useState("bkash");
  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);
  const fee = mode === "phone" ? doctor.consultation_fee : doctor.in_person_fee;
  const free =
    mode === "phone" ? doctor.consultation_free || fee === 0 : doctor.in_person_free || fee === 0;
  const methods = ["bkash", "nagad", "online"].filter(
    (m) => (settings?.payments as Record<string, boolean> | undefined)?.[m] === true,
  );
  useEffect(() => {
    if (methods.length && !methods.includes(method)) setMethod(methods[0]!);
  }, [methods.join(","), method]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || busy) return;
    if (config.date_enabled && !selectedDate) {
      toast.error(bn ? "তারিখ নির্বাচন করুন" : "Select a date");
      return;
    }
    if (config.time_enabled && !selectedTime) {
      toast.error(bn ? "সময় নির্বাচন করুন" : "Select a time");
      return;
    }
    if (!validBookingChoice(config, selectedDate, selectedTime)) {
      toast.error(
        bn
          ? "সঠিক বর্তমান বা ভবিষ্যতের তারিখ/সময় দিন"
          : "Choose a valid current or future date/time",
      );
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    let popup: Window | null = null;
    try {
      const patient = {
        requested_date: config.date_enabled ? selectedDate : null,
        requested_time: config.time_enabled ? selectedTime : null,
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || "")
          .replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c)))
          .replace(/\D/g, ""),
        age: String(f.get("age") || ""),
        address: String(f.get("address") || ""),
        concern: String(f.get("concern") || ""),
      };
      const email = String(f.get("email") || "");
      if (!free) {
        if (!methods.includes(method))
          throw Error(bn ? "পেমেন্ট এখন চালু নেই" : "Payment is unavailable");
        const check = await supabase.functions.invoke("doctor-payment-start", {
          body: { action: "ready" },
        });
        if (check.error || !check.data?.ready)
          throw Error(
            bn ? "এই পেমেন্ট পদ্ধতি এখন চালু নেই" : "This payment method is currently unavailable",
          );
        popup = window.open("about:blank", "ecory-doctor-payment", "width=460,height=720");
      }
      const r = await uiClient.rpc("prepare_doctor_checkout", {
        p_id: id.current,
        p_doctor: doctor.id,
        p_mode: mode,
        p_patient: patient,
      });
      if (r.error) throw r.error;
      setLocked(true);
      if (r.data.booking_id) {
        await qc.invalidateQueries({ queryKey: ["my-doctor-bookings"] });
        await qc.invalidateQueries({ queryKey: ["my-doctor-bookings-exists"] });
        await navigate({ to: "/doctor-booking/$id", params: { id: r.data.booking_id } });
        return;
      }
      const payment = await supabase.functions.invoke("doctor-payment-start", {
        body: { intent_id: r.data.intent_id, email, method },
      });
      if (payment.error || !payment.data?.url)
        throw Error(payment.data?.error || (bn ? "পেমেন্ট খোলা যায়নি" : "Unable to open payment"));
      const target = new URL(payment.data.url);
      if (
        target.protocol !== "https:" ||
        !(target.hostname === "sslcommerz.com" || target.hostname.endsWith(".sslcommerz.com"))
      )
        throw Error("Invalid payment URL");
      if (popup) popup.location.href = target.href;
      else window.location.assign(target.href);
      toast.info(
        bn
          ? "পেমেন্ট যাচাই হলে বুকিং তৈরি হবে। তারপর আমার বুকিং দেখুন।"
          : "Booking is created after payment verification. Check My bookings.",
      );
    } catch (error) {
      popup?.close();
      toast.error((error as { message?: string }).message || "Booking failed");
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-1 w-full rounded-xl border bg-white p-3 text-sm";
  return (
    <div className="doctor-checkout-form mt-4">
      {!hideTrigger && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full rounded-full bg-primary p-3 text-white"
        >
          {bn ? "বুক করুন" : "Book"}
        </button>
      )}
      {open && (
        <section className="space-y-4 rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <img
              src={doctor.photo || "/favicon.png"}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-semibold">{contentText(doctor, "name", bn ? "bn" : "en")}</h3>
              <p className="text-xs">
                {mode === "phone"
                  ? bn
                    ? "ফোনে পরামর্শ"
                    : "Phone consultation"
                  : bn
                    ? "সরাসরি দেখা"
                    : "In-person visit"}
              </p>
              <strong className="ecory-price text-lg">
                {free ? (bn ? "বিনামূল্যে" : "Free") : BDT(fee || 0)}
              </strong>
            </div>
          </div>
          <p className="rounded-xl bg-primary-soft p-3 text-sm">
            {bn
              ? "আপনার serial অনুযায়ী Admin তারিখ ও সময় নিশ্চিত করে জানাবে।"
              : "Admin will assign your serial, date and time."}
          </p>
          <DoctorSchedulePicker
            config={config}
            bn={bn}
            date={selectedDate}
            time={selectedTime}
            onDate={setSelectedDate}
            onTime={setSelectedTime}
            disabled={busy || locked}
          />
          {!ready ? (
            <p>Loading…</p>
          ) : !user ? (
            <Link to="/profile" className="underline">
              {bn ? "আগে Login করুন" : "Sign in first"}
            </Link>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <fieldset disabled={busy || locked} className="space-y-3">
                <label className="block text-sm">
                  {bn ? "রোগীর নাম" : "Patient name"}
                  <input
                    className={input}
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={user.user_metadata?.["name"] || ""}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    {bn ? "মোবাইল" : "Phone"}
                    <input
                      className={input}
                      name="phone"
                      type="tel"
                      required
                      pattern="[০-৯0-9]{11}"
                      maxLength={11}
                    />
                  </label>
                  <label className="text-sm">
                    {bn ? "বয়স" : "Age"}
                    <input className={input} name="age" type="number" min={0} max={120} />
                  </label>
                </div>
                <label className="block text-sm">
                  {bn ? "ঠিকানা" : "Address"}
                  <textarea
                    className={input}
                    name="address"
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={2}
                  />
                </label>
                <label className="block text-sm">
                  {bn ? "সমস্যার বিবরণ" : "Concern"}
                  <textarea className={input} name="concern" maxLength={2000} rows={3} />
                </label>
              </fieldset>
              {!free && (
                <>
                  <label className="block text-sm">
                    Email
                    <input
                      className={input}
                      name="email"
                      type="email"
                      required
                      defaultValue={user.email || ""}
                    />
                  </label>
                  <div className="space-y-2 rounded-xl border p-3">
                    <h4 className="text-sm font-semibold">
                      {bn ? "পেমেন্ট মাধ্যম" : "Payment method"}
                    </h4>
                    {methods.map((m) => (
                      <label key={m} className="flex items-center gap-2 rounded-lg border p-2">
                        <input type="radio" checked={method === m} onChange={() => setMethod(m)} />
                        {m === "bkash"
                          ? "bKash"
                          : m === "nagad"
                            ? "Nagad"
                            : bn
                              ? "কার্ড / অনলাইন"
                              : "Card / online"}
                      </label>
                    ))}
                    {!methods.length && (
                      <p className="text-sm">
                        {bn ? "পেমেন্ট মাধ্যম চালু হয়নি" : "Payment methods unavailable"}
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-between rounded-xl bg-primary-soft p-3">
                <span>{bn ? "মোট" : "Total"}</span>
                <strong className="ecory-price">{BDT(free ? 0 : fee || 0)}</strong>
              </div>
              <button
                disabled={busy || (!free && !methods.length)}
                className="w-full rounded-full bg-primary p-3 font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? bn
                    ? "অপেক্ষা করুন…"
                    : "Please wait…"
                  : free
                    ? bn
                      ? "বুকিং অনুরোধ পাঠান"
                      : "Request booking"
                    : bn
                      ? "ফি দিন ও বুক করুন"
                      : "Pay & book"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
export function MyDoctorBookings({ bn, doctorId }: { bn: boolean; doctorId?: string | undefined }) {
  const { user } = useSession();
  const { data: doctors = [] } = useTable("doctors");
  const {
    data = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["my-doctor-bookings", user?.id, doctorId],
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let request = supabase.from("doctor_bookings").select("*").eq("user_id", user!.id);
      if (doctorId) request = request.eq("doctor_id", doctorId);
      const r = await request.order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });
  if (!user) return null;
  if (isLoading) return <p role="status">{bn ? "বুকিং লোড হচ্ছে…" : "Loading bookings…"}</p>;
  return (
    <section className="doctor-booking-list" aria-label={bn ? "আমার বুকিং" : "My bookings"}>
      {error && (
        <div className="doctor-booking-empty" role="alert">
          {bn
            ? "বুকিং তালিকা লোড হয়নি। পরে চেষ্টা করুন।"
            : "Could not load bookings. Try again later."}
        </div>
      )}
      {!error && !data.length && (
        <div className="doctor-booking-empty">
          <CalendarCheck2 size={30} />
          <p>{bn ? "এখনো কোনো বুকিং নেই।" : "No bookings yet."}</p>
          <Link to="/doctor" search={{ doctor: undefined }}>
            {bn ? "ডাক্তার দেখুন" : "Find a doctor"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {data.map((b) => {
        const doctor = doctors.find((d) => d.id === b.doctor_id);
        const name = contentText(
          doctor || { name: "ডাক্তার", name_en: "Doctor" },
          "name",
          bn ? "bn" : "en",
        );
        return (
          <article key={b.id} className="doctor-booking-card doctor-booking-reference">
            <div className="doctor-booking-card-top">
              <div className="doctor-booking-avatar">
                {doctor?.photo ? (
                  <img src={doctor.photo} alt={name} loading="lazy" />
                ) : (
                  <UserRound size={25} />
                )}
              </div>
              <div className="doctor-booking-identity">
                <h3>{name}</h3>
                <p>
                  <UserRound size={13} />
                  {b.patient_name}
                </p>
                <span>
                  {b.consultation_mode === "phone" ? <Phone size={12} /> : <MapPin size={12} />}{" "}
                  {b.consultation_mode === "phone"
                    ? bn
                      ? "ফোনে পরামর্শ"
                      : "Phone consultation"
                    : bn
                      ? "সরাসরি সাক্ষাৎ"
                      : "In-person visit"}
                </span>
              </div>
              <Link
                to="/doctor"
                search={{ doctor: b.doctor_id }}
                className="doctor-booking-profile-link"
              >
                {bn ? "প্রোফাইল" : "Profile"}
              </Link>
            </div>
            <div className="doctor-booking-status-row">
              <span className="doctor-booking-status" data-status={b.status}>
                {bookingStatus(b.status, bn)}
              </span>
              <span className="doctor-booking-payment">{bookingStatus(b.payment_status, bn)}</span>
            </div>
            <div className="doctor-booking-appointment">
              <div>
                <CalendarDays size={16} />
                <span>
                  <small>{bn ? "তারিখ" : "Date"}</small>
                  {bookingDate(b.preferred_date, bn)}
                </span>
              </div>
              <div>
                <Clock3 size={16} />
                <span>
                  <small>{bn ? "সময়" : "Time"}</small>
                  {b.preferred_time
                    ? bookingTime(b.preferred_time)
                    : bn
                      ? "জানানো হবে"
                      : "To be confirmed"}
                </span>
              </div>
            </div>
            <RequestedDoctorSchedule booking={b} bn={bn} />
            {b.admin_note && <p className="doctor-booking-note">{b.admin_note}</p>}
            <div className="doctor-booking-card-bottom">
              <div>
                <small>{bn ? "পরামর্শ ফি" : "Consultation fee"}</small>
                <strong>{b.fee === 0 ? (bn ? "বিনামূল্যে" : "Free") : BDT(b.fee || 0)}</strong>
              </div>
              <Link to="/doctor-booking/$id" params={{ id: b.id }}>
                {bn ? "বুকিং বিস্তারিত" : "Booking details"}
                <ArrowUpRight size={17} />
              </Link>
              <Link to="/doctor" search={{ doctor: b.doctor_id }}>
                {bn ? "প্রোফাইল দেখুন" : "View profile"}
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}
