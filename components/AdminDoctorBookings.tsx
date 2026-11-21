import { RequestedDoctorSchedule } from "./RequestedDoctorSchedule";
import { CalendarDays, Clock3, CircleCheck, Ban } from "lucide-react";
import { bookingDate, bookingTime, bookingTimestamp, bookingStatus } from "@/lib/booking-format";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@/lib/query";
import { uiClient } from "@/lib/presentation";
import { BDT, useTable } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
type Booking = {
  id: string;
  doctor_id: string;
  patient_name: string;
  phone: string;
  patient_age: number | null;
  concern: string;
  address: string;
  consultation_mode: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  payment_status: string;
  admin_note: string;
  serial_number: string;
  sms_note: string;
  fee: number | null;
  created_at: string;
};
export function AdminDoctorBookings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const { data: doctors = [] } = useTable("doctors");
  const [busy, setBusy] = useState<string | null>(null);
  const {
    data: result,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["admin-doctor-bookings", page],
    queryFn: async () => {
      const r = await uiClient
        .from("doctor_bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (r.error) throw r.error;
      return { rows: r.data as Booking[], count: r.count || 0 };
    },
  });
  const data = result?.rows || [];
  const stats = useQuery({
    queryKey: ["admin-booking-metrics"],
    refetchInterval: 60000,
    queryFn: async () => {
      const values = await Promise.all(
        ["all", "requested", "confirmed", "cancelled"].map(async (status) => {
          let query = uiClient.from("doctor_bookings").select("id", { count: "exact", head: true });
          if (status !== "all") query = query.eq("status", status);
          const result = await query;
          if (result.error) throw result.error;
          return result.count ?? 0;
        }),
      );
      return values;
    },
  });
  async function save(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date") || ""),
      time = String(f.get("time") || ""),
      status = String(f.get("status"));
    if (["confirmed", "completed"].includes(status) && (!date || !time))
      return void toast.error("নিশ্চিত করতে তারিখ ও সময় দিন");
    setBusy(id);
    try {
      const r = await uiClient
        .from("doctor_bookings")
        .update({
          status,
          preferred_date: date || null,
          preferred_time: time || null,
          serial_number: String(f.get("serial") || "").trim(),
          admin_note: String(f.get("note") || ""),
          sms_note: String(f.get("sms_note") || ""),
        })
        .eq("id", id)
        .select("id");
      if (r.error || !r.data?.length) throw Error(r.error?.message || "সেভ হয়নি");
      await qc.invalidateQueries({ queryKey: ["admin-doctor-bookings"] });
      await qc.invalidateQueries({ queryKey: ["admin-booking-metrics"] });
      await qc.invalidateQueries({ queryKey: ["doctor-booking", id] });
      toast.success("Booking সেভ হয়েছে। SMS চালু থাকলে queue থেকে পাঠানো হবে।");
      void uiClient.functions.invoke("customer-sms", { body: {} });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const input = "mt-1 w-full rounded-lg border p-2";
  return (
    <section className="mt-6 space-y-3">
      <h3 className="font-semibold">Doctor booking / Serial ও Schedule</h3>
      {stats.data && (
        <div className="admin-mini-stats">
          {["মোট বুকিং", "অপেক্ষমাণ", "নিশ্চিত", "বাতিল"].map((label, i) => (
            <div key={label}>
              <span className="admin-stat-icon">
                {(() => {
                  const Icon = [CalendarDays, Clock3, CircleCheck, Ban][i]!;
                  return <Icon size={19} />;
                })()}
              </span>
              <div>
                <span>{label}</span>
                <strong>{stats.data[i]?.toLocaleString("bn-BD")}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
      {isLoading && <p>Loading…</p>}
      {error && <p>Booking লোড হয়নি। SQL update পরীক্ষা করুন।</p>}
      <div className="flex items-center gap-3 text-sm">
        <button
          className="rounded-lg border px-3 py-2 disabled:opacity-40"
          disabled={!page || isLoading}
          onClick={() => setPage((p) => p - 1)}
        >
          আগের পাতা
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil((result?.count || 0) / pageSize))}
        </span>
        <button
          className="rounded-lg border px-3 py-2 disabled:opacity-40"
          disabled={isLoading || (page + 1) * pageSize >= (result?.count || 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          পরের পাতা
        </button>
      </div>
      {data.map((b) => (
        <details key={b.id} className="rounded-xl border bg-white text-sm">
          <summary className="cursor-pointer p-3">
            <span className="font-semibold">{b.patient_name}</span>
            <RequestedDoctorSchedule booking={b} bn />
            <span className="ml-2 rounded-full bg-primary-soft px-2 py-1 text-xs">
              {bookingStatus(b.status, true)}
            </span>
            <p className="mt-1 text-xs">
              {doctors.find((d) => d.id === b.doctor_id)?.name} ·{" "}
              {b.consultation_mode === "phone" ? "ফোনে" : "সরাসরি"} ·{" "}
              {b.fee === 0 ? "বিনামূল্যে" : BDT(b.fee || 0)} ·{" "}
              {bookingStatus(b.payment_status, true)}
            </p>
            <p className="mt-1 text-xs">
              Serial: {b.serial_number || "—"} · {bookingDate(b.preferred_date, true)}{" "}
              {bookingTime(b.preferred_time)}
            </p>
          </summary>
          <form onSubmit={(e) => void save(e, b.id)} className="space-y-3 border-t p-3">
            <p>
              {b.phone} · {b.address}
            </p>
            <p>{b.concern}</p>
            <p className="text-xs">{bookingTimestamp(b.created_at, true)}</p>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Serial
                <input
                  name="serial"
                  maxLength={50}
                  defaultValue={b.serial_number}
                  className={input}
                />
              </label>
              <label>
                অবস্থা
                <select name="status" defaultValue={b.status} className={input}>
                  {["requested", "confirmed", "completed", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {bookingStatus(s, true)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                তারিখ
                <input
                  name="date"
                  type="date"
                  defaultValue={b.preferred_date || ""}
                  className={input}
                />
              </label>
              <label>
                সময় (১২ ঘণ্টায় দেখাবে)
                <input
                  name="time"
                  type="time"
                  defaultValue={b.preferred_time?.slice(0, 5) || ""}
                  className={input}
                />
              </label>
            </div>
            <label className="block">
              রোগীকে দেখানোর নোট
              <textarea
                name="note"
                maxLength={2000}
                defaultValue={b.admin_note}
                className={input}
              />
            </label>
            <label className="block">
              SMS note / reason (English)
              <textarea
                name="sms_note"
                maxLength={250}
                defaultValue={b.sms_note}
                className={input}
              />
            </label>
            <p className="text-xs">
              Payment: {bookingStatus(b.payment_status, true)} — online payment server-এ যাচাই হয়।
            </p>
            <button disabled={!!busy} className="rounded-lg bg-primary px-4 py-2 text-white">
              {busy === b.id ? "সেভ হচ্ছে…" : "Schedule / Status সেভ করুন"}
            </button>
          </form>
        </details>
      ))}
    </section>
  );
}
