import { useEffect, useState } from "react";
import { uiClient } from "@/lib/presentation";
import { EMPTY_SPIN, eightSlots, spinTarget, type SpinConfig, type SpinPrize } from "@/lib/spin";
import { uploadMedia } from "@/lib/admin-upload";
import { toast } from "sonner";
export function AdminEntryOffer() {
  const [c, setC] = useState<SpinConfig>({ ...EMPTY_SPIN, prizes: [] }),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void uiClient
      .from("spin_campaigns")
      .select("config")
      .eq("id", 1)
      .single()
      .then((r) => {
        if (r.error) {
          toast.error("Spin SQL আগে Run করুন: " + r.error.message);
          return;
        }
        setC({ ...EMPTY_SPIN, ...r.data.config, prizes: eightSlots(r.data.config.prizes || []) });
        setLoaded(true);
      });
  }, []);
  const edit = (i: number, p: Partial<SpinPrize>) =>
    setC((v) => ({ ...v, prizes: v.prizes.map((x, j) => (i === j ? { ...x, ...p } : x)) }));
  const count = c.prizes.filter((p) => p.eligible).length;
  async function upload(f: File, index?: number) {
    setBusy(true);
    try {
      const { url } = await uploadMedia(f, "spin");
      if (index == null) setC((v) => ({ ...v, logo: url }));
      else edit(index, { image: url });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const prizes = c.prizes.map((p) => ({
      ...p,
      link: spinTarget(p.link) || "",
      coupon: p.coupon.trim().toUpperCase(),
    }));
    if (count !== 3) return void toast.error("ঠিক ৩টি জেতার পুরস্কারে টিক দিন");
    if (
      !c.campaign.trim() ||
      prizes.some(
        (p) =>
          !p.name_bn.trim() ||
          !p.link ||
          p.minimum < 0 ||
          p.value < 0 ||
          (p.kind === "percent" && p.value > 100) ||
          (p.eligible && !/^[A-Z0-9_-]{3,32}$/.test(p.coupon)),
      )
    )
      return void toast.error("নাম, App link, বৈধ পরিমাণ ও চালু পুরস্কারের কুপন দিন");
    setBusy(true);
    try {
      const r = await uiClient.rpc("save_spin_campaign", {
        _config: { ...c, version: "guest-v2", prizes },
      });
      if (r.error) throw r.error;
      setC({ ...c, version: "guest-v2", prizes });
      toast.success("Spin Portal সেভ হয়েছে");
    } catch (e) {
      const m = (e as Error).message;
      toast.error(
        m.includes("COUPON_ALREADY")
          ? "এই কোড সাধারণ Promo-তে আছে। Spin-এর জন্য আলাদা কোড দিন।"
          : m.includes("GIFT_OFFER") || m.includes("OFFER_NOT")
            ? "Gift/Offer-এর জন্য প্রকাশিত /offers?offer=ID link দিন।"
            : m,
      );
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-1 w-full rounded-lg border bg-white p-2 text-sm";
  return (
    <section className="mb-5 space-y-4 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Spin Portal — পুরস্কারের ঘর</h3>
        <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
          জেতার জন্য নির্বাচিত {count}/৩
        </span>
      </div>
      <fieldset disabled={busy || !loaded} className="space-y-4">
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={c.enabled}
            onChange={(e) => setC({ ...c, enabled: e.target.checked })}
          />
          নাম ও নম্বর দিয়ে Spin চালু
        </label>
        <label className="block text-sm">
          Campaign ID
          <input
            className={input}
            value={c.campaign}
            onChange={(e) => setC({ ...c, campaign: e.target.value })}
          />
        </label>
        <p className="text-xs">
          প্রতি নম্বরে একবার। নতুন Campaign ID দিলে নতুন সুযোগ। Spin করতে login/OTP লাগবে না;
          অর্ডারের সময় login লাগবে।
        </p>
        <label className="block text-sm">
          চাকায় মোট ঘর
          <select
            className={input}
            value={c.prizes.length}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n < c.prizes.length && c.prizes.slice(n).some((p) => p.eligible))
                return void toast.error("শেষের বাদ পড়া ঘর থেকে আগে জিতবে টিক সরান");
              setC({ ...c, prizes: eightSlots(c.prizes, n) });
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 3).map((n) => (
              <option key={n} value={n}>
                {n}টি ঘর
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["title_bn", "title_en", "subtitle_bn", "subtitle_en"] as const).map((k) => (
            <label className="block text-sm" key={k}>
              {
                {
                  title_bn: "শিরোনাম বাংলা",
                  title_en: "Title English",
                  subtitle_bn: "উপশিরোনাম বাংলা",
                  subtitle_en: "Subtitle English",
                }[k]
              }
              <input
                data-admin-translation-field={typeof k === "string" ? k : undefined}
                className={input}
                value={c[k] || ""}
                onChange={(e) => setC({ ...c, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label className="block text-sm">
          মাঝের Logo — PNG 512×512, 1:1
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
            }}
          />
        </label>
        {c.logo && <img src={c.logo} alt="Logo" className="h-12 w-12 object-contain" />}
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {c.prizes.map((p, i) => (
            <div
              key={p.id}
              className={`min-w-0 rounded-xl border p-3 ${p.eligible ? "border-primary bg-primary/5" : "bg-stone-50"}`}
            >
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={p.eligible}
                  onChange={(e) => {
                    if (e.target.checked && count >= 3)
                      return void toast.error("আগে একটি জিতবে টিক সরান; ঠিক ৩টি থাকবে");
                    edit(i, { eligible: e.target.checked });
                  }}
                />
                Slot {i + 1} · জিতবে
              </label>
              <details>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain"
                      />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white">
                        🎁
                      </span>
                    )}
                    <div className="min-w-0">
                      <strong className="block break-words text-sm">
                        {p.name_bn || "পুরস্কারের নাম দিন"}
                      </strong>
                      <span className="text-xs underline">তথ্য / ছবি সম্পাদনা</span>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 space-y-3">
                  {(
                    ["name_bn", "name_en", "details_bn", "details_en", "link", "coupon"] as const
                  ).map((k) => (
                    <label key={k} className="block text-xs">
                      {
                        {
                          name_bn: "নাম বাংলা",
                          name_en: "Name English",
                          details_bn: "বিস্তারিত / শর্ত বাংলা",
                          details_en: "Details / Terms English",
                          link: "অফার / Product App link",
                          coupon: "জেতার কুপন কোড",
                        }[k]
                      }
                      {k.startsWith("details") ? (
                        <textarea
                          data-admin-translation-field={typeof k === "string" ? k : undefined}
                          className={input}
                          rows={3}
                          value={p[k]}
                          onChange={(e) => edit(i, { [k]: e.target.value })}
                        />
                      ) : (
                        <input
                          data-admin-translation-field={typeof k === "string" ? k : undefined}
                          className={input}
                          value={p[k] || ""}
                          onChange={(e) =>
                            edit(i, {
                              [k]: k === "coupon" ? e.target.value.toUpperCase() : e.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                  <label className="block text-xs">
                    ছবি — PNG 800×800, 1:1
                    <input
                      className="mt-1 w-full text-xs"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) void upload(e.target.files[0], i);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => edit(i, { image: "" })}
                  >
                    ছবি সরান
                  </button>
                  <label className="block text-xs">
                    পুরস্কারের ধরন
                    <select
                      className={input}
                      value={p.kind}
                      onChange={(e) => edit(i, { kind: e.target.value as SpinPrize["kind"] })}
                    >
                      <option value="fixed">নির্দিষ্ট টাকা ছাড়</option>
                      <option value="percent">শতকরা ছাড়</option>
                      <option value="delivery">ডেলিভারি চার্জ ফ্রি</option>
                      <option value="offer">Offer Product</option>
                      <option value="gift">Gift / Combo</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    ছাড়ের টাকা / শতাংশ
                    <input
                      className={input}
                      type="number"
                      min="0"
                      max={p.kind === "percent" ? 100 : undefined}
                      disabled={p.kind === "delivery" || p.kind === "gift" || p.kind === "offer"}
                      value={p.value}
                      onChange={(e) =>
                        edit(i, { value: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    সর্বনিম্ন কত টাকার কেনাকাটা
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={p.minimum}
                      onChange={(e) =>
                        edit(i, { minimum: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                      }
                    />
                  </label>
                </div>
              </details>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed">
          চাকার ঘর ৩–১২টি রাখতে পারবেন। ঠিক ৩টি পুরস্কারে জিতবে টিক দিন; ফল ওই ৩টির যেকোনো একটিতে
          আসবে। Gift/Offer-এর link হবে আগে তৈরি করা উপহারসহ প্রকাশিত Combo/Offer: /offers?offer=ID।
          উপহারটি সেই প্যাকেজে অন্তর্ভুক্ত রাখুন। কুপন অন্য সাধারণ Promo-এর সঙ্গে একসঙ্গে চলবে না।
          কুপন ৭ দিন বৈধ।
        </p>
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-xl bg-primary px-5 py-3 text-white"
        >
          {busy ? "সেভ হচ্ছে…" : "Spin Portal সেভ করুন"}
        </button>
      </fieldset>
    </section>
  );
}
