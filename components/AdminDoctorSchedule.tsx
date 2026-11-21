import { doctorSchedule } from "@/lib/doctor-schedule";
export function AdminDoctorSchedule({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const s = doctorSchedule(value);
  return (
    <section className="admin-doctor-schedule sm:col-span-2">
      <h3>বুকিংয়ে তারিখ ও সময় নির্বাচন</h3>
      <p>
        প্রতিটি switch আলাদাভাবে কাজ করবে। চালু অংশ রোগী নিজের মতো নির্বাচন করবেন। বন্ধ অংশ পরে
        আপনারা নিশ্চিত করবেন।
      </p>
      <div className="admin-doctor-schedule-toggles">
        {(
          [
            {
              key: "date_enabled",
              title: "তারিখ নির্বাচন",
              text: "রোগী calendar থেকে তারিখ বেছে নেবেন",
            },
            {
              key: "time_enabled",
              title: "সময় নির্বাচন",
              text: "রোগী সময় বেছে নেবেন — 12-hour AM/PM",
            },
          ] as const
        ).map((x) => (
          <label key={x.key}>
            <div>
              <strong>{x.title}</strong>
              <small>{x.text}</small>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label={x.title}
              checked={s[x.key]}
              onChange={(e) => onChange({ ...s, [x.key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
      <p>
        দুটি বন্ধ: তারিখ/সময় ছাড়া বুকিং ফর্ম। শুধু তারিখ, শুধু সময়, অথবা দুটোই চালু রাখা যাবে। আলাদা
        তারিখ/সময়ের তালিকা লিখতে হবে না। রোগীর নির্বাচন অনুরোধ হিসেবে জমা হবে; চূড়ান্ত appointment
        আপনারা নিশ্চিত করবেন।
      </p>
    </section>
  );
}
