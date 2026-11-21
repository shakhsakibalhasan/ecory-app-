import { Users, Gift, TicketCheck, Clock3, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@/lib/query";
import { uiClient } from "@/lib/presentation";
type Row = {
  id: string;
  campaign: string;
  name: string;
  phone: string;
  prize: string;
  coupon: string;
  state: string;
  created_at: string;
  expires_at: string;
  order_code: string | null;
  linked: boolean;
  prize_details?: {
    name_bn?: string;
    details_bn?: string;
    image?: string;
    kind?: string;
    value?: number;
    minimum?: number;
    link?: string;
  };
};
const states: Record<string, string> = {
  all: "সব",
  available: "অব্যবহৃত",
  used: "ব্যবহৃত",
  expired: "মেয়াদ শেষ",
};
export function AdminSpinParticipants() {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(""),
    [state, setState] = useState("all");
  const q = useQuery({
    queryKey: ["admin-spin-participants", page, search, state],
    refetchInterval: 60000,
    queryFn: async () => {
      const r = await uiClient.rpc("admin_spin_participants", {
        _page: page,
        _search: search,
        _state: state,
      });
      if (r.error) throw r.error;
      return r.data as { total: number; rows: Row[] };
    },
  });
  const overview = useQuery({
    queryKey: ["admin-spin-dashboard"],
    refetchInterval: 60000,
    queryFn: async () => {
      const r = await uiClient.rpc("admin_spin_dashboard");
      if (r.error) throw r.error;
      return r.data as {
        summary: {
          total: number;
          people: number;
          used: number;
          available: number;
          expired: number;
          linked: number;
          campaigns: number;
          today: number;
        };
        prizes: {
          campaign: string;
          prize_id: string;
          name: string;
          coupon: string;
          won: number;
          used: number;
          available: number;
          expired: number;
        }[];
      };
    },
  });
  const summary = overview.data?.summary;
  const count = (n: number) => n.toLocaleString("bn-BD");
  const refresh = () => {
    void q.refetch();
    void overview.refetch();
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">স্পিন অংশগ্রহণকারী</h2>
          <p className="mt-1 text-sm">নাম, মোবাইল নম্বর, জেতা পুরস্কার ও কুপনের ব্যবহার</p>
        </div>
        <button
          onClick={refresh}
          disabled={q.isFetching || overview.isFetching}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          <RefreshCw size={14} /> রিফ্রেশ
        </button>
      </div>
      <div className="admin-spin-overview">
        <div className="admin-spin-section-title">
          <h3>স্পিন ও পুরস্কারের হিসাব</h3>
          <span>সব ক্যাম্পেইন · পুরো সময়ের তথ্য</span>
        </div>
        {overview.isPending ? (
          <p role="status">হিসাব লোড হচ্ছে…</p>
        ) : overview.isError ? (
          <p role="alert" className="admin-report-error">
            স্পিনের মোট হিসাব পাওয়া যায়নি। ADMIN-SPIN-DASHBOARD.sql চালিয়ে রিফ্রেশ করুন।
          </p>
        ) : (
          summary && (
            <>
              <div className="admin-spin-kpis">
                {[
                  {
                    label: "মোট স্পিন / পুরস্কার",
                    value: summary.total,
                    sub: `${count(summary.people)} জন স্বতন্ত্র অংশগ্রহণকারী`,
                    Icon: Users,
                  },
                  {
                    label: "অব্যবহৃত কুপন",
                    value: summary.available,
                    sub: "মেয়াদ আছে · ব্যবহার করা হয়নি",
                    Icon: Gift,
                  },
                  {
                    label: "ব্যবহৃত কুপন",
                    value: summary.used,
                    sub: summary.total
                      ? `${count(Math.round((summary.used / summary.total) * 100))}% কুপন ব্যবহৃত`
                      : "এখনও ব্যবহার হয়নি",
                    Icon: TicketCheck,
                  },
                  {
                    label: "মেয়াদ শেষ",
                    value: summary.expired,
                    sub: "ব্যবহার ছাড়াই মেয়াদ শেষ",
                    Icon: Clock3,
                  },
                ].map(({ label, value, sub, Icon }) => (
                  <article className="admin-metric-card" key={label}>
                    <div>
                      <p>{label}</p>
                      <strong>{count(value)}</strong>
                      <small>{sub}</small>
                    </div>
                    <span className="admin-kpi-icon">
                      <Icon size={20} />
                    </span>
                  </article>
                ))}
              </div>
              <div className="admin-spin-summary-strip">
                <span>
                  আজকের স্পিন <b>{count(summary.today)}</b>
                </span>
                <span>
                  ক্যাম্পেইন <b>{count(summary.campaigns)}</b>
                </span>
                <span>
                  অ্যাকাউন্টে সংরক্ষিত <b>{count(summary.linked)}</b>
                </span>
              </div>
              <div className="admin-spin-prize-report">
                <h3>কোন পুরস্কার কতবার জিতেছেন</h3>
                {!overview.data?.prizes.length ? (
                  <p>এখনও কোনো পুরস্কারের তথ্য নেই।</p>
                ) : (
                  <div className="admin-spin-prize-grid">
                    {overview.data.prizes.map((p, i) => (
                      <article key={`${p.campaign}-${p.prize_id}-${i}`}>
                        <div className="admin-spin-prize-title">
                          <Gift size={18} />
                          <div>
                            <h4>{p.name}</h4>
                            <small>
                              {p.campaign} · {p.coupon || "কুপন নেই"}
                            </small>
                          </div>
                        </div>
                        <div className="admin-spin-prize-numbers">
                          <span>
                            জিতেছেন<b>{count(p.won)}</b>
                          </span>
                          <span>
                            ব্যবহৃত<b>{count(p.used)}</b>
                          </span>
                          <span>
                            অব্যবহৃত<b>{count(p.available)}</b>
                          </span>
                          <span>
                            মেয়াদ শেষ<b>{count(p.expired)}</b>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
      <div className="admin-spin-section-title">
        <h3>অংশগ্রহণকারী ও বিজয়ী</h3>
        <span>নিচের Search ও Filter শুধু তালিকায় প্রযোজ্য</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setSearch(draft.trim());
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          aria-label="নাম / নম্বর / ক্যাম্পেইন খুঁজুন"
          value={draft}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="নাম / নম্বর / ক্যাম্পেইন খুঁজুন"
          className="min-w-0 flex-1 rounded-xl border p-3 text-sm"
        />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm text-white">খুঁজুন</button>
        <select
          aria-label="কুপনের অবস্থা"
          value={state}
          onChange={(e) => {
            setPage(0);
            setState(e.target.value);
          }}
          className="rounded-xl border p-3 text-sm"
        >
          {Object.entries(states).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </form>
      {q.isPending ? (
        <p role="status">অংশগ্রহণকারীর তালিকা লোড হচ্ছে…</p>
      ) : q.isError ? (
        <p role="alert">তালিকা লোড হয়নি। ADMIN-SPIN-DASHBOARD.sql চালিয়ে আবার চেষ্টা করুন।</p>
      ) : (
        <>
          <p className="text-sm">মোট {q.data?.total.toLocaleString("bn-BD")} জন</p>
          <div className="admin-spin-participants-grid">
            {q.data?.rows.map((r) => (
              <article key={r.id} className="admin-spin-person-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{r.name}</strong>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${r.state === "available" ? "bg-primary text-white" : "bg-stone-100 text-black"}`}
                  >
                    {states[r.state]}
                  </span>
                </div>
                <div className="admin-spin-person-info">
                  <a href={"tel:" + r.phone} className="font-semibold">
                    {r.phone}
                  </a>
                  <span>
                    {r.prize} · <strong>{r.coupon}</strong>
                  </span>
                  <span>ক্যাম্পেইন: {r.campaign}</span>
                  <span>{r.linked ? "অ্যাকাউন্টে সংরক্ষিত" : "Guest Spin"}</span>
                  <span>
                    স্পিন:{" "}
                    {new Date(r.created_at).toLocaleString("bn-BD", {
                      timeZone: "Asia/Dhaka",
                      hour12: true,
                    })}
                  </span>
                  <span>
                    মেয়াদ:{" "}
                    {new Date(r.expires_at).toLocaleDateString("bn-BD", {
                      timeZone: "Asia/Dhaka",
                      hour12: true,
                    })}
                  </span>
                  {r.order_code && <span>অর্ডার: {r.order_code}</span>}
                </div>
                <details className="admin-spin-person-details">
                  <summary>
                    পুরস্কারের বিস্তারিত <ChevronDown size={14} />
                  </summary>
                  <div>
                    {r.prize_details?.image && (
                      <img
                        src={r.prize_details.image}
                        alt={r.prize}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <h4>{r.prize}</h4>
                    <p>{r.prize_details?.details_bn || "আলাদা বিবরণ দেওয়া নেই।"}</p>
                    <dl>
                      <dt>কুপন কোড</dt>
                      <dd>{r.coupon || "—"}</dd>
                      <dt>পুরস্কারের ধরন</dt>
                      <dd>
                        {{
                          fixed: "টাকা ছাড়",
                          percent: "শতাংশ ছাড়",
                          delivery: "ডেলিভারি ছাড়",
                          offer: "অফার",
                          gift: "উপহার",
                        }[r.prize_details?.kind || ""] || "—"}
                      </dd>
                      {r.prize_details?.kind === "fixed" && (
                        <>
                          <dt>ছাড়</dt>
                          <dd>৳ {count(r.prize_details.value || 0)}</dd>
                        </>
                      )}
                      {r.prize_details?.kind === "percent" && (
                        <>
                          <dt>ছাড়</dt>
                          <dd>{count(r.prize_details.value || 0)}%</dd>
                        </>
                      )}
                      <dt>সর্বনিম্ন কেনাকাটা</dt>
                      <dd>{r.prize_details ? `৳ ${count(r.prize_details.minimum || 0)}` : "—"}</dd>
                      <dt>অর্ডার</dt>
                      <dd>{r.order_code || "এখনও ব্যবহার করেননি"}</dd>
                    </dl>
                  </div>
                </details>
              </article>
            ))}
          </div>
          {!q.data?.rows.length && <p>কোনো অংশগ্রহণকারী পাওয়া যায়নি।</p>}
          <div className="flex items-center justify-between gap-3">
            <button
              disabled={page === 0 || q.isFetching}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
            >
              আগের পৃষ্ঠা
            </button>
            <span className="text-sm">পৃষ্ঠা {(page + 1).toLocaleString("bn-BD")}</span>
            <button
              disabled={q.isFetching || (page + 1) * 25 >= (q.data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
            >
              পরের পৃষ্ঠা
            </button>
          </div>
        </>
      )}
    </section>
  );
}
