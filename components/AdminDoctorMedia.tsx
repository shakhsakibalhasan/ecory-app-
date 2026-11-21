import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTable } from "@/lib/store";
import { uiClient } from "@/lib/presentation";
import { uploadMedia } from "@/lib/admin-upload";
import { doctorMedia, safeMediaUrl, type DoctorMedia } from "@/lib/doctor-media";
export function AdminDoctorMedia() {
  const { data = [] } = useTable("doctors");
  const client = useQueryClient();
  const [id, setId] = useState("");
  const [kind, setKind] = useState<"profile_reviews" | "profile_clips">("profile_reviews");
  const [draft, setDraft] = useState<DoctorMedia[] | null>(null);
  const [busy, setBusy] = useState(false);
  const doctor = data.find((x) => x.id === id);
  const rows = draft ?? doctorMedia(doctor?.[kind]);
  const edit = (i: number, patch: Partial<DoctorMedia>) =>
    setDraft(rows.map((x, j) => (i === j ? { ...x, ...patch } : x)));
  async function save() {
    if (!doctor) return;
    if (rows.some((x) => x.kind !== "text" && !safeMediaUrl(x.url)))
      return void toast.error("ছবি/ভিডিওর সঠিক https Link দিন");
    if (rows.some((x) => x.kind === "text" && !x.bn.trim() && !x.en.trim()))
      return void toast.error("Review-এর লেখা দিন");
    setBusy(true);
    try {
      const r = await uiClient
        .from("doctors")
        .update({ [kind]: rows })
        .eq("id", id);
      if (r.error) throw r.error;
      await client.invalidateQueries({ queryKey: ["doctors"] });
      setDraft(null);
      toast.success("সেভ হয়েছে");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(i: number, f: File) {
    setBusy(true);
    try {
      const { url } = await uploadMedia(f, "doctors/reviews");
      edit(i, { url, kind: "image" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function discard() {
    return !draft || confirm("সেভ না করা পরিবর্তন বাদ দেবেন?");
  }
  return (
    <section className="mt-6 space-y-3 rounded-xl border bg-white p-4">
      <h3 className="font-semibold">Doctor Review ও Clips (Rating ছাড়া)</h3>
      <select
        disabled={busy}
        value={id}
        onChange={(e) => {
          if (discard()) {
            setId(e.target.value);
            setDraft(null);
          }
        }}
        className="w-full rounded-lg border p-2"
      >
        <option value="">Doctor বেছে নিন</option>
        {data.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {doctor && (
        <>
          <div className="flex gap-2">
            {(["profile_reviews", "profile_clips"] as const).map((k) => (
              <button
                disabled={busy}
                key={k}
                onClick={() => {
                  if (discard()) {
                    setKind(k);
                    setDraft(null);
                  }
                }}
                className={`rounded-lg border p-2 ${kind === k ? "bg-primary text-primary-foreground" : ""}`}
              >
                {k === "profile_reviews" ? "রিভিউ" : "ক্লিপস"}
              </button>
            ))}
          </div>
          {rows.map((x, i) => (
            <div key={x.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex justify-between gap-2">
                <select
                  disabled={busy}
                  value={x.kind}
                  onChange={(e) => edit(i, { kind: e.target.value as DoctorMedia["kind"] })}
                  className="rounded-lg border p-2"
                >
                  {(kind === "profile_clips" ? ["video"] : ["text", "image", "video"]).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <button
                  disabled={busy}
                  onClick={() => setDraft(rows.filter((_, j) => j !== i))}
                  className="admin-delete-button"
                >
                  সরান
                </button>
              </div>
              {x.kind !== "text" && (
                <input
                  disabled={busy}
                  value={x.url}
                  onChange={(e) => edit(i, { url: e.target.value })}
                  placeholder="https://... JPG/PNG অথবা MP4/YouTube Link"
                  className="w-full rounded-lg border p-2"
                />
              )}
              {x.kind === "image" && (
                <label className="block text-xs">
                  Review ছবি — পরিষ্কার JPG/PNG, মূল Ratio রাখুন
                  <input
                    disabled={busy}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(i, f);
                    }}
                  />
                </label>
              )}
              <textarea
                data-admin-translation-field={"bn"}
                disabled={busy}
                value={x.bn}
                onChange={(e) => edit(i, { bn: e.target.value })}
                placeholder="Review / Caption (বাংলা)"
                className="w-full rounded-lg border p-2"
              />
              <textarea
                data-admin-translation-field={"en"}
                disabled={busy}
                value={x.en}
                onChange={(e) => edit(i, { en: e.target.value })}
                placeholder="Review / Caption (English)"
                className="w-full rounded-lg border p-2"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() =>
                setDraft([
                  ...rows,
                  {
                    id: crypto.randomUUID(),
                    kind: kind === "profile_clips" ? "video" : "text",
                    url: "",
                    bn: "",
                    en: "",
                  },
                ])
              }
              className="rounded-lg border px-3 py-2"
            >
              যোগ করুন
            </button>
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground"
            >
              সেভ করুন
            </button>
          </div>
          <p className="text-xs">
            শুধু অনুমতি পাওয়া প্রকৃত Review/Video দিন। Video-এর জন্য Hosted MP4 বা YouTube Link
            ব্যবহার করুন।
          </p>
        </>
      )}
    </section>
  );
}
