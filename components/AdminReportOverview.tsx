import {
  ArrowUpRight,
  Clock3,
  PackageCheck,
  PackageX,
  ShoppingBag,
  ChartNoAxesCombined,
  Wallet,
  CircleCheck,
} from "lucide-react";
import { BDT } from "@/lib/store";
export type OverviewReport = {
  summary: {
    count: number;
    total: number;
    delivered_count: number;
    delivered_total: number;
    cancelled_count: number;
    cancelled_total: number;
    open_count: number;
    open_total: number;
    active_total: number;
  };
  daily: { day: string; count: number; total: number }[];
  statuses: { status: string; count: number; total: number }[];
};
const number = (n: number) => n.toLocaleString("bn-BD");
const names: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত",
  shipped: "কুরিয়ারে",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};
export function AdminReportOverview({
  report,
  onOrders,
}: {
  report: OverviewReport;
  onOrders?: (() => void) | undefined;
}) {
  const s = report.summary,
    rate = s.count ? Math.round((s.delivered_count / s.count) * 100) : 0,
    cancelRate = s.count ? Math.round((s.cancelled_count / s.count) * 100) : 0;
  const maximum = Math.max(...report.daily.map((d) => d.total), 1);
  const points = report.daily.map((d, i, a) => [
    24 + (i * 552) / Math.max(a.length - 1, 1),
    145 - (d.total / maximum) * 110,
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const statuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
    ...report.statuses.filter((x) => !names[x.status]).map((x) => x.status),
  ];
  return (
    <div className="admin-analytics">
      <div className="admin-kpi-row">
        {[
          {
            label: "মোট অর্ডার মূল্য",
            value: BDT(s.total),
            detail: number(s.count) + " টি অর্ডার",
            icon: ShoppingBag,
            tone: "teal",
          },
          {
            label: "ডেলিভারড অর্ডার মূল্য",
            value: BDT(s.delivered_total),
            detail: number(s.delivered_count) + " টি ডেলিভারি সম্পন্ন",
            icon: PackageCheck,
            tone: "green",
          },
          {
            label: "বাতিল অর্ডার মূল্য",
            value: BDT(s.cancelled_total),
            detail: number(s.cancelled_count) + " টি বাতিল",
            icon: PackageX,
            tone: "rose",
          },
        ].map((c) => (
          <article key={c.label} className={`admin-metric-card is-${c.tone}`}>
            <div className="admin-metric-copy">
              <span>{c.label}</span>
              <strong>{c.value}</strong>
              <small>{c.detail}</small>
            </div>
            <span className="admin-kpi-icon">
              <c.icon size={23} />
            </span>
          </article>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-gauge-card">
          <div className="admin-card-heading">
            <h3>ডেলিভারি পারফরম্যান্স</h3>
            <CircleCheck size={18} />
          </div>
          <p>নির্বাচিত সময়ে মোট অর্ডারের অনুপাতে</p>
          <svg
            viewBox="0 0 250 150"
            className="admin-gauge"
            role="img"
            aria-label={`ডেলিভারির হার ${number(rate)} শতাংশ`}
          >
            <path
              d="M30 125 A95 95 0 0 1 220 125"
              pathLength="100"
              fill="none"
              stroke="#e7efec"
              strokeWidth="22"
            />
            <path
              d="M30 125 A95 95 0 0 1 220 125"
              pathLength="100"
              fill="none"
              stroke="#40b981"
              strokeWidth="22"
              strokeDasharray={`${Math.min(rate, 100)} 100`}
            />
            <text x="125" y="112" textAnchor="middle" fill="#123b35" fontSize="38" fontWeight="650">
              {number(rate)}%
            </text>
            <text x="125" y="140" textAnchor="middle" fill="#5b7069" fontSize="11">
              ডেলিভারির হার
            </text>
          </svg>
          <div className="admin-gauge-foot">
            <span>{number(s.delivered_count)} টি সম্পন্ন</span>
            <span>বাতিল {number(cancelRate)}%</span>
          </div>
        </section>
        <section className="admin-status-card">
          <div className="admin-card-heading">
            <h3>অর্ডারের অবস্থা</h3>
            <ShoppingBag size={18} />
          </div>
          <p>বর্তমান status অনুযায়ী বণ্টন</p>
          <div className="admin-status-list">
            {statuses.map((status) => {
              const row = report.statuses.find((x) => x.status === status);
              const count = row?.count || 0;
              return (
                <div key={status} className={`admin-status-row is-${status}`}>
                  <div>
                    <span>
                      <i />
                      {names[status] || status}
                    </span>
                    <strong>{number(count)}</strong>
                  </div>
                  <div className="admin-progress">
                    <i style={{ width: (s.count ? (count / s.count) * 100 : 0) + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="admin-trend-card">
          <div className="admin-card-heading">
            <h3>অর্ডার মূল্যের প্রবণতা</h3>
            <ChartNoAxesCombined size={18} />
          </div>
          <p>দৈনিক অর্ডার মূল্য · টাকা</p>
          {points.length ? (
            <svg
              viewBox="0 0 600 185"
              className="admin-overview-chart"
              role="img"
              aria-label="প্রতিদিনের অর্ডার মূল্যের চার্ট"
            >
              <defs>
                <linearGradient id="admin-teal-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38af83" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#38af83" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[40, 95, 150].map((y) => (
                <line
                  key={y}
                  x1="24"
                  x2="576"
                  y1={y}
                  y2={y}
                  stroke="#e6eeea"
                  strokeDasharray="4 5"
                />
              ))}
              {points.length > 1 && (
                <path d={`${line} L576,160 L24,160 Z`} fill="url(#admin-teal-area)" />
              )}
              <path d={line} stroke="#20876b" fill="none" strokeWidth="3" strokeLinejoin="round" />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#20876b">
                  <title>
                    {report.daily[i]!.day}: {BDT(report.daily[i]!.total)}
                  </title>
                </circle>
              ))}
              {[0, Math.floor((points.length - 1) / 2), points.length - 1]
                .filter((n, i, a) => a.indexOf(n) === i)
                .map((i) => (
                  <text
                    key={i}
                    x={points[i]?.[0]}
                    y="180"
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64776f"
                  >
                    {report.daily[i]?.day.slice(5)}
                  </text>
                ))}
            </svg>
          ) : (
            <div className="admin-chart-empty">এই সময়ে কোনো অর্ডার নেই</div>
          )}
          <div className="admin-trend-caption">
            <span>{number(report.daily.length)} দিনের রিপোর্ট</span>
            <strong>{BDT(s.total)}</strong>
          </div>
        </section>
      </div>
      <div className="admin-bottom-insights">
        <div className="admin-summary-pills">
          <div className="admin-summary-pill is-dark">
            <span className="admin-pill-icon">
              <Clock3 size={22} />
            </span>
            <div>
              <span>চলমান অর্ডার</span>
              <strong>{number(s.open_count)} টি</strong>
            </div>
            <b>{BDT(s.open_total)}</b>
          </div>
          <div className="admin-summary-pill is-light">
            <span className="admin-pill-icon">
              <Wallet size={22} />
            </span>
            <div>
              <span>বাতিল বাদে অর্ডার মূল্য</span>
              <strong>{BDT(s.active_total)}</strong>
            </div>
          </div>
        </div>
        <section className="admin-operations-card">
          <div>
            <span className="admin-operations-brand">ECORY · OPERATIONS</span>
            <h3>
              প্রতিটি অর্ডার,
              <br />
              এক জায়গায় পরিচালনা
            </h3>
            <p>অর্ডার, ডেলিভারি ও গ্রাহকের তথ্য</p>
            {onOrders && (
              <button type="button" onClick={onOrders}>
                অর্ডার পরিচালনা
                <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          <span className="admin-operations-mark" aria-hidden="true">
            <PackageCheck size={74} strokeWidth={1} />
          </span>
        </section>
      </div>
    </div>
  );
}
