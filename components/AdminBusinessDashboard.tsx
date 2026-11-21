import { AdminReportOverview } from "./AdminReportOverview";
import { useState } from "react";
import { useQuery } from "@/lib/query";
import { uiClient } from "@/lib/presentation";
import { BDT } from "@/lib/store";
import {
  BarChart3,
  Download,
  RefreshCw,
  ShoppingBag,
  PackageCheck,
  PackageX,
  Clock3,
  Wallet,
} from "lucide-react";
type Summary = {
  count: number;
  total: number;
  delivered_count: number;
  delivered_total: number;
  cancelled_count: number;
  cancelled_total: number;
  open_count: number;
  open_total: number;
  active_total: number;
  paid_marked_total: number;
  paid_marked_count: number;
};
type Daily = {
  day: string;
  count: number;
  total: number;
  delivered_count: number;
  delivered_total: number;
  cancelled_count: number;
};
type Report = {
  summary: Summary;
  statuses: { status: string; count: number; total: number }[];
  daily: Daily[];
  generated_at: string;
};
const label: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত",
  shipped: "কুরিয়ারে",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};
const num = (n: number) => n.toLocaleString("bn-BD");
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const shift = (date: string, days: number) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function AdminBusinessDashboard({
  overview = false,
  onOrders,
}: {
  overview?: boolean;
  onOrders?: (() => void) | undefined;
}) {
  const [period, setPeriod] = useState("month"),
    [from, setFrom] = useState(() => today().slice(0, 8) + "01"),
    [to, setTo] = useState(today);
  const invalid = !!from && !!to && from > to;
  const q = useQuery({
    queryKey: ["admin-business-report", from, to],
    enabled: !invalid,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const r = await uiClient.rpc("admin_business_report", {
        _from: from || null,
        _to: to || null,
      });
      if (r.error) throw r.error;
      return r.data as Report;
    },
  });
  const r = q.data,
    s = r?.summary;
  function preset(value: string) {
    setPeriod(value);
    const d = today();
    setTo(value === "all" ? "" : d);
    setFrom(
      value === "today"
        ? d
        : value === "week"
          ? shift(d, -6)
          : value === "month"
            ? d.slice(0, 8) + "01"
            : "",
    );
  }
  function download() {
    if (!r) return;
    const rows: (string | number)[][] = [
      ["Ecory Business Report"],
      ["অর্ডার তৈরি হওয়ার তারিখ", from || "শুরু থেকে", to || "আজ পর্যন্ত"],
      ["সূচক", "অর্ডার সংখ্যা", "অর্ডার মূল্য (BDT)"],
      ["মোট", r.summary.count, r.summary.total],
      ["ডেলিভারড", r.summary.delivered_count, r.summary.delivered_total],
      ["বাতিল", r.summary.cancelled_count, r.summary.cancelled_total],
      ["চলমান", r.summary.open_count, r.summary.open_total],
      ["বাতিল বাদে মূল্য", "", r.summary.active_total],
      ["পেইড হিসেবে চিহ্নিত", r.summary.paid_marked_count, r.summary.paid_marked_total],
      [],
      ["তারিখ", "মোট অর্ডার", "মোট মূল্য", "ডেলিভারড সংখ্যা", "ডেলিভারড মূল্য", "বাতিল সংখ্যা"],
      ...r.daily.map((d) => [
        d.day,
        d.count,
        d.total,
        d.delivered_count,
        d.delivered_total,
        d.cancelled_count,
      ]),
      [],
      ["এটি অর্ডারভিত্তিক রিপোর্ট; লাভ, ব্যাংক সেটেলমেন্ট বা প্রকৃত নগদ আদায়ের হিসাব নয়।"],
    ];
    const escape = (v: string | number) => '"' + String(v).replaceAll('"', '""') + '"';
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `Ecory-Business-${from || "all"}-${to || today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const cards = s
    ? [
        {
          label: "মোট অর্ডার",
          n: num(s.count) + " টি",
          detail: BDT(s.total) + " মোট অর্ডার মূল্য",
          icon: ShoppingBag,
        },
        {
          label: "ডেলিভারড",
          n: num(s.delivered_count) + " টি",
          detail: BDT(s.delivered_total) + " ডেলিভারড অর্ডার মূল্য",
          icon: PackageCheck,
        },
        {
          label: "বাতিল অর্ডার",
          n: num(s.cancelled_count) + " টি",
          detail: BDT(s.cancelled_total) + " বাতিল অর্ডার মূল্য",
          icon: PackageX,
        },
        {
          label: "চলমান অর্ডার",
          n: num(s.open_count) + " টি",
          detail: BDT(s.open_total) + " অপেক্ষমাণ / নিশ্চিত / কুরিয়ারে",
          icon: Clock3,
        },
        {
          label: "বাতিল বাদে অর্ডার মূল্য",
          n: BDT(s.active_total),
          detail: "Delivered ও অন্যান্য অবাতিল অর্ডার মিলিয়ে",
          icon: Wallet,
        },
        {
          label: "ডেলিভারির হার",
          n:
            (s.count ? (s.delivered_count / s.count) * 100 : 0).toLocaleString("bn-BD", {
              maximumFractionDigits: 1,
            }) + "%",
          detail: "নির্বাচিত সময়ের মোট অর্ডারের অনুপাতে",
          icon: BarChart3,
        },
      ]
    : [];
  if (overview)
    return (
      <section className="admin-dashboard-overview">
        <div className="admin-overview-toolbar">
          <div>
            <h3>স্টোর পারফরম্যান্স</h3>
            <p>অর্ডার তৈরি হওয়ার তারিখ · বাংলাদেশ সময়</p>
          </div>
          <select
            aria-label="হিসাবের সময়সীমা"
            value={period}
            onChange={(e) => preset(e.target.value)}
          >
            <option value="today">আজ</option>
            <option value="week">গত ৭ দিন</option>
            <option value="month">এই মাস</option>
            <option value="all">সব সময়</option>
          </select>
        </div>
        {q.isPending ? (
          <div className="admin-loading" role="status">
            ব্যবসার হিসাব লোড হচ্ছে…
          </div>
        ) : q.isError ? (
          <div className="admin-report-error" role="alert">
            হিসাব পাওয়া যায়নি। <button onClick={() => void q.refetch()}>আবার চেষ্টা করুন</button>
          </div>
        ) : (
          r && <AdminReportOverview report={r} onOrders={onOrders} />
        )}
        <p className="admin-report-note">
          এটি অর্ডারের হিসাব; লাভ বা ব্যাংকে জমা হওয়া টাকার হিসাব নয়।
        </p>
      </section>
    );
  return (
    <section className="mb-6 space-y-5 rounded-3xl border border-primary/15 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            <h2 className="text-xl font-semibold">অর্ডার সামারি</h2>
          </div>
          <p className="mt-1 text-sm text-black">অর্ডারের বর্তমান অবস্থা ও টাকার রিপোর্ট</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void q.refetch()}
            disabled={q.isFetching || invalid}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
          >
            <RefreshCw size={16} className={q.isFetching ? "animate-spin" : ""} />
            রিফ্রেশ
          </button>
          <button
            onClick={download}
            disabled={!r || q.isFetching || invalid || q.isError}
            className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            <Download size={16} />
            CSV
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["today", "আজ"],
          ["week", "গত ৭ দিন"],
          ["month", "এই মাস"],
          ["all", "সব সময়"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => preset(v!)}
            className={`rounded-full border px-4 py-2 text-sm ${period === v ? "border-primary bg-primary text-white" : "bg-white text-black"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          শুরুর তারিখ
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPeriod("custom");
              setFrom(e.target.value);
            }}
            className="mt-1 block w-full rounded-xl border p-2.5"
          />
        </label>
        <label className="text-sm">
          শেষ তারিখ
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPeriod("custom");
              setTo(e.target.value);
            }}
            className="mt-1 block w-full rounded-xl border p-2.5"
          />
        </label>
      </div>
      <p className="text-xs">
        বাংলাদেশ সময় অনুযায়ী অর্ডার তৈরি হওয়ার তারিখ ধরে রিপোর্ট; শেষ তারিখের পুরো দিন অন্তর্ভুক্ত।
      </p>
      {invalid ? (
        <p role="alert">শেষ তারিখ শুরুর তারিখের আগে হতে পারবে না।</p>
      ) : q.isPending ? (
        <p role="status">হিসাব লোড হচ্ছে…</p>
      ) : q.isError ? (
        <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm">
          হিসাব লোড হয়নি। নতুন Dashboard SQL Run হয়েছে কি না দেখে রিফ্রেশ করুন। পুরোনো/শূন্য হিসাবকে
          ফল হিসেবে দেখানো হচ্ছে না।
        </div>
      ) : s && r ? (
        <>
          <AdminReportOverview report={r} onOrders={onOrders} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="min-w-0 rounded-2xl border border-black/5 bg-stone-50/60 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.label}</span>
                  <c.icon size={20} className="shrink-0 text-primary" />
                </div>
                <strong className="mt-3 block break-words text-2xl font-semibold">{c.n}</strong>
                <p className="mt-2 text-xs leading-relaxed text-black">{c.detail}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="p-3 text-left font-semibold">স্ট্যাটাস অনুযায়ী হিসাব</caption>
              <thead className="bg-stone-50">
                <tr>
                  <th className="p-3">অবস্থা</th>
                  <th className="p-3">অর্ডার</th>
                  <th className="p-3 text-right">মূল্য</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "pending",
                  "confirmed",
                  "shipped",
                  "delivered",
                  "cancelled",
                  ...r.statuses.filter((x) => !label[x.status]).map((x) => x.status),
                ].map((status) => {
                  const row = r.statuses.find((x) => x.status === status);
                  return (
                    <tr key={status} className="border-t">
                      <td className="p-3">{label[status] || status}</td>
                      <td className="p-3">{num(row?.count || 0)}</td>
                      <td className="p-3 text-right">{BDT(row?.total || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <details className="rounded-2xl border p-4">
            <summary className="cursor-pointer font-semibold">
              তারিখ অনুযায়ী বিস্তারিত ({num(r.daily.length)} দিন)
            </summary>
            <div className="mt-3 max-h-96 overflow-auto">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    {[
                      "অর্ডারের তারিখ",
                      "অর্ডার",
                      "মোট মূল্য",
                      "ডেলিভারড",
                      "ডেলিভারড মূল্য",
                      "বাতিল",
                    ].map((x) => (
                      <th key={x} className="p-2">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.daily.map((d) => (
                    <tr key={d.day} className="border-t">
                      <td className="p-2">
                        {new Date(d.day + "T12:00:00Z").toLocaleDateString("bn-BD", {
                          timeZone: "Asia/Dhaka",
                        })}
                      </td>
                      <td className="p-2">{num(d.count)}</td>
                      <td className="p-2">{BDT(d.total)}</td>
                      <td className="p-2">{num(d.delivered_count)}</td>
                      <td className="p-2">{BDT(d.delivered_total)}</td>
                      <td className="p-2">{num(d.cancelled_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!r.daily.length && <p className="p-3 text-sm">এই সময়ে অর্ডার নেই।</p>}
            </div>
          </details>
          <p className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed">
            ডেলিভারড মূল্য লাভ বা নগদ আদায়ের নিশ্চয়তা নয়। পণ্যের খরচ, কুরিয়ারের খরচ, রিফান্ড ও
            অন্যান্য ব্যয় এতে বাদ দেওয়া হয়নি। অর্ডারের চূড়ান্ত বিলের ছাড়সহ মোট ব্যবহার করা হয়েছে।
          </p>
          <p className="text-xs">
            সর্বশেষ হিসাব:{" "}
            {new Date(r.generated_at).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" })} · প্রতি
            মিনিটে রিফ্রেশ
          </p>
        </>
      ) : null}
    </section>
  );
}
