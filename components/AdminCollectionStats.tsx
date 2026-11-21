import { Archive, CheckCircle2, Layers3, EyeOff } from "lucide-react";
export function AdminCollectionStats({
  items,
  kind,
}: {
  items: Record<string, unknown>[];
  kind: string;
}) {
  const hidden = items.filter(
    (x) =>
      x["hidden"] === true ||
      x["visible"] === false ||
      x["active"] === false ||
      x["status"] === "hidden" ||
      x["status"] === "archived",
  ).length;
  const drafts = items.filter((x) => x["status"] === "draft").length;
  const cards = [
    { label: "তালিকায় মোট", value: items.length, icon: Layers3 },
    {
      label: "দৃশ্যমান / সক্রিয়",
      value:
        items.length -
        hidden -
        items.filter(
          (x) =>
            x["status"] === "draft" &&
            x["hidden"] !== true &&
            x["active"] !== false &&
            x["visible"] !== false,
        ).length,
      icon: CheckCircle2,
    },
    { label: "লুকানো / আর্কাইভ", value: hidden, icon: EyeOff },
    {
      label: kind === "products" ? "স্টক নেই" : "ড্রাফট",
      value: kind === "products" ? items.filter((x) => x["in_stock"] === false).length : drafts,
      icon: Archive,
    },
  ];
  return (
    <div className="admin-mini-stats" aria-label="তালিকার সারাংশ">
      {cards.map((c) => (
        <div key={c.label}>
          <span className="admin-stat-icon">
            <c.icon size={18} />
          </span>
          <div>
            <span>{c.label}</span>
            <strong>{Math.max(0, c.value).toLocaleString("bn-BD")}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
